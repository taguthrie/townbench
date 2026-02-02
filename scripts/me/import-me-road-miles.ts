/**
 * Extract road miles per Maine town from MaineDOT county-level PDFs.
 * Downloads are 16 county PDFs with per-town road mileage breakdowns.
 * Uses pdf-parse + Claude to extract structured data, then updates towns table.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from "fs";
import { resolve } from "path";
import { PDFParse } from "pdf-parse";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "../lib/db";
import { normalizeTownName, logStep, logDone } from "../lib/utils";

// Load env vars
import "../lib/db";

const DATA_DIR = resolve(__dirname, "../data/me");
const JSON_PATH = resolve(DATA_DIR, "me_road_miles.json");

interface TownRoadData {
  name: string;
  total_miles: number;
}

async function extractAllPdfText(): Promise<string> {
  const pdfFiles = readdirSync(DATA_DIR)
    .filter((f) => f.startsWith("roads_") && f.endsWith(".pdf"))
    .sort();

  console.log(`  Found ${pdfFiles.length} county road PDFs`);

  let allText = "";
  for (const file of pdfFiles) {
    const pdfBuffer = readFileSync(resolve(DATA_DIR, file));
    const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
    const pdfData = await parser.getText();
    const county = file.replace("roads_", "").replace(".pdf", "");
    allText += `\n=== ${county} County ===\n${pdfData.text}\n`;
  }

  return allText;
}

async function extractWithClaude(text: string): Promise<TownRoadData[]> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Missing ANTHROPIC_API_KEY");

  const client = new Anthropic({ apiKey });

  // May need to split into chunks if too large
  const maxChars = 100000;
  const allTowns: TownRoadData[] = [];

  for (let offset = 0; offset < text.length; offset += maxChars) {
    const chunk = text.slice(offset, offset + maxChars);
    console.log(`  Sending chunk ${Math.floor(offset / maxChars) + 1} (${chunk.length} chars) to Claude...`);

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 16384,
      system: "You are a data extraction assistant. Extract road mileage data from MaineDOT county PDFs. Return ONLY a JSON array with no other text.",
      messages: [
        {
          role: "user",
          content: `Extract all Maine municipalities and their TOTAL public road centerline mileage from this MaineDOT data.

Each county section has a table with municipality names and road mileage broken down by road type. I need:
- name: municipality name (string), just the town name without "Town of" etc.
- total_miles: the TOTAL column value (rightmost total of all road types) for that municipality (number)

Skip county total rows and summary rows. Only include individual municipalities.

Return ONLY a valid JSON array. Example: [{"name": "Auburn", "total_miles": 185.3}]

Document text:
${chunk}`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== "text") continue;

    let jsonStr = content.text.trim();
    const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) jsonStr = jsonMatch[1].trim();

    try {
      const towns: TownRoadData[] = JSON.parse(jsonStr);
      allTowns.push(...towns);
    } catch (e) {
      console.error(`  [ERROR] Failed to parse Claude response for chunk at offset ${offset}`);
    }
  }

  return allTowns;
}

async function main() {
  logStep("Importing ME road miles from MaineDOT county PDFs");

  let roadData: TownRoadData[];

  if (existsSync(JSON_PATH)) {
    console.log("  Using cached road miles JSON");
    roadData = JSON.parse(readFileSync(JSON_PATH, "utf-8"));
  } else {
    console.log("  Extracting text from county PDFs...");
    const allText = await extractAllPdfText();
    console.log(`  Total extracted text: ${allText.length} characters`);

    roadData = await extractWithClaude(allText);
    console.log(`  Claude extracted ${roadData.length} towns total`);

    writeFileSync(JSON_PATH, JSON.stringify(roadData, null, 2), "utf-8");
    console.log(`  Cached to ${JSON_PATH}`);
  }

  // Update database
  const { data: towns, error } = await supabase
    .from("towns")
    .select("id, name")
    .eq("state", "ME");

  if (error || !towns) {
    console.error("  Failed to fetch ME towns:", error?.message);
    process.exit(1);
  }

  const milesLookup = new Map<string, number>();
  for (const rd of roadData) {
    if (rd.name && rd.total_miles > 0) {
      milesLookup.set(normalizeTownName(rd.name), rd.total_miles);
    }
  }
  console.log(`  Built lookup for ${milesLookup.size} towns`);

  let updated = 0;
  for (const town of towns) {
    const normalized = normalizeTownName(town.name);
    const miles = milesLookup.get(normalized);

    if (miles) {
      const { error: updateError } = await supabase
        .from("towns")
        .update({ road_miles: miles })
        .eq("id", town.id);

      if (!updateError) updated++;
    }
  }

  logDone(`Updated road miles for ${updated}/${towns.length} ME towns`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
