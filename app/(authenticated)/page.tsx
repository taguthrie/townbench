"use client";

import { useState, useEffect, useCallback } from "react";
import { Town, BudgetLineItem, MetricType } from "@/types";
import TownSearch from "@/components/TownSearch";
import TownInfoCard from "@/components/TownInfoCard";
import BudgetExplorer from "@/components/BudgetExplorer";
import ComparisonTable from "@/components/ComparisonTable";
import MetricSelector from "@/components/MetricSelector";
import StateRankings from "@/components/StateRankings";

export default function Home() {
  const [towns, setTowns] = useState<Town[]>([]);
  const [primaryTown, setPrimaryTown] = useState<Town | null>(null);
  const [comparisonTowns, setComparisonTowns] = useState<Town[]>([]);
  const [budgetData, setBudgetData] = useState<Record<string, BudgetLineItem[]>>({});
  const [metric, setMetric] = useState<MetricType>("absolute");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAllTowns() {
      try {
        const allTowns: Town[] = [];
        let page = 1;
        let total = Infinity;

        while (allTowns.length < total) {
          const res = await fetch(`/api/towns?page=${page}&limit=200`);
          const json = await res.json();

          if (json.data && Array.isArray(json.data)) {
            allTowns.push(...json.data);
            total = json.total;
          } else if (Array.isArray(json)) {
            // Fallback for old API format
            allTowns.push(...json);
            break;
          } else {
            break;
          }

          page++;
        }

        setTowns(allTowns);
        if (allTowns.length > 0) setPrimaryTown(allTowns[0]);
      } catch {
        // Failed to load towns
      }
      setLoading(false);
    }

    loadAllTowns();
  }, []);

  const fetchBudget = useCallback(async (townId: string) => {
    if (budgetData[townId]) return;
    try {
      const response = await fetch(`/api/budget?town_id=${townId}`);
      const data = await response.json();
      if (Array.isArray(data)) {
        setBudgetData((prev) => ({ ...prev, [townId]: data }));
      }
    } catch {
      // Budget data not available yet
    }
  }, [budgetData]);

  useEffect(() => {
    if (primaryTown) fetchBudget(primaryTown.id);
    for (const town of comparisonTowns) {
      fetchBudget(town.id);
    }
  }, [primaryTown, comparisonTowns, fetchBudget]);

  const handleSelectPrimary = (town: Town) => {
    if (primaryTown?.id === town.id) {
      setPrimaryTown(null);
      return;
    }
    setComparisonTowns((prev) => prev.filter((t) => t.id !== town.id));
    setPrimaryTown(town);
  };

  const handleToggleComparison = (town: Town) => {
    setComparisonTowns((prev) => {
      const exists = prev.some((t) => t.id === town.id);
      if (exists) return prev.filter((t) => t.id !== town.id);
      return [...prev, town];
    });
  };

  const handleExportCsv = () => {
    const townIds = [
      primaryTown?.id,
      ...comparisonTowns.map((t) => t.id),
    ].filter(Boolean);
    if (townIds.length === 0) return;
    window.open(`/api/export?town_ids=${townIds.join(",")}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-gray-500">Loading towns...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0">
        <TownSearch
          towns={towns}
          primaryTown={primaryTown}
          comparisonTowns={comparisonTowns}
          onSelectPrimary={handleSelectPrimary}
          onToggleComparison={handleToggleComparison}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="border-b border-gray-200 bg-white px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">TownBench</h1>
              <p className="text-sm text-gray-500">
                Municipal Budget Benchmarking
              </p>
            </div>
            <div className="flex items-center gap-4">
              <MetricSelector value={metric} onChange={setMetric} />
              <button
                onClick={handleExportCsv}
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Export CSV
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {primaryTown && (
            <>
              <TownInfoCard
                town={primaryTown}
                budgetItems={budgetData[primaryTown.id] || []}
              />
              <StateRankings town={primaryTown} />
              <BudgetExplorer
                town={primaryTown}
                items={budgetData[primaryTown.id] || []}
                metric={metric}
              />
              <ComparisonTable
                primaryTown={primaryTown}
                comparisonTowns={comparisonTowns}
                budgetData={budgetData}
                metric={metric}
              />
            </>
          )}

          {!primaryTown && (
            <div className="py-20 text-center text-gray-500">
              Select a town from the sidebar to get started.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
