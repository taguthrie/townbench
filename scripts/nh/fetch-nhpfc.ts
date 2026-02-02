/**
 * Fetch CSV data from NHPFC.org (NH Public Finance Center)
 * Downloads expenditures, demographics, and valuation data for all 234 NH towns.
 * Saves raw CSVs to scripts/data/nh/ (gitignored).
 */

import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { logStep, logDone } from "../lib/utils";

const DATA_DIR = resolve(__dirname, "../data/nh");

// NHPFC CSV download URLs — these are the public data exports
// The site provides downloadable CSVs at these endpoints
const DOWNLOADS: { name: string; url: string; filename: string }[] = [
  {
    name: "Expenditures",
    url: "https://www.nhpfc.org/api/expenditures/download?format=csv",
    filename: "nhpfc_expenditures.csv",
  },
  {
    name: "Demographics",
    url: "https://www.nhpfc.org/api/demographics/download?format=csv",
    filename: "nhpfc_demographics.csv",
  },
  {
    name: "Valuations",
    url: "https://www.nhpfc.org/api/valuations/download?format=csv",
    filename: "nhpfc_valuations.csv",
  },
];

async function fetchCsv(name: string, url: string, filename: string) {
  console.log(`  Fetching ${name} from ${url}...`);

  const response = await fetch(url);

  if (!response.ok) {
    // If the direct API URL doesn't work, try the website's data page
    console.warn(`  [WARN] ${name} fetch returned ${response.status}. The URL may have changed.`);
    console.warn(`  Check https://www.nhpfc.org for current download links.`);
    console.warn(`  You can manually download the CSV and save it to: ${resolve(DATA_DIR, filename)}`);
    return false;
  }

  const text = await response.text();
  const outPath = resolve(DATA_DIR, filename);
  writeFileSync(outPath, text, "utf-8");
  const lineCount = text.split("\n").length - 1;
  console.log(`  Saved ${lineCount} rows to ${filename}`);
  return true;
}

async function main() {
  logStep("Fetching NHPFC data");

  mkdirSync(DATA_DIR, { recursive: true });

  let successCount = 0;
  for (const dl of DOWNLOADS) {
    const ok = await fetchCsv(dl.name, dl.url, dl.filename);
    if (ok) successCount++;
  }

  if (successCount === 0) {
    console.log("\n[INFO] No CSVs were downloaded automatically.");
    console.log("NHPFC.org may require browser-based download. To proceed manually:");
    console.log("  1. Visit https://www.nhpfc.org");
    console.log("  2. Navigate to Data Downloads or Reports");
    console.log("  3. Download expenditure, demographics, and valuation CSVs");
    console.log(`  4. Save them to: ${DATA_DIR}`);
    console.log("     - nhpfc_expenditures.csv");
    console.log("     - nhpfc_demographics.csv");
    console.log("     - nhpfc_valuations.csv");
    console.log("  5. Then run: npx tsx scripts/nh/import-nhpfc-towns.ts");
    process.exit(1);
  }

  logDone(`Fetched ${successCount}/${DOWNLOADS.length} CSVs`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
