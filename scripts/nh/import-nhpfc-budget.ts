/**
 * Import NH budget data from NHPFC Voted Appropriations CSV.
 *
 * The CSV is wide-format:
 *   Id, EntityId, Year, EntityName, County, Total Voted Appropriations, 4130-4139 - Executive, ...
 *
 * Each column after the metadata is a DRA account code with a dollar amount.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { parse } from "csv-parse/sync";
import { supabase } from "../lib/db";
import { mapNhpfcCategory } from "../lib/mapping";
import {
  normalizeTownName,
  batchInsert,
  registerDataSource,
  deleteBySourceId,
  logStep,
  logDone,
} from "../lib/utils";

const DATA_DIR = resolve(__dirname, "../data/nh");

// Columns that are metadata, not expenditure categories
const SKIP_COLUMNS = new Set([
  "Id", "EntityId", "Year", "EntityName", "County", "Total Voted Appropriations",
]);

function parseNumber(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[$,\s]/g, "").replace(/\((.+)\)/, "-$1");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

async function main() {
  logStep("Importing NH budget data from NHPFC Voted Appropriations");

  const csvPath = resolve(DATA_DIR, "nhpfc_expenditures.csv");
  if (!existsSync(csvPath)) {
    console.error(`Expenditures CSV not found at: ${csvPath}`);
    process.exit(1);
  }

  // Register data source
  const sourceId = await registerDataSource({
    source_key: "nhpfc_voted_appropriations_2023",
    source_name: "NHPFC Voted Appropriations 2023",
    source_url: "https://nhpfc.org",
    source_type: "csv",
    state: "NH",
    fiscal_year: 2023,
  });

  // Delete existing budget rows for this source (idempotent re-run)
  await deleteBySourceId("budget_line_items", sourceId);

  // Parse CSV
  console.log("  Parsing voted appropriations CSV...");
  const content = readFileSync(csvPath, "utf-8");
  const rows: Record<string, string>[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  if (rows.length === 0) {
    console.error("  No rows found in CSV");
    process.exit(1);
  }

  const headers = Object.keys(rows[0]);
  const dataColumns = headers.filter((h) => !SKIP_COLUMNS.has(h));
  console.log(`  ${rows.length} towns, ${dataColumns.length} expenditure columns`);

  // Build town ID lookup
  const { data: towns, error: townError } = await supabase
    .from("towns")
    .select("id, name")
    .eq("state", "NH");

  if (townError || !towns) {
    console.error("  Failed to fetch NH towns:", townError?.message);
    process.exit(1);
  }

  const townLookup = new Map<string, string>();
  for (const t of towns) {
    townLookup.set(normalizeTownName(t.name), t.id);
  }
  console.log(`  Loaded ${townLookup.size} NH towns for matching`);

  // Build budget rows
  const budgetRows: Record<string, unknown>[] = [];
  let townsWithData = 0;
  let townsSkipped = 0;
  const unmatchedTowns = new Set<string>();

  for (const row of rows) {
    const rawName = row["EntityName"]?.trim();
    if (!rawName) continue;

    const name = normalizeTownName(rawName);
    const townId = townLookup.get(name);

    if (!townId) {
      unmatchedTowns.add(rawName);
      continue;
    }

    let townHasData = false;
    for (const col of dataColumns) {
      const amount = parseNumber(row[col]);
      if (amount === 0) continue;

      const mapped = mapNhpfcCategory(col);
      budgetRows.push({
        town_id: townId,
        fiscal_year: 2023,
        category: mapped.category,
        subcategory: mapped.subcategory,
        line_item: col,
        amount,
        source_id: sourceId,
      });
      townHasData = true;
    }

    if (townHasData) {
      townsWithData++;
    } else {
      townsSkipped++;
    }
  }

  console.log(`  Towns with data: ${townsWithData}, Towns with no data: ${townsSkipped}`);

  if (unmatchedTowns.size > 0) {
    console.warn(`  [WARN] ${unmatchedTowns.size} town names didn't match database:`);
    for (const name of [...unmatchedTowns].slice(0, 10)) {
      console.warn(`    - "${name}"`);
    }
  }

  // Batch insert
  if (budgetRows.length > 0) {
    console.log(`  Inserting ${budgetRows.length} budget line items...`);
    const inserted = await batchInsert("budget_line_items", budgetRows, 500);

    await supabase
      .from("data_sources")
      .update({ row_count: inserted })
      .eq("id", sourceId);

    logDone(`Inserted ${inserted} budget line items for ${townsWithData} NH towns`);
  } else {
    console.log("  No budget rows to insert.");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
