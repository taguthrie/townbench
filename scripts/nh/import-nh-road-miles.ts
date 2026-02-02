/**
 * Import NH town road miles from NHDOT 2019 Town Centerline Miles PDF.
 * The PDF has a table with columns: TOWN, I, II, III, IV, V, VI, Grand Total.
 * We extract text via pdf-parse and parse the "Grand Total" column per town.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve } from "path";
import { PDFParse } from "pdf-parse";
import { supabase } from "../lib/db";
import { normalizeTownName, logStep, logDone } from "../lib/utils";

const DATA_DIR = resolve(__dirname, "../data/nh");
const PDF_PATH = resolve(DATA_DIR, "town-centerline-miles-legisclass-2019.pdf");
const JSON_PATH = resolve(DATA_DIR, "nh_road_miles.json");

interface TownRoadData {
  name: string;
  total_miles: number;
}

async function extractFromPdf(): Promise<TownRoadData[]> {
  const pdfBuffer = readFileSync(PDF_PATH);
  const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
  const pdfData = await parser.getText();
  const text = pdfData.text;

  const towns: TownRoadData[] = [];
  const lines = text.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip header/footer lines
    if (
      trimmed.startsWith("Sum of") ||
      trimmed.startsWith("TOWN") ||
      trimmed.startsWith("State Highway") ||
      trimmed.startsWith("2019 Roads") ||
      trimmed.startsWith("Town Centerline") ||
      trimmed.startsWith("By Legislative") ||
      trimmed.startsWith("Grand Total") ||
      trimmed.startsWith("NHDOT") ||
      trimmed.startsWith("229:5") ||
      trimmed.startsWith("Source.")
    ) {
      continue;
    }

    // Skip the legal text at the end (long lines of prose)
    if (trimmed.length > 200) continue;

    // Each data line looks like: "ACWORTH 7.63 4.87 49.77 30.53 92.79"
    // Town name is everything before the first number, Grand Total is the last number
    const match = trimmed.match(/^([A-Z][A-Z\s\-'.]+?)\s+([\d,.]+(?:\s+[\d,.]+)*)$/);
    if (!match) continue;

    const townName = match[1].trim();
    const numbers = match[2].split(/\s+/).map((n) => parseFloat(n.replace(",", "")));

    if (numbers.length === 0) continue;

    // Grand Total is always the last number
    const grandTotal = numbers[numbers.length - 1];

    if (grandTotal > 0 && townName !== "Grand Total") {
      towns.push({
        name: townName,
        total_miles: grandTotal,
      });
    }
  }

  return towns;
}

async function main() {
  logStep("Importing NH road miles from NHDOT 2019 Town Centerline Miles PDF");

  if (!existsSync(PDF_PATH)) {
    console.error(`PDF not found at: ${PDF_PATH}`);
    console.error(
      "Download from: https://www.dot.nh.gov/sites/g/files/ehbemt811/files/inline-documents/town-centerline-miles-legisclass-2019.pdf"
    );
    process.exit(1);
  }

  let roadData: TownRoadData[];

  if (existsSync(JSON_PATH)) {
    console.log("  Using cached road miles JSON");
    roadData = JSON.parse(readFileSync(JSON_PATH, "utf-8"));
  } else {
    console.log("  Extracting text from NHDOT PDF...");
    roadData = await extractFromPdf();
    console.log(`  Extracted ${roadData.length} towns from PDF`);

    writeFileSync(JSON_PATH, JSON.stringify(roadData, null, 2), "utf-8");
    console.log(`  Cached to ${JSON_PATH}`);
  }

  // Build lookup
  const milesLookup = new Map<string, number>();
  for (const rd of roadData) {
    if (rd.name && rd.total_miles > 0) {
      milesLookup.set(normalizeTownName(rd.name), rd.total_miles);
    }
  }
  console.log(`  Built lookup for ${milesLookup.size} towns`);

  // Fetch NH towns from database
  const { data: towns, error } = await supabase
    .from("towns")
    .select("id, name")
    .eq("state", "NH");

  if (error || !towns) {
    console.error("  Failed to fetch NH towns:", error?.message);
    process.exit(1);
  }

  let updated = 0;
  let notFound: string[] = [];

  for (const town of towns) {
    const normalized = normalizeTownName(town.name);
    const miles = milesLookup.get(normalized);

    if (miles) {
      const { error: updateError } = await supabase
        .from("towns")
        .update({ road_miles: miles })
        .eq("id", town.id);

      if (!updateError) updated++;
    } else {
      notFound.push(town.name);
    }
  }

  if (notFound.length > 0 && notFound.length <= 20) {
    console.log(`  Not matched: ${notFound.join(", ")}`);
  } else if (notFound.length > 20) {
    console.log(`  Not matched: ${notFound.length} towns`);
  }

  logDone(`Updated road miles for ${updated}/${towns.length} NH towns`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
