/**
 * Parse and import NH city budget PDFs using Claude.
 *
 * Cities like Dover, Concord, Manchester, Nashua don't submit data
 * through the NHPFC system, so we need to parse their budget PDFs directly.
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { resolve } from "path";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "../lib/db";
import { BUDGET_CATEGORIES, SUBCATEGORIES } from "../../lib/taxonomy";
import {
  batchInsert,
  registerDataSource,
  deleteBySourceId,
  logStep,
  logDone,
} from "../lib/utils";

const DATA_DIR = resolve(__dirname, "../data/nh/city-budgets");

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface ParsedBudgetItem {
  category: string;
  subcategory: string;
  line_item: string;
  amount: number;
}

const SYSTEM_PROMPT = `You are a municipal budget parsing assistant. You will receive raw text extracted from a city budget PDF document.

Your job is to extract every budget line item and classify it into the following taxonomy:

Categories: ${BUDGET_CATEGORIES.join(", ")}

Subcategories by category:
${Object.entries(SUBCATEGORIES)
  .map(([cat, subs]) => `${cat}: ${subs.join(", ")}`)
  .join("\n")}

For each line item found, return a JSON array of objects with:
- "category": one of the categories above
- "subcategory": one of the subcategories for that category
- "line_item": the specific line item name from the budget
- "amount": the dollar amount as a number (no commas, no dollar signs)

Important notes:
- Focus on APPROPRIATIONS / EXPENDITURES, not revenues
- If you see department totals AND line items, prefer the line items for detail
- If only totals are available (e.g., "Police Department Total: $5,000,000"), use those
- Combine school-related items under "Education" category
- If a line item doesn't clearly fit, use the closest match. Use "Transfers & Other" / "Other" as a last resort.
- For city budgets, you may see "Adopted" vs "Proposed" columns - use the ADOPTED amount

Return ONLY valid JSON — no markdown, no explanation. Just the array.`;

async function extractTextFromPdf(pdfPath: string): Promise<string> {
  const { PDFParse } = await import("pdf-parse");
  const buffer = readFileSync(pdfPath);
  const parser = new PDFParse({ data: new Uint8Array(buffer) });
  const result = await parser.getText();
  return result.text;
}

async function parseBudgetWithClaude(text: string, retries = 3): Promise<ParsedBudgetItem[]> {
  // Truncate to stay within token limits (rough estimate: 4 chars per token, 10k limit)
  const maxChars = 30000;
  const truncatedText = text.length > maxChars
    ? text.slice(0, maxChars) + "\n\n[TRUNCATED - document too long]"
    : text;

  console.log(`  Sending ${truncatedText.length} chars to Claude for parsing...`);

  let message;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      message = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 16384,
        messages: [
          {
            role: "user",
            content: `Parse the following city budget document text and extract all appropriation/expenditure line items:\n\n${truncatedText}`,
          },
        ],
        system: SYSTEM_PROMPT,
      });
      break;
    } catch (err: unknown) {
      const isRateLimit = err instanceof Error && err.message.includes("rate_limit");
      if (isRateLimit && attempt < retries) {
        console.log(`  Rate limited, waiting 60s before retry ${attempt + 1}/${retries}...`);
        await new Promise((r) => setTimeout(r, 60000));
      } else {
        throw err;
      }
    }
  }

  if (!message) {
    throw new Error("Failed to get response from Claude after retries");
  }

  const content = message.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  // Parse JSON response
  let items: ParsedBudgetItem[];
  try {
    items = JSON.parse(content.text);
  } catch (e) {
    // Try to extract JSON from response
    const match = content.text.match(/\[[\s\S]*\]/);
    if (match) {
      items = JSON.parse(match[0]);
    } else {
      console.error("  Failed to parse Claude response:", content.text.slice(0, 500));
      throw new Error("Could not parse JSON from Claude response");
    }
  }

  console.log(`  Extracted ${items.length} budget line items`);
  return items;
}

async function main() {
  logStep("Importing NH city budget PDFs");

  // Check for manifest
  const manifestPath = resolve(DATA_DIR, "manifest.json");
  if (!existsSync(manifestPath)) {
    console.error("No manifest.json found. Run fetch-city-budgets.ts first.");
    process.exit(1);
  }

  const manifest: { city: string; fiscalYear: number; file: string; success: boolean }[] =
    JSON.parse(readFileSync(manifestPath, "utf-8"));

  // Get town ID lookup for cities
  const { data: towns, error: townErr } = await supabase
    .from("towns")
    .select("id, name")
    .eq("state", "NH");

  if (townErr || !towns) {
    console.error("Failed to fetch NH towns:", townErr?.message);
    process.exit(1);
  }

  const townLookup = new Map<string, string>();
  for (const t of towns) {
    townLookup.set(t.name.toLowerCase(), t.id);
  }

  // Process each successfully downloaded PDF
  for (const entry of manifest.filter((e) => e.success)) {
    const pdfPath = resolve(DATA_DIR, entry.file);
    if (!existsSync(pdfPath)) {
      console.log(`Skipping ${entry.city} FY${entry.fiscalYear}: file not found`);
      continue;
    }

    logStep(`Processing ${entry.city} FY${entry.fiscalYear}`);

    const townId = townLookup.get(entry.city.toLowerCase());
    if (!townId) {
      console.error(`  Town "${entry.city}" not found in database`);
      continue;
    }

    // Register data source
    const sourceId = await registerDataSource({
      source_key: `${entry.city.toLowerCase()}_budget_fy${entry.fiscalYear}`,
      source_name: `${entry.city} FY${entry.fiscalYear} Adopted Budget`,
      source_url: `city_pdf:${entry.file}`,
      source_type: "pdf",
      state: "NH",
      fiscal_year: entry.fiscalYear,
    });

    // Delete existing budget rows for this source (idempotent re-run)
    await deleteBySourceId("budget_line_items", sourceId);

    // Extract text from PDF
    console.log(`  Extracting text from ${entry.file}...`);
    const text = await extractTextFromPdf(pdfPath);
    console.log(`  Extracted ${text.length} characters`);

    // Parse with Claude
    const items = await parseBudgetWithClaude(text);

    if (items.length === 0) {
      console.log("  No budget items extracted");
      continue;
    }

    // Build budget rows
    const budgetRows = items.map((item) => ({
      town_id: townId,
      fiscal_year: entry.fiscalYear,
      category: item.category,
      subcategory: item.subcategory,
      line_item: item.line_item,
      amount: item.amount,
      source_id: sourceId,
    }));

    // Insert
    console.log(`  Inserting ${budgetRows.length} budget line items...`);
    const inserted = await batchInsert("budget_line_items", budgetRows, 500);

    // Update source row count
    await supabase
      .from("data_sources")
      .update({ row_count: inserted })
      .eq("id", sourceId);

    logDone(`Imported ${inserted} budget line items for ${entry.city} FY${entry.fiscalYear}`);

    // Rate limit delay between cities
    console.log("  Waiting 65s before next city to avoid rate limits...");
    await new Promise((r) => setTimeout(r, 65000));
  }

  logDone("City budget import complete");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
