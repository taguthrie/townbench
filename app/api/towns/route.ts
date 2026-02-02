import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const state = searchParams.get("state");
  const county = searchParams.get("county");
  const hasBudget = searchParams.get("has_budget");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
  const offset = (page - 1) * limit;

  // Build query
  let query = supabase
    .from("towns")
    .select("*", { count: "exact" });

  if (state) {
    query = query.eq("state", state.toUpperCase());
  }
  if (county) {
    query = query.ilike("county", county);
  }

  // Filter to only towns that have budget data
  if (hasBudget === "true") {
    // Use a subquery: towns that have at least one budget_line_item
    const { data: townIdsWithBudget } = await supabase
      .from("budget_line_items")
      .select("town_id")
      .limit(1000);

    if (townIdsWithBudget) {
      const ids = [...new Set(townIdsWithBudget.map((r) => r.town_id))];
      if (ids.length > 0) {
        query = query.in("id", ids);
      } else {
        return NextResponse.json({ data: [], total: 0 });
      }
    }
  }

  query = query.order("state").order("name").range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data: data || [], total: count || 0 });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, state, population, road_miles, grand_list_valuation, fiscal_year } = body;

  if (!name || !state) {
    return NextResponse.json({ error: "name and state are required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("towns")
    .insert({
      name,
      state,
      population: population || 0,
      road_miles: road_miles || 0,
      grand_list_valuation: grand_list_valuation || 0,
      fiscal_year: fiscal_year || new Date().getFullYear(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
