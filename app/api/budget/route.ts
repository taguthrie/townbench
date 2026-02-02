import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const townId = searchParams.get("town_id");

  if (!townId) {
    return NextResponse.json({ error: "town_id is required" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("budget_line_items")
    .select("*")
    .eq("town_id", townId)
    .order("category")
    .order("subcategory")
    .order("line_item");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
