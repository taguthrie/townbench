"use client";

import { useMemo } from "react";
import { Town, BudgetLineItem, MetricType } from "@/types";

interface ComparisonTableProps {
  primaryTown: Town;
  comparisonTowns: Town[];
  budgetData: Record<string, BudgetLineItem[]>; // townId -> items
  metric: MetricType;
}

function computeMetric(
  amount: number,
  metric: MetricType,
  town: Town
): number {
  switch (metric) {
    case "per_capita":
      return town.population > 0 ? amount / town.population : 0;
    case "per_road_mile":
      return town.road_miles > 0 ? amount / town.road_miles : 0;
    case "per_valuation":
      return town.grand_list_valuation > 0
        ? (amount / town.grand_list_valuation) * 1000
        : 0;
    default:
      return amount;
  }
}

export default function ComparisonTable({
  primaryTown,
  comparisonTowns,
  budgetData,
  metric,
}: ComparisonTableProps) {
  const allTowns = [primaryTown, ...comparisonTowns];

  const categories = useMemo(() => {
    const catSet = new Set<string>();
    for (const items of Object.values(budgetData)) {
      for (const item of items) {
        catSet.add(item.category);
      }
    }
    return Array.from(catSet).sort();
  }, [budgetData]);

  const totals = useMemo(() => {
    const result: Record<string, Record<string, number>> = {};
    for (const town of allTowns) {
      result[town.id] = {};
      const items = budgetData[town.id] || [];
      let grandTotal = 0;
      for (const cat of categories) {
        const catTotal = items
          .filter((i) => i.category === cat)
          .reduce((s, i) => s + i.amount, 0);
        result[town.id][cat] = catTotal;
        grandTotal += catTotal;
      }
      result[town.id]["__total__"] = grandTotal;
    }
    return result;
  }, [allTowns, budgetData, categories]);

  const formatVal = (amount: number, town: Town) => {
    const val = computeMetric(amount, metric, town);
    return `$${val.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const getRank = (townId: string, category: string) => {
    const vals = allTowns.map((t) => ({
      id: t.id,
      val: computeMetric(totals[t.id]?.[category] || 0, metric, t),
    }));
    vals.sort((a, b) => a.val - b.val);
    const idx = vals.findIndex((v) => v.id === townId);
    return idx + 1;
  };

  if (comparisonTowns.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-gray-500">
        Select comparison towns from the sidebar to see a side-by-side view.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm overflow-x-auto">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="font-semibold text-gray-900">Town Comparison</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 bg-gray-50">
            <th className="px-4 py-2 text-left font-medium text-gray-700">
              Category
            </th>
            {allTowns.map((town) => (
              <th
                key={town.id}
                className={`px-4 py-2 text-right font-medium ${
                  town.id === primaryTown.id
                    ? "text-blue-700 bg-blue-50"
                    : "text-gray-700"
                }`}
              >
                {town.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {categories.map((cat) => (
            <tr key={cat} className="border-b border-gray-100 hover:bg-gray-50">
              <td className="px-4 py-2 font-medium text-gray-900">{cat}</td>
              {allTowns.map((town) => {
                const rank = getRank(town.id, cat);
                return (
                  <td
                    key={town.id}
                    className={`px-4 py-2 text-right ${
                      town.id === primaryTown.id ? "bg-blue-50" : ""
                    }`}
                  >
                    <span className="text-gray-900">
                      {formatVal(totals[town.id]?.[cat] || 0, town)}
                    </span>
                    <span
                      className={`ml-1.5 text-xs ${
                        rank === 1
                          ? "text-green-600"
                          : rank === allTowns.length
                          ? "text-red-600"
                          : "text-gray-400"
                      }`}
                    >
                      #{rank}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
          <tr className="border-t-2 border-gray-300 bg-gray-50 font-semibold">
            <td className="px-4 py-2 text-gray-900">Total</td>
            {allTowns.map((town) => (
              <td
                key={town.id}
                className={`px-4 py-2 text-right text-gray-900 ${
                  town.id === primaryTown.id ? "bg-blue-50" : ""
                }`}
              >
                {formatVal(totals[town.id]?.["__total__"] || 0, town)}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
