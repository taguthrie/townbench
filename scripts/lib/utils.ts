import { supabase } from "./db";

/**
 * Normalize a town name for consistent matching.
 * Handles: "Town of X", "City of X", case, "St." vs "Saint", extra whitespace.
 */
export function normalizeTownName(name: string): string {
  let normalized = name.trim();

  // Remove common prefixes
  normalized = normalized.replace(/^(Town of|City of|Village of)\s+/i, "");

  // Normalize Saint/St.
  normalized = normalized.replace(/\bSt\.\s*/g, "Saint ");
  normalized = normalized.replace(/\bSt\s+/g, "Saint ");

  // Collapse whitespace
  normalized = normalized.replace(/\s+/g, " ");

  // Title case
  normalized = normalized
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");

  return normalized;
}

/**
 * Batch insert rows into a Supabase table in groups.
 * Returns total number of rows inserted.
 */
export async function batchInsert(
  table: string,
  rows: Record<string, unknown>[],
  batchSize = 500
): Promise<number> {
  let inserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const { error } = await supabase.from(table).insert(batch);

    if (error) {
      console.error(`  [ERROR] Batch insert into ${table} at offset ${i}: ${error.message}`);
      throw error;
    }

    inserted += batch.length;
    if (rows.length > batchSize) {
      console.log(`  Inserted ${inserted}/${rows.length} rows into ${table}`);
    }
  }

  return inserted;
}

/**
 * Register (or update) a data source and return its ID.
 * If a source with the same source_key exists, updates it and returns the existing ID.
 */
export async function registerDataSource(source: {
  source_key: string;
  source_name: string;
  source_url?: string;
  source_type: string;
  state?: string;
  fiscal_year?: number;
  row_count?: number;
}): Promise<string> {
  // Check if source already exists
  const { data: existing } = await supabase
    .from("data_sources")
    .select("id")
    .eq("source_key", source.source_key)
    .single();

  if (existing) {
    // Update existing source
    const { error } = await supabase
      .from("data_sources")
      .update({
        source_name: source.source_name,
        source_url: source.source_url,
        source_type: source.source_type,
        state: source.state,
        fiscal_year: source.fiscal_year,
        fetched_at: new Date().toISOString(),
        row_count: source.row_count ?? 0,
      })
      .eq("id", existing.id);

    if (error) throw error;
    console.log(`  Updated data source: ${source.source_key} (${existing.id})`);
    return existing.id;
  }

  // Create new source
  const { data, error } = await supabase
    .from("data_sources")
    .insert({
      source_key: source.source_key,
      source_name: source.source_name,
      source_url: source.source_url,
      source_type: source.source_type,
      state: source.state,
      fiscal_year: source.fiscal_year,
      row_count: source.row_count ?? 0,
    })
    .select("id")
    .single();

  if (error) throw error;
  console.log(`  Created data source: ${source.source_key} (${data.id})`);
  return data.id;
}

/**
 * Delete all rows from a table that reference a specific source_id.
 */
export async function deleteBySourceId(table: string, sourceId: string): Promise<void> {
  const { error } = await supabase.from(table).delete().eq("source_id", sourceId);
  if (error) {
    console.error(`  [ERROR] Deleting from ${table} where source_id=${sourceId}: ${error.message}`);
    throw error;
  }
  console.log(`  Cleared existing rows from ${table} for source ${sourceId}`);
}

/** Simple logging helpers */
export function logStep(msg: string) {
  console.log(`\n=== ${msg} ===`);
}

export function logDone(msg: string) {
  console.log(`✓ ${msg}`);
}
