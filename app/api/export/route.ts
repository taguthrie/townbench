import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const townIds = searchParams.get("town_ids")?.split(",") || [];
  const fiscalYear = searchParams.get("fiscal_year");

  let query = supabase
    .from("budget_line_items")
    .select("*, towns(name, state, population, road_miles, grand_list_valuation)")
    .order("category")
    .order("subcategory")
    .order("line_item");

  if (townIds.length > 0) {
    query = query.in("town_id", townIds);
  }
  if (fiscalYear) {
    query = query.eq("fiscal_year", parseInt(fiscalYear));
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Build CSV
  const headers = [
    "Town",
    "State",
    "Fiscal Year",
    "Category",
    "Subcategory",
    "Line Item",
    "Amount",
    "Per Capita",
    "Per Road Mile",
    "Per $1K Valuation",
  ];

  const rows = (data || []).map((item: Record<string, unknown>) => {
    const town = item.towns as Record<string, unknown> | null;
    const pop = (town?.population as number) || 1;
    const miles = (town?.road_miles as number) || 1;
    const val = (town?.grand_list_valuation as number) || 1;
    const amount = item.amount as number;

    return [
      town?.name || "",
      town?.state || "",
      item.fiscal_year,
      item.category,
      item.subcategory,
      item.line_item,
      amount,
      (amount / pop).toFixed(2),
      (amount / miles).toFixed(2),
      ((amount / val) * 1000).toFixed(2),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`);
  });

  const csv = [headers.join(","), ...rows.map((r: string[]) => r.join(","))].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=townbench-export.csv",
    },
  });
}
