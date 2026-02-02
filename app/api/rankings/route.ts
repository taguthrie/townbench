import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { BUDGET_CATEGORIES } from "@/lib/taxonomy";

interface RankingEntry {
  metric: string;
  rank: number;
  total: number;
  value: number;
  stateAvg: number;
}

export async function GET(req: NextRequest) {
  const townId = req.nextUrl.searchParams.get("town_id");
  if (!townId) {
    return NextResponse.json({ error: "town_id required" }, { status: 400 });
  }

  // 1. Get target town
  const { data: town, error: townErr } = await supabase
    .from("towns")
    .select("*")
    .eq("id", townId)
    .single();

  if (townErr || !town) {
    return NextResponse.json({ error: "Town not found" }, { status: 404 });
  }

  // 2. Fetch all towns in same state
  const { data: stateTowns, error: stErr } = await supabase
    .from("towns")
    .select("*")
    .eq("state", town.state)
    .limit(2000);

  if (stErr || !stateTowns) {
    return NextResponse.json({ error: "Failed to fetch state towns" }, { status: 500 });
  }

  const townIds = stateTowns.map((t) => t.id);

  // 3. Fetch all budget_line_items for those towns (batched to avoid URL length limits)
  const BATCH_SIZE = 100;
  const allBudgetItems: { town_id: string; category: string; amount: number }[] = [];

  for (let i = 0; i < townIds.length; i += BATCH_SIZE) {
    const batch = townIds.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from("budget_line_items")
      .select("town_id, category, amount")
      .in("town_id", batch)
      .limit(50000);

    if (error) {
      return NextResponse.json({ error: "Failed to fetch budgets" }, { status: 500 });
    }
    if (data) allBudgetItems.push(...data);
  }

  // 4. Aggregate budgets per town and per category
  const townBudgets = new Map<string, number>();
  const townCategoryBudgets = new Map<string, Map<string, number>>();

  for (const item of allBudgetItems) {
    townBudgets.set(item.town_id, (townBudgets.get(item.town_id) || 0) + item.amount);

    if (!townCategoryBudgets.has(item.town_id)) {
      townCategoryBudgets.set(item.town_id, new Map());
    }
    const catMap = townCategoryBudgets.get(item.town_id)!;
    catMap.set(item.category, (catMap.get(item.category) || 0) + item.amount);
  }

  // Helper: compute rank and average
  function computeRanking(
    metric: string,
    targetValue: number,
    allValues: number[]
  ): RankingEntry {
    const sorted = [...allValues].sort((a, b) => b - a);
    const rank = sorted.findIndex((v) => v <= targetValue) + 1;
    const avg = allValues.length > 0
      ? allValues.reduce((s, v) => s + v, 0) / allValues.length
      : 0;
    return { metric, rank, total: allValues.length, value: targetValue, stateAvg: avg };
  }

  // 5. Metadata rankings (all towns in state)
  const metadataRankings: RankingEntry[] = [];

  const metadataMetrics: { metric: string; key: string }[] = [
    { metric: "Population", key: "population" },
    { metric: "Road Miles", key: "road_miles" },
    { metric: "Valuation", key: "grand_list_valuation" },
  ];

  for (const { metric, key } of metadataMetrics) {
    const values = stateTowns.map((t) => t[key] as number).filter((v) => v > 0);
    const targetVal = town[key] as number;
    metadataRankings.push(computeRanking(metric, targetVal, values));
  }

  // 6. Budget rankings (only towns with budget data)
  const budgetRankings: RankingEntry[] = [];
  const townsWithBudget = stateTowns.filter((t) => townBudgets.has(t.id));
  const targetBudget = townBudgets.get(townId) || 0;
  const hasBudget = townBudgets.has(townId);

  if (hasBudget && townsWithBudget.length > 0) {
    // Total budget
    const budgetValues = townsWithBudget.map((t) => townBudgets.get(t.id) || 0);
    budgetRankings.push(computeRanking("Total Budget", targetBudget, budgetValues));

    // Per capita
    const perCapitaValues = townsWithBudget
      .filter((t) => t.population > 0)
      .map((t) => (townBudgets.get(t.id) || 0) / t.population);
    if (town.population > 0) {
      budgetRankings.push(
        computeRanking("Budget Per Capita", targetBudget / town.population, perCapitaValues)
      );
    }

    // Per road mile
    const perMileValues = townsWithBudget
      .filter((t) => t.road_miles > 0)
      .map((t) => (townBudgets.get(t.id) || 0) / t.road_miles);
    if (town.road_miles > 0) {
      budgetRankings.push(
        computeRanking("Budget Per Road Mile", targetBudget / town.road_miles, perMileValues)
      );
    }

    // Per $1K valuation
    const perValValues = townsWithBudget
      .filter((t) => t.grand_list_valuation > 0)
      .map((t) => ((townBudgets.get(t.id) || 0) / t.grand_list_valuation) * 1000);
    if (town.grand_list_valuation > 0) {
      budgetRankings.push(
        computeRanking(
          "Budget Per $1K Valuation",
          (targetBudget / town.grand_list_valuation) * 1000,
          perValValues
        )
      );
    }
  }

  // 7. Per-category rankings (per capita)
  const categoryRankings: RankingEntry[] = [];

  if (hasBudget && town.population > 0) {
    for (const category of BUDGET_CATEGORIES) {
      const targetCatBudget = townCategoryBudgets.get(townId)?.get(category) || 0;
      if (targetCatBudget === 0) continue;

      const perCapitaValues = townsWithBudget
        .filter((t) => t.population > 0 && townCategoryBudgets.get(t.id)?.has(category))
        .map((t) => (townCategoryBudgets.get(t.id)!.get(category)! / t.population));

      categoryRankings.push(
        computeRanking(
          category,
          targetCatBudget / town.population,
          perCapitaValues
        )
      );
    }
  }

  return NextResponse.json({
    townId,
    state: town.state,
    metadataRankings,
    budgetRankings,
    categoryRankings,
  });
}
