import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { BUDGET_CATEGORIES } from "@/lib/taxonomy";

interface Town {
  id: string;
  name: string;
  state: string;
  county?: string;
  population: number;
  population_year?: number;
  road_miles: number;
  road_miles_year?: number;
  grand_list_valuation: number;
  valuation_year?: number;
  fiscal_year: number;
}

interface BudgetItem {
  town_id: string;
  category: string;
  subcategory: string;
  line_item: string;
  amount: number;
  fiscal_year: number;
}

interface RankingEntry {
  metric: string;
  rank: number;
  total: number;
  value: number;
  stateAvg: number;
}

function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

function computeRanking(
  targetValue: number,
  allValues: number[]
): { rank: number; total: number; avg: number; percentile: number } {
  const sorted = [...allValues].sort((a, b) => b - a);
  const rank = sorted.findIndex((v) => v <= targetValue) + 1;
  const avg = allValues.length > 0
    ? allValues.reduce((s, v) => s + v, 0) / allValues.length
    : 0;
  const percentile = allValues.length > 1
    ? ((allValues.length - rank) / (allValues.length - 1)) * 100
    : 50;
  return { rank, total: allValues.length, avg, percentile };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const townIds = searchParams.get("town_ids")?.split(",").filter(Boolean) || [];
  const metric = searchParams.get("metric") || "per_capita";

  if (townIds.length === 0) {
    return NextResponse.json({ error: "town_ids required" }, { status: 400 });
  }

  const primaryTownId = townIds[0];

  // 1. Fetch all requested towns
  const { data: towns, error: townsErr } = await supabase
    .from("towns")
    .select("*")
    .in("id", townIds);

  if (townsErr || !towns || towns.length === 0) {
    return NextResponse.json({ error: "Towns not found" }, { status: 404 });
  }

  const primaryTown = towns.find((t) => t.id === primaryTownId) as Town;
  if (!primaryTown) {
    return NextResponse.json({ error: "Primary town not found" }, { status: 404 });
  }

  // 2. Fetch state towns for rankings
  const { data: stateTowns, error: stateErr } = await supabase
    .from("towns")
    .select("*")
    .eq("state", primaryTown.state)
    .limit(2000);

  if (stateErr) {
    return NextResponse.json({ error: "Failed to fetch state towns" }, { status: 500 });
  }

  // 3. Fetch budget data for requested towns
  const { data: budgetItems, error: budgetErr } = await supabase
    .from("budget_line_items")
    .select("town_id, category, subcategory, line_item, amount, fiscal_year")
    .in("town_id", townIds)
    .order("category")
    .order("subcategory")
    .order("line_item");

  if (budgetErr) {
    return NextResponse.json({ error: "Failed to fetch budget data" }, { status: 500 });
  }

  // 4. Fetch all budget data for state (for rankings)
  const stateTownIds = (stateTowns || []).map((t) => t.id);
  const BATCH_SIZE = 100;
  const allStateBudgetItems: BudgetItem[] = [];

  for (let i = 0; i < stateTownIds.length; i += BATCH_SIZE) {
    const batch = stateTownIds.slice(i, i + BATCH_SIZE);
    const { data, error } = await supabase
      .from("budget_line_items")
      .select("town_id, category, subcategory, line_item, amount, fiscal_year")
      .in("town_id", batch)
      .limit(50000);

    if (!error && data) {
      allStateBudgetItems.push(...(data as BudgetItem[]));
    }
  }

  // Aggregate state budgets
  const stateTownBudgets = new Map<string, number>();
  const stateTownCategoryBudgets = new Map<string, Map<string, number>>();

  for (const item of allStateBudgetItems) {
    stateTownBudgets.set(item.town_id, (stateTownBudgets.get(item.town_id) || 0) + item.amount);

    if (!stateTownCategoryBudgets.has(item.town_id)) {
      stateTownCategoryBudgets.set(item.town_id, new Map());
    }
    const catMap = stateTownCategoryBudgets.get(item.town_id)!;
    catMap.set(item.category, (catMap.get(item.category) || 0) + item.amount);
  }

  // Build CSV sections
  const lines: string[] = [];
  const timestamp = new Date().toISOString();

  // ========== SECTION 1: TOWN SUMMARY ==========
  lines.push("=== TOWN SUMMARY ===");
  lines.push("Town,State,County,Population,Population Year,Road Miles,Road Miles Year,Grand List Valuation,Valuation Year,Fiscal Year");

  for (const town of towns) {
    const t = town as Town;
    lines.push([
      escapeCSV(t.name),
      escapeCSV(t.state),
      escapeCSV(t.county || "N/A"),
      t.population || "N/A",
      t.population_year || "N/A",
      formatNumber(t.road_miles || 0, 1),
      t.road_miles_year || "N/A",
      t.grand_list_valuation || "N/A",
      t.valuation_year || "N/A",
      t.fiscal_year || "N/A",
    ].join(","));
  }
  lines.push("");

  // ========== SECTION 2: STATE RANKINGS ==========
  lines.push("=== STATE RANKINGS ===");
  lines.push("Metric,Town Value,State Rank,Total Towns,State Average,Percentile");

  const townsWithBudget = (stateTowns || []).filter((t) => stateTownBudgets.has(t.id));
  const primaryBudget = stateTownBudgets.get(primaryTownId) || 0;
  const hasBudget = stateTownBudgets.has(primaryTownId);

  // Metadata rankings
  const metadataMetrics = [
    { metric: "Population", getValue: (t: Town) => t.population },
    { metric: "Road Miles", getValue: (t: Town) => t.road_miles },
    { metric: "Grand List Valuation", getValue: (t: Town) => t.grand_list_valuation },
  ];

  for (const { metric: metricName, getValue } of metadataMetrics) {
    const values = (stateTowns || []).map((t) => getValue(t as Town)).filter((v) => v > 0);
    const targetVal = getValue(primaryTown);
    if (targetVal > 0) {
      const { rank, total, avg, percentile } = computeRanking(targetVal, values);
      lines.push([
        escapeCSV(metricName),
        formatNumber(targetVal, metricName === "Road Miles" ? 1 : 0),
        rank,
        total,
        formatNumber(avg, metricName === "Road Miles" ? 1 : 0),
        formatNumber(percentile, 1) + "%",
      ].join(","));
    }
  }

  // Budget rankings
  if (hasBudget && townsWithBudget.length > 0) {
    // Total budget
    const budgetValues = townsWithBudget.map((t) => stateTownBudgets.get(t.id) || 0);
    const totalRanking = computeRanking(primaryBudget, budgetValues);
    lines.push([
      "Total Budget",
      formatNumber(primaryBudget, 0),
      totalRanking.rank,
      totalRanking.total,
      formatNumber(totalRanking.avg, 0),
      formatNumber(totalRanking.percentile, 1) + "%",
    ].join(","));

    // Per capita
    if (primaryTown.population > 0) {
      const perCapitaValues = townsWithBudget
        .filter((t) => (t as Town).population > 0)
        .map((t) => (stateTownBudgets.get(t.id) || 0) / (t as Town).population);
      const perCapitaRanking = computeRanking(primaryBudget / primaryTown.population, perCapitaValues);
      lines.push([
        "Budget Per Capita",
        formatNumber(primaryBudget / primaryTown.population, 2),
        perCapitaRanking.rank,
        perCapitaRanking.total,
        formatNumber(perCapitaRanking.avg, 2),
        formatNumber(perCapitaRanking.percentile, 1) + "%",
      ].join(","));
    }

    // Per road mile
    if (primaryTown.road_miles > 0) {
      const perMileValues = townsWithBudget
        .filter((t) => (t as Town).road_miles > 0)
        .map((t) => (stateTownBudgets.get(t.id) || 0) / (t as Town).road_miles);
      const perMileRanking = computeRanking(primaryBudget / primaryTown.road_miles, perMileValues);
      lines.push([
        "Budget Per Road Mile",
        formatNumber(primaryBudget / primaryTown.road_miles, 2),
        perMileRanking.rank,
        perMileRanking.total,
        formatNumber(perMileRanking.avg, 2),
        formatNumber(perMileRanking.percentile, 1) + "%",
      ].join(","));
    }

    // Per $1K valuation
    if (primaryTown.grand_list_valuation > 0) {
      const perValValues = townsWithBudget
        .filter((t) => (t as Town).grand_list_valuation > 0)
        .map((t) => ((stateTownBudgets.get(t.id) || 0) / (t as Town).grand_list_valuation) * 1000);
      const perValRanking = computeRanking((primaryBudget / primaryTown.grand_list_valuation) * 1000, perValValues);
      lines.push([
        "Budget Per $1K Valuation",
        formatNumber((primaryBudget / primaryTown.grand_list_valuation) * 1000, 2),
        perValRanking.rank,
        perValRanking.total,
        formatNumber(perValRanking.avg, 2),
        formatNumber(perValRanking.percentile, 1) + "%",
      ].join(","));
    }

    // Category rankings (per capita)
    if (primaryTown.population > 0) {
      for (const category of BUDGET_CATEGORIES) {
        const targetCatBudget = stateTownCategoryBudgets.get(primaryTownId)?.get(category) || 0;
        if (targetCatBudget === 0) continue;

        const perCapitaValues = townsWithBudget
          .filter((t) => (t as Town).population > 0 && stateTownCategoryBudgets.get(t.id)?.has(category))
          .map((t) => (stateTownCategoryBudgets.get(t.id)!.get(category)! / (t as Town).population));

        const catRanking = computeRanking(targetCatBudget / primaryTown.population, perCapitaValues);
        lines.push([
          escapeCSV(`${category} Per Capita`),
          formatNumber(targetCatBudget / primaryTown.population, 2),
          catRanking.rank,
          catRanking.total,
          formatNumber(catRanking.avg, 2),
          formatNumber(catRanking.percentile, 1) + "%",
        ].join(","));
      }
    }
  }
  lines.push("");

  // ========== SECTION 3: BUDGET BREAKDOWN ==========
  lines.push("=== BUDGET BREAKDOWN ===");
  lines.push("Category,Subcategory,Line Item,Amount,Per Capita,Per Road Mile,Per $1K Valuation,vs State Avg %");

  // Group budget items by town, then category/subcategory
  const primaryBudgetItems = (budgetItems || []).filter((b) => b.town_id === primaryTownId) as BudgetItem[];

  // Calculate state averages per category (per capita)
  const stateCategoryAvgs = new Map<string, number>();
  if (primaryTown.population > 0) {
    for (const category of BUDGET_CATEGORIES) {
      const perCapitaValues = townsWithBudget
        .filter((t) => (t as Town).population > 0 && stateTownCategoryBudgets.get(t.id)?.has(category))
        .map((t) => (stateTownCategoryBudgets.get(t.id)!.get(category)! / (t as Town).population));

      if (perCapitaValues.length > 0) {
        stateCategoryAvgs.set(category, perCapitaValues.reduce((s, v) => s + v, 0) / perCapitaValues.length);
      }
    }
  }

  // Group and output
  const catMap = new Map<string, Map<string, BudgetItem[]>>();
  for (const item of primaryBudgetItems) {
    if (!catMap.has(item.category)) catMap.set(item.category, new Map());
    const subMap = catMap.get(item.category)!;
    if (!subMap.has(item.subcategory)) subMap.set(item.subcategory, []);
    subMap.get(item.subcategory)!.push(item);
  }

  for (const [category, subMap] of catMap) {
    let categoryTotal = 0;
    for (const items of subMap.values()) {
      categoryTotal += items.reduce((s, i) => s + i.amount, 0);
    }

    // Category row
    const catPerCapita = primaryTown.population > 0 ? categoryTotal / primaryTown.population : 0;
    const catPerMile = primaryTown.road_miles > 0 ? categoryTotal / primaryTown.road_miles : 0;
    const catPerVal = primaryTown.grand_list_valuation > 0 ? (categoryTotal / primaryTown.grand_list_valuation) * 1000 : 0;
    const stateAvg = stateCategoryAvgs.get(category) || 0;
    const vsStateAvg = stateAvg > 0 ? ((catPerCapita - stateAvg) / stateAvg) * 100 : 0;

    lines.push([
      escapeCSV(category),
      "",
      "",
      formatNumber(categoryTotal, 0),
      formatNumber(catPerCapita, 2),
      formatNumber(catPerMile, 2),
      formatNumber(catPerVal, 2),
      stateAvg > 0 ? (vsStateAvg > 0 ? "+" : "") + formatNumber(vsStateAvg, 1) + "%" : "N/A",
    ].join(","));

    for (const [subcategory, items] of subMap) {
      const subTotal = items.reduce((s, i) => s + i.amount, 0);
      const subPerCapita = primaryTown.population > 0 ? subTotal / primaryTown.population : 0;
      const subPerMile = primaryTown.road_miles > 0 ? subTotal / primaryTown.road_miles : 0;
      const subPerVal = primaryTown.grand_list_valuation > 0 ? (subTotal / primaryTown.grand_list_valuation) * 1000 : 0;

      // Subcategory row
      lines.push([
        "",
        escapeCSV(subcategory),
        "",
        formatNumber(subTotal, 0),
        formatNumber(subPerCapita, 2),
        formatNumber(subPerMile, 2),
        formatNumber(subPerVal, 2),
        "",
      ].join(","));

      // Line items
      for (const item of items) {
        const itemPerCapita = primaryTown.population > 0 ? item.amount / primaryTown.population : 0;
        const itemPerMile = primaryTown.road_miles > 0 ? item.amount / primaryTown.road_miles : 0;
        const itemPerVal = primaryTown.grand_list_valuation > 0 ? (item.amount / primaryTown.grand_list_valuation) * 1000 : 0;

        lines.push([
          "",
          "",
          escapeCSV(item.line_item),
          formatNumber(item.amount, 0),
          formatNumber(itemPerCapita, 2),
          formatNumber(itemPerMile, 2),
          formatNumber(itemPerVal, 2),
          "",
        ].join(","));
      }
    }
  }
  lines.push("");

  // ========== SECTION 4: TOWN COMPARISON ==========
  if (townIds.length > 1) {
    lines.push("=== TOWN COMPARISON ===");

    // Build header
    const comparisonTowns = towns as Town[];
    const headerCells = ["Category"];
    for (const town of comparisonTowns) {
      headerCells.push(escapeCSV(town.name));
      headerCells.push(`${town.name} Rank`);
    }
    lines.push(headerCells.join(","));

    // Calculate category totals per town
    const townCategoryTotals = new Map<string, Map<string, number>>();
    for (const item of (budgetItems || []) as BudgetItem[]) {
      if (!townCategoryTotals.has(item.town_id)) {
        townCategoryTotals.set(item.town_id, new Map());
      }
      const catMap = townCategoryTotals.get(item.town_id)!;
      catMap.set(item.category, (catMap.get(item.category) || 0) + item.amount);
    }

    // Get all categories across comparison towns
    const allCategories = new Set<string>();
    for (const catMap of townCategoryTotals.values()) {
      for (const cat of catMap.keys()) {
        allCategories.add(cat);
      }
    }

    // Helper to compute metric value
    const computeMetric = (amount: number, town: Town) => {
      switch (metric) {
        case "per_capita":
          return town.population > 0 ? amount / town.population : 0;
        case "per_road_mile":
          return town.road_miles > 0 ? amount / town.road_miles : 0;
        case "per_valuation":
          return town.grand_list_valuation > 0 ? (amount / town.grand_list_valuation) * 1000 : 0;
        default:
          return amount;
      }
    };

    // Get rank among comparison towns
    const getRank = (townId: string, category: string) => {
      const vals = comparisonTowns.map((t) => ({
        id: t.id,
        val: computeMetric(townCategoryTotals.get(t.id)?.get(category) || 0, t),
      }));
      vals.sort((a, b) => a.val - b.val); // Lower is better
      const idx = vals.findIndex((v) => v.id === townId);
      return idx + 1;
    };

    for (const category of Array.from(allCategories).sort()) {
      const row = [escapeCSV(category)];
      for (const town of comparisonTowns) {
        const amount = townCategoryTotals.get(town.id)?.get(category) || 0;
        const val = computeMetric(amount, town);
        row.push(formatNumber(val, 2));
        row.push(`#${getRank(town.id, category)}`);
      }
      lines.push(row.join(","));
    }

    // Total row
    const totalRow = ["Total"];
    for (const town of comparisonTowns) {
      let total = 0;
      const catMap = townCategoryTotals.get(town.id);
      if (catMap) {
        for (const amount of catMap.values()) {
          total += amount;
        }
      }
      const val = computeMetric(total, town);
      totalRow.push(formatNumber(val, 2));
      totalRow.push(""); // No rank for total
    }
    lines.push(totalRow.join(","));
    lines.push("");
  }

  // ========== FOOTER ==========
  lines.push("");
  lines.push(`Generated by TownBench on ${timestamp}`);
  lines.push(`Metric: ${metric === "absolute" ? "Absolute Dollars" : metric === "per_capita" ? "Per Capita" : metric === "per_road_mile" ? "Per Road Mile" : "Per $1K Valuation"}`);

  const csv = lines.join("\n");

  const filename = townIds.length === 1
    ? `townbench-${primaryTown.name.toLowerCase().replace(/\s+/g, "-")}-detailed.csv`
    : `townbench-comparison-detailed.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
