/**
 * Import Maine revenue sharing data from Maine State Treasurer CSV.
 * Inserts into town_financials table (metric_key = 'revenue_sharing').
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { resolve } from "path";
import { parse } from "csv-parse/sync";
import { supabase } from "../lib/db";
import {
  normalizeTownName,
  registerDataSource,
  logStep,
  logDone,
} from "../lib/utils";

const DATA_DIR = resolve(__dirname, "../data/me");
const CSV_PATH = resolve(DATA_DIR, "me_revenue_sharing.csv");

// Maine State Treasurer publishes revenue sharing data
const REVENUE_URL = "https://www.maine.gov/treasurer/sites/maine.gov.treasurer/files/inline-files/Revenue_Sharing.csv";

function parseNumber(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[$,\s]/g, "").replace(/\((.+)\)/, "-$1");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

async function downloadCsv() {
  if (existsSync(CSV_PATH)) {
    console.log("  Revenue sharing CSV already downloaded, skipping fetch");
    return;
  }

  console.log(`  Downloading revenue sharing CSV from: ${REVENUE_URL}`);
  const response = await fetch(REVENUE_URL);

  if (!response.ok) {
    console.warn(`  [WARN] Download returned ${response.status}.`);
    console.warn("  The URL may have changed. Check https://www.maine.gov/treasurer for the current link.");
    console.warn(`  Download manually and save to: ${CSV_PATH}`);
    throw new Error(`Failed to download CSV: ${response.status}`);
  }

  const text = await response.text();
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(CSV_PATH, text, "utf-8");
  console.log(`  Saved CSV (${text.split("\n").length} lines)`);
}

async function main() {
  logStep("Importing ME revenue sharing data");

  mkdirSync(DATA_DIR, { recursive: true });

  // Download CSV
  await downloadCsv();

  if (!existsSync(CSV_PATH)) {
    console.error(`Revenue sharing CSV not found at: ${CSV_PATH}`);
    console.error("Download manually from Maine State Treasurer and save there.");
    process.exit(1);
  }

  // Register data source
  const sourceId = await registerDataSource({
    source_key: "me_revenue_sharing_2023",
    source_name: "Maine State Treasurer Revenue Sharing",
    source_url: "https://www.maine.gov/treasurer",
    source_type: "csv",
    state: "ME",
    fiscal_year: 2023,
  });

  // Parse CSV
  console.log("  Parsing revenue sharing CSV...");
  const content = readFileSync(CSV_PATH, "utf-8");
  const rows: Record<string, string>[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  });

  if (rows.length === 0) {
    console.error("  No rows found in revenue sharing CSV");
    process.exit(1);
  }

  const headers = Object.keys(rows[0]);
  console.log(`  CSV headers: ${headers.join(", ")}`);

  // Build town ID lookup
  const { data: towns, error: townError } = await supabase
    .from("towns")
    .select("id, name")
    .eq("state", "ME");

  if (townError || !towns) {
    console.error("  Failed to fetch ME towns:", townError?.message);
    process.exit(1);
  }

  const townLookup = new Map<string, string>();
  for (const t of towns) {
    townLookup.set(normalizeTownName(t.name), t.id);
  }
  console.log(`  Loaded ${townLookup.size} ME towns for matching`);

  // Delete existing revenue sharing entries for this source
  await supabase
    .from("town_financials")
    .delete()
    .eq("source_id", sourceId);

  // Find column names (headers vary by year)
  const townCol = headers.find((h) =>
    ["municipality", "town", "name", "municipal name", "community"].includes(h.toLowerCase().trim())
  );
  const amountCol = headers.find((h) =>
    ["amount", "revenue sharing", "distribution", "total", "payment"].includes(h.toLowerCase().trim())
  );

  if (!townCol) {
    console.error("  Could not find town name column. Headers:", headers);
    process.exit(1);
  }

  // Parse and insert
  const financialRows: Record<string, unknown>[] = [];
  let unmatchedTowns = new Set<string>();

  for (const row of rows) {
    const rawName = row[townCol]?.trim();
    if (!rawName) continue;
    const name = normalizeTownName(rawName);
    const townId = townLookup.get(name);

    if (!townId) {
      unmatchedTowns.add(rawName);
      continue;
    }

    // If we found an amount column, use it; otherwise sum all numeric columns
    let amount = 0;
    if (amountCol) {
      amount = parseNumber(row[amountCol]);
    } else {
      // Sum all numeric-looking columns that aren't the town name
      for (const col of headers) {
        if (col === townCol) continue;
        const val = parseNumber(row[col]);
        if (val > 0) amount += val;
      }
    }

    if (amount === 0) continue;

    financialRows.push({
      town_id: townId,
      fiscal_year: 2023,
      metric_key: "revenue_sharing",
      metric_value: amount,
      source_id: sourceId,
    });
  }

  if (unmatchedTowns.size > 0) {
    console.warn(`  [WARN] ${unmatchedTowns.size} town names in CSV didn't match database:`);
    for (const name of [...unmatchedTowns].slice(0, 10)) {
      console.warn(`    - "${name}"`);
    }
    if (unmatchedTowns.size > 10) {
      console.warn(`    ... and ${unmatchedTowns.size - 10} more`);
    }
  }

  // Batch insert
  if (financialRows.length > 0) {
    for (let i = 0; i < financialRows.length; i += 500) {
      const batch = financialRows.slice(i, i + 500);
      const { error } = await supabase.from("town_financials").insert(batch);
      if (error) {
        console.error(`  [ERROR] Insert batch at ${i}: ${error.message}`);
      }
    }

    // Update source row count
    await supabase
      .from("data_sources")
      .update({ row_count: financialRows.length })
      .eq("id", sourceId);

    logDone(`Inserted ${financialRows.length} revenue sharing records`);
  } else {
    console.log("  No revenue sharing rows to insert. Check CSV format and town matching.");
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
