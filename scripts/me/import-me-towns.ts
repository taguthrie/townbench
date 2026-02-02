/**
 * Import ME town metadata from the Maine Revenue Services State Valuation History Excel file.
 * This replaces the PDF parsing approach — the Excel is structured and machine-readable.
 *
 * The Excel has rows organized by county:
 *   "ANDROSCOGGIN COUNTY (000s)"
 *   "MUNICIPALITY", 2026, 2025, 2024, ...
 *   "AUBURN", 3552800000, ...
 *   ...
 *   "COUNTY TOTALS", ...
 *   (blank)
 *   "AROOSTOOK COUNTY (000s)"
 *   ...
 */

import { existsSync } from "fs";
import { resolve } from "path";
import * as XLSX from "xlsx";
import { supabase } from "../lib/db";
import {
  normalizeTownName,
  registerDataSource,
  logStep,
  logDone,
} from "../lib/utils";

const DATA_DIR = resolve(__dirname, "../data/me");
const XLSX_PATH = resolve(DATA_DIR, "me_state_valuation_history.xlsx");

async function main() {
  logStep("Importing ME towns from State Valuation History Excel");

  if (!existsSync(XLSX_PATH)) {
    console.error(`Excel file not found at: ${XLSX_PATH}`);
    console.error("Download from: https://www.maine.gov/revenue/taxes/property-tax/state-valuation");
    process.exit(1);
  }

  // Register data source
  const sourceId = await registerDataSource({
    source_key: "me_state_valuation_2026",
    source_name: "Maine Revenue Services State Valuation History 2007-2026",
    source_url: "https://www.maine.gov/revenue/taxes/property-tax/state-valuation",
    source_type: "xlsx",
    state: "ME",
    fiscal_year: 2026,
  });

  // Parse Excel
  const workbook = XLSX.readFile(XLSX_PATH);
  const sheet = workbook.Sheets["2007-2026"];
  if (!sheet) {
    console.error("  Sheet '2007-2026' not found. Available sheets:", workbook.SheetNames);
    process.exit(1);
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as unknown[][];
  console.log(`  Total rows in sheet: ${rows.length}`);

  // Parse rows: track current county, extract town + valuation
  interface TownData {
    name: string;
    county: string;
    valuation: number;
  }

  const towns: TownData[] = [];
  let currentCounty = "";

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const firstCell = String(row[0] || "").trim();
    if (!firstCell) continue;

    // Detect county header: "ANDROSCOGGIN COUNTY (000s)"
    const countyMatch = firstCell.match(/^([A-Z\s]+)\s+COUNTY/);
    if (countyMatch) {
      // Title case the county name
      currentCounty = countyMatch[1].trim().split(/\s+/).map(
        (w) => w.charAt(0) + w.slice(1).toLowerCase()
      ).join(" ");
      continue;
    }

    // Skip header rows and totals
    if (firstCell === "MUNICIPALITY" || firstCell.includes("TOTAL") || firstCell.includes("STATE VALUATION")) {
      continue;
    }

    // This should be a town row
    if (!currentCounty) continue;

    // Get the 2026 valuation (column index 1, the most recent year)
    const val2026 = row[1];
    let valuation = 0;
    if (typeof val2026 === "number") {
      valuation = val2026;
    } else if (typeof val2026 === "string" && !isNaN(parseFloat(val2026))) {
      valuation = parseFloat(val2026);
    }
    // Skip deorganized towns
    if (typeof val2026 === "string" && val2026.toLowerCase().includes("deorganized")) {
      continue;
    }

    towns.push({
      name: normalizeTownName(firstCell),
      county: currentCounty,
      valuation,
    });
  }

  console.log(`  Parsed ${towns.length} ME municipalities from Excel`);

  // Upsert towns into database
  console.log("  Upserting towns into database...");
  let upsertCount = 0;

  for (const town of towns) {
    const { error } = await supabase
      .from("towns")
      .upsert(
        {
          name: town.name,
          state: "ME",
          county: town.county || null,
          population: 0, // Not in this dataset
          road_miles: 0,
          grand_list_valuation: town.valuation,
          fiscal_year: 2026,
          source_id: sourceId,
        },
        { onConflict: "name,state" }
      );

    if (error) {
      console.error(`  [ERROR] Upsert failed for ${town.name}: ${error.message}`);
    } else {
      upsertCount++;
    }
  }

  // Update source row count
  await supabase
    .from("data_sources")
    .update({ row_count: upsertCount })
    .eq("id", sourceId);

  logDone(`Upserted ${upsertCount} ME towns`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
