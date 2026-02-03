"use client";

import React, { useState, useMemo, useEffect } from "react";
import { BudgetLineItem, MetricType, Town } from "@/types";

interface BudgetExplorerProps {
  town: Town;
  items: BudgetLineItem[];
  metric: MetricType;
}

interface RankingData {
  metric: string;
  stateAvg: number;
}

interface CategoryGroup {
  category: string;
  total: number;
  subcategories: SubcategoryGroup[];
}

interface SubcategoryGroup {
  subcategory: string;
  total: number;
  items: BudgetLineItem[];
}

function formatMetric(amount: number, metric: MetricType, town: Town): string {
  let value = amount;
  switch (metric) {
    case "per_capita":
      value = town.population > 0 ? amount / town.population : 0;
      break;
    case "per_road_mile":
      value = town.road_miles > 0 ? amount / town.road_miles : 0;
      break;
    case "per_valuation":
      value =
        town.grand_list_valuation > 0
          ? (amount / town.grand_list_valuation) * 1000
          : 0;
      break;
  }
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatDifference(townValue: number, stateAvg: number): React.ReactElement | null {
  if (!stateAvg || stateAvg === 0) return null;
  const pct = ((townValue - stateAvg) / stateAvg) * 100;

  let color: string;
  if (pct <= -15) {
    color = "text-green-700"; // dark green - 15%+ below average
  } else if (pct < 0) {
    color = "text-green-500"; // light green - 0-15% below average
  } else if (pct <= 10) {
    color = "text-yellow-600"; // yellow - 0-10% above average
  } else {
    color = "text-red-600"; // red - 10%+ above average
  }

  const sign = pct > 0 ? "+" : "";
  return <span className={`ml-2 text-xs ${color}`}>{sign}{pct.toFixed(0)}% vs state</span>;
}

export default function BudgetExplorer({
  town,
  items,
  metric,
}: BudgetExplorerProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [expandedSubcategories, setExpandedSubcategories] = useState<
    Set<string>
  >(new Set());
  const [stateAvgs, setStateAvgs] = useState<Record<string, number>>({});

  useEffect(() => {
    if (town?.id) {
      fetch(`/api/rankings?town_id=${town.id}`)
        .then((r) => r.json())
        .then((data) => {
          const avgs: Record<string, number> = {};
          data.categoryRankings?.forEach((r: RankingData) => {
            // Remove " Per Capita" suffix to get category name
            avgs[r.metric.replace(" Per Capita", "")] = r.stateAvg;
          });
          data.subcategoryRankings?.forEach((r: RankingData) => {
            // Key is "category|subcategory"
            avgs[r.metric] = r.stateAvg;
          });
          setStateAvgs(avgs);
        })
        .catch(() => {
          // Silently fail - state avgs are optional
        });
    }
  }, [town?.id]);

  const grouped = useMemo(() => {
    const catMap = new Map<string, Map<string, BudgetLineItem[]>>();
    for (const item of items) {
      if (!catMap.has(item.category)) catMap.set(item.category, new Map());
      const subMap = catMap.get(item.category)!;
      if (!subMap.has(item.subcategory)) subMap.set(item.subcategory, []);
      subMap.get(item.subcategory)!.push(item);
    }

    const result: CategoryGroup[] = [];
    for (const [category, subMap] of catMap) {
      const subcategories: SubcategoryGroup[] = [];
      let catTotal = 0;
      for (const [subcategory, subItems] of subMap) {
        const subTotal = subItems.reduce((s, i) => s + i.amount, 0);
        catTotal += subTotal;
        subcategories.push({ subcategory, total: subTotal, items: subItems });
      }
      subcategories.sort((a, b) => b.total - a.total);
      result.push({ category, total: catTotal, subcategories });
    }
    result.sort((a, b) => b.total - a.total);
    return result;
  }, [items]);

  const toggleCategory = (cat: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const toggleSubcategory = (key: string) => {
    setExpandedSubcategories((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-500">
        No budget data available for this town.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm print-break-avoid">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="font-semibold text-gray-900">
          Budget Explorer — {town.name}
          {items.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              FY {items[0].fiscal_year}
            </span>
          )}
        </h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-2 text-left font-medium text-gray-700">
              Category
            </th>
            <th className="px-4 py-2 text-right font-medium text-gray-700">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {grouped.map((cat) => (
            <React.Fragment key={cat.category}>
              <tr
                className="cursor-pointer border-b border-gray-100 hover:bg-gray-50 print-break-avoid"
                onClick={() => toggleCategory(cat.category)}
              >
                <td className="px-4 py-2 font-medium text-gray-900">
                  <span className="mr-2 text-gray-400 no-print">
                    {expandedCategories.has(cat.category) ? "▼" : "▶"}
                  </span>
                  {cat.category}
                </td>
                <td className="px-4 py-2 text-right font-medium text-gray-900">
                  {formatMetric(cat.total, metric, town)}
                  {metric === "per_capita" && town.population > 0 && stateAvgs[cat.category] &&
                    formatDifference(cat.total / town.population, stateAvgs[cat.category])}
                </td>
              </tr>
              {/* Show subcategories when expanded OR when printing */}
              <tr data-print-expand className={expandedCategories.has(cat.category) ? "" : "hidden print:table-row"}>
                <td colSpan={2} className="p-0">
                  <table className="w-full">
                    <tbody>
                      {cat.subcategories.map((sub) => {
                        const subKey = `${cat.category}:${sub.subcategory}`;
                        return (
                          <React.Fragment key={subKey}>
                            <tr
                              className="cursor-pointer border-b border-gray-50 bg-gray-50 hover:bg-gray-100 print-break-avoid"
                              onClick={(e) => { e.stopPropagation(); toggleSubcategory(subKey); }}
                            >
                              <td className="py-2 pl-10 pr-4 font-medium text-gray-700">
                                <span className="mr-2 text-gray-400 no-print">
                                  {expandedSubcategories.has(subKey) ? "▼" : "▶"}
                                </span>
                                {sub.subcategory}
                              </td>
                              <td className="px-4 py-2 text-right text-gray-700">
                                {formatMetric(sub.total, metric, town)}
                                {metric === "per_capita" && town.population > 0 && stateAvgs[`${cat.category}|${sub.subcategory}`] &&
                                  formatDifference(sub.total / town.population, stateAvgs[`${cat.category}|${sub.subcategory}`])}
                              </td>
                            </tr>
                            {/* Show line items when expanded OR when printing */}
                            {sub.items.map((item) => (
                              <tr
                                key={item.id}
                                data-print-expand
                                className={`border-b border-gray-50 bg-white ${expandedSubcategories.has(subKey) ? "" : "hidden print:table-row"}`}
                              >
                                <td className="py-1.5 pl-16 pr-4 text-gray-600">
                                  {item.line_item}
                                </td>
                                <td className="px-4 py-1.5 text-right text-gray-600">
                                  {formatMetric(item.amount, metric, town)}
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
