/**
 * Update ME town population from U.S. Census Bureau SUB-EST2024 data.
 * Uses POPESTIMATE2024 (most recent) for all Maine municipalities.
 */

import { readFileSync } from "fs";
import { resolve } from "path";
import { parse } from "csv-parse/sync";
import { supabase } from "../lib/db";
import { normalizeTownName, logStep, logDone } from "../lib/utils";

const CSV_PATH = resolve(__dirname, "../data/me/me_population.csv");

async function main() {
  logStep("Updating ME town population from Census data");

  const content = readFileSync(CSV_PATH, "utf-8");
  const rows: Record<string, string>[] = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  // Filter to SUMLEV 061 (minor civil divisions = towns/cities/plantations)
  const townRows = rows.filter((r) => r["SUMLEV"] === "061");
  console.log(`  Found ${townRows.length} Maine municipalities in Census data`);

  // Build population lookup: normalize name → population
  const popLookup = new Map<string, number>();
  for (const row of townRows) {
    let name = row["NAME"] || "";
    // Remove suffixes: "Auburn city" → "Auburn", "Durham town" → "Durham"
    name = name.replace(/\s+(city|town|plantation|gore|township|CDP)$/i, "");
    const normalized = normalizeTownName(name);
    const pop = parseInt(row["POPESTIMATE2024"] || "0", 10);
    if (normalized && pop > 0) {
      popLookup.set(normalized, pop);
    }
  }
  console.log(`  Built lookup for ${popLookup.size} towns`);

  // Fetch all ME towns from database
  const { data: towns, error } = await supabase
    .from("towns")
    .select("id, name")
    .eq("state", "ME");

  if (error || !towns) {
    console.error("  Failed to fetch ME towns:", error?.message);
    process.exit(1);
  }

  let updated = 0;
  let notFound = 0;

  for (const town of towns) {
    const normalized = normalizeTownName(town.name);
    const pop = popLookup.get(normalized);

    if (pop) {
      const { error: updateError } = await supabase
        .from("towns")
        .update({ population: pop })
        .eq("id", town.id);

      if (updateError) {
        console.error(`  [ERROR] Update failed for ${town.name}: ${updateError.message}`);
      } else {
        updated++;
      }
    } else {
      notFound++;
    }
  }

  console.log(`  Not matched: ${notFound} towns (plantations, unorganized territories, etc.)`);
  logDone(`Updated population for ${updated}/${towns.length} ME towns`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
