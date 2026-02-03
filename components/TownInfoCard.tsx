"use client";

import { Town, BudgetLineItem } from "@/types";

interface TownInfoCardProps {
  town: Town;
  budgetItems: BudgetLineItem[];
}

export default function TownInfoCard({ town, budgetItems }: TownInfoCardProps) {
  const totalBudget = budgetItems.reduce((sum, item) => sum + item.amount, 0);
  const hasBudget = budgetItems.length > 0;
  const budgetYear = hasBudget ? budgetItems[0].fiscal_year : null;

  const educationTotal = budgetItems
    .filter((item) => item.category === "Education")
    .reduce((sum, item) => sum + item.amount, 0);

  const debtTotal = budgetItems
    .filter((item) => item.category === "Debt Service")
    .reduce((sum, item) => sum + item.amount, 0);

  const yearLabel = (year?: number) => (year ? ` (${year})` : "");

  const stats = [
    { label: `Population${yearLabel(town.population_year)}`, value: town.population.toLocaleString() },
    { label: `Road Miles${yearLabel(town.road_miles_year)}`, value: town.road_miles.toLocaleString() },
    {
      label: `Grand List${yearLabel(town.valuation_year)}`,
      value: `$${(town.grand_list_valuation / 1_000_000).toFixed(1)}M`,
    },
    { label: `Total Budget${yearLabel(budgetYear ?? undefined)}`, value: hasBudget ? `$${totalBudget.toLocaleString()}` : "—" },
    {
      label: "Per Capita",
      value:
        hasBudget && town.population > 0
          ? `$${(totalBudget / town.population).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
          : "—",
    },
    { label: "Fiscal Year", value: town.fiscal_year.toString() },
    {
      label: "Education/Capita",
      value:
        hasBudget && educationTotal > 0 && town.population > 0
          ? `$${Math.round(educationTotal / town.population).toLocaleString()}`
          : "—",
    },
    {
      label: "Debt/Capita",
      value:
        hasBudget && debtTotal > 0 && town.population > 0
          ? `$${Math.round(debtTotal / town.population).toLocaleString()}`
          : "—",
    },
  ];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{town.name}</h3>
          <p className="text-sm text-gray-500">
            {town.state}
            {town.county ? ` · ${town.county} County` : ""}
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            hasBudget
              ? "bg-green-100 text-green-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {hasBudget ? "Budget data" : "Metadata only"}
        </span>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div key={stat.label}>
            <div className="text-xs text-gray-500">{stat.label}</div>
            <div className="text-sm font-medium text-gray-900">
              {stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
