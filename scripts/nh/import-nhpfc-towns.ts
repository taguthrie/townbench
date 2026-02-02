/**
 * Import NH town metadata from NHPFC demographics + expenditures CSVs.
 * Upserts NH towns with: name, state, county, population, fiscal_year.
 *
 * NHPFC CSV format:
 *   Id, EntityId, Year, EntityName, County, ...data columns
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { parse } from "csv-parse/sync";
import { supabase } from "../lib/db";
import {
  normalizeTownName,
  registerDataSource,
  logStep,
  logDone,
} from "../lib/utils";

const DATA_DIR = resolve(__dirname, "../data/nh");

function parseNumber(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[$,\s]/g, "").replace(/\((.+)\)/, "-$1");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

async function main() {
  logStep("Importing NH towns from NHPFC data");

  const demoPath = resolve(DATA_DIR, "nhpfc_demographics.csv");
  const expPath = resolve(DATA_DIR, "nhpfc_expenditures.csv");
  const valPath = resolve(DATA_DIR, "nhpfc_valuations.csv");

  if (!existsSync(demoPath) && !existsSync(expPath)) {
    console.error("No NHPFC CSV files found in:", DATA_DIR);
    process.exit(1);
  }

  // Register data source
  const sourceId = await registerDataSource({
    source_key: "nhpfc_towns_2023",
    source_name: "NHPFC Demographics & Voted Appropriations",
    source_url: "https://nhpfc.org",
    source_type: "csv",
    state: "NH",
    fiscal_year: 2023,
  });

  // Build town map from all available sources
  const townMap = new Map<string, {
    name: string;
    county: string;
    population: number;
    valuation: number;
  }>();

  // 1. Get town list + county from expenditures CSV (most complete town list)
  if (existsSync(expPath)) {
    console.log("  Extracting town list from expenditures CSV...");
    const content = readFileSync(expPath, "utf-8");
    const rows: Record<string, string>[] = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    for (const row of rows) {
      const rawName = row["EntityName"]?.trim();
      if (!rawName) continue;
      const name = normalizeTownName(rawName);
      const county = row["County"]?.trim() || "";

      if (!townMap.has(name)) {
        townMap.set(name, { name, county, population: 0, valuation: 0 });
      }
    }
    console.log(`  Found ${townMap.size} towns in expenditures CSV`);
  }

  // 2. Merge population from demographics CSV
  if (existsSync(demoPath)) {
    console.log("  Parsing demographics CSV...");
    const content = readFileSync(demoPath, "utf-8");
    const rows: Record<string, string>[] = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    let matched = 0;
    for (const row of rows) {
      const rawName = row["EntityName"]?.trim();
      if (!rawName) continue;
      const name = normalizeTownName(rawName);
      const county = row["County"]?.trim() || "";
      const population = parseNumber(row["Population (Est)"] || "");

      const existing = townMap.get(name);
      if (existing) {
        existing.population = population;
        if (!existing.county && county) existing.county = county;
        matched++;
      } else {
        townMap.set(name, { name, county, population, valuation: 0 });
      }
    }
    console.log(`  Matched population for ${matched} towns`);
  }

  // 3. Merge valuation if available
  if (existsSync(valPath)) {
    console.log("  Parsing valuations CSV...");
    const content = readFileSync(valPath, "utf-8");
    const rows: Record<string, string>[] = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    });

    let matched = 0;
    for (const row of rows) {
      const rawName = row["EntityName"]?.trim();
      if (!rawName) continue;
      const name = normalizeTownName(rawName);
      const valuation = parseNumber(
        row["Total Valuation (with Utilities)"] || row["Total Valuation (without Utilities)"] || ""
      );

      const existing = townMap.get(name);
      if (existing && valuation > 0) {
        existing.valuation = valuation;
        matched++;
      }
    }
    console.log(`  Matched valuation for ${matched} towns`);
  }

  // Upsert towns into database
  console.log(`  Upserting ${townMap.size} towns into database...`);
  let upsertCount = 0;

  for (const town of townMap.values()) {
    const { error } = await supabase
      .from("towns")
      .upsert(
        {
          name: town.name,
          state: "NH",
          county: town.county || null,
          population: town.population,
          road_miles: 0,
          grand_list_valuation: town.valuation,
          fiscal_year: 2023,
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

  logDone(`Upserted ${upsertCount} NH towns`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
