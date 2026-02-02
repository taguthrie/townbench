/**
 * Parse Maine Revenue Services MVR Statistical Summary PDF.
 * Uses pdf-parse to extract text, then Claude to extract structured town data.
 * Outputs scripts/data/me/mvr_towns.json
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";
import Anthropic from "@anthropic-ai/sdk";
import { PDFParse } from "pdf-parse";
import { logStep, logDone } from "../lib/utils";

// Load env vars
import "../lib/db"; // side effect: loads .env.local

const DATA_DIR = resolve(__dirname, "../data/me");
const PDF_PATH = resolve(DATA_DIR, "mvr_statistical_summary.pdf");
const OUTPUT_PATH = resolve(DATA_DIR, "mvr_towns.json");

// Maine Revenue Services publishes the MVR Statistical Summary annually
const MVR_URL = "https://www.maine.gov/revenue/sites/maine.gov.revenue/files/inline-files/MVR_Statistical_Summary.pdf";

async function downloadPdf() {
  if (existsSync(PDF_PATH)) {
    console.log("  PDF already downloaded, skipping fetch");
    return;
  }

  console.log(`  Downloading MVR PDF from: ${MVR_URL}`);
  const response = await fetch(MVR_URL);

  if (!response.ok) {
    console.warn(`  [WARN] Download returned ${response.status}.`);
    console.warn("  The URL may have changed. Check https://www.maine.gov/revenue for the current link.");
    console.warn(`  Download manually and save to: ${PDF_PATH}`);
    throw new Error(`Failed to download PDF: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(PDF_PATH, buffer);
  console.log(`  Saved PDF (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
}

async function extractWithClaude(text: string): Promise<MvrTown[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Missing ANTHROPIC_API_KEY in environment");
  }

  const client = new Anthropic({ apiKey });

  // The PDF can be large, so we may need to process in chunks
  // Send the full text and ask Claude to extract structured data
  console.log(`  Sending ${text.length} chars to Claude for extraction...`);

  const response = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8192,
    system: `You are a data extraction assistant. Extract municipal data from the Maine Revenue Services MVR Statistical Summary. Return ONLY a JSON array with no other text.`,
    messages: [
      {
        role: "user",
        content: `Extract all Maine municipalities from this document. For each town, extract:
- name: town/city name (string)
- county: county name (string)
- population: population count (number)
- total_valuation: total municipal valuation in dollars (number)
- tax_rate: full value tax rate per $1,000 (number)

Return ONLY a valid JSON array of objects with these fields. If a value is missing, use 0 for numbers and "" for strings.

Document text:
${text.slice(0, 100000)}`, // Limit to 100k chars for API
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  // Extract JSON from response (may be wrapped in markdown code block)
  let jsonStr = content.text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  const towns: MvrTown[] = JSON.parse(jsonStr);
  return towns;
}

interface MvrTown {
  name: string;
  county: string;
  population: number;
  total_valuation: number;
  tax_rate: number;
}

async function main() {
  logStep("Parsing ME MVR Statistical Summary PDF");

  mkdirSync(DATA_DIR, { recursive: true });

  // Download PDF
  await downloadPdf();

  if (!existsSync(PDF_PATH)) {
    console.error(`PDF not found at: ${PDF_PATH}`);
    console.error("Download manually from Maine Revenue Services and save there.");
    process.exit(1);
  }

  // Extract text from PDF
  console.log("  Extracting text from PDF...");
  const pdfBuffer = readFileSync(PDF_PATH);
  const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
  const pdfData = await parser.getText();
  console.log(`  Extracted ${pdfData.text.length} characters`);

  // Use Claude to extract structured data
  const towns = await extractWithClaude(pdfData.text);
  console.log(`  Claude extracted ${towns.length} towns`);

  // Save to JSON
  writeFileSync(OUTPUT_PATH, JSON.stringify(towns, null, 2), "utf-8");
  logDone(`Saved ${towns.length} ME towns to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
