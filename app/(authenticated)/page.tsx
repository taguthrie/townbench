"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Town, BudgetLineItem, MetricType } from "@/types";
import TownSearch from "@/components/TownSearch";
import TownInfoCard from "@/components/TownInfoCard";
import BudgetExplorer from "@/components/BudgetExplorer";
import ComparisonTable from "@/components/ComparisonTable";
import MetricSelector from "@/components/MetricSelector";
import StateRankings from "@/components/StateRankings";
import PrintableView from "@/components/PrintableView";

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

  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleExportCsv = () => {
    const townIds = [
      primaryTown?.id,
      ...comparisonTowns.map((t) => t.id),
    ].filter(Boolean);
    if (townIds.length === 0) return;
    window.open(`/api/export?town_ids=${townIds.join(",")}`, "_blank");
    setExportMenuOpen(false);
  };

  const handleExportComprehensiveCsv = () => {
    const townIds = [
      primaryTown?.id,
      ...comparisonTowns.map((t) => t.id),
    ].filter(Boolean);
    if (townIds.length === 0) return;
    window.open(`/api/export/comprehensive?town_ids=${townIds.join(",")}&metric=${metric}`, "_blank");
    setExportMenuOpen(false);
  };

  const handlePrint = () => {
    setExportMenuOpen(false);
    setIsPrinting(true);
    // Allow React to render PrintableView before printing
    setTimeout(() => {
      window.print();
      setIsPrinting(false);
    }, 100);
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
      {/* Print-only header */}
      {isPrinting && primaryTown && (
        <PrintableView
          town={primaryTown}
          comparisonTowns={comparisonTowns}
          metric={metric}
        />
      )}

      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 no-print">
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
              <div className="relative" ref={exportMenuRef}>
                <button
                  onClick={() => setExportMenuOpen(!exportMenuOpen)}
                  className="flex items-center gap-2 rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export
                  <svg className={`h-4 w-4 transition-transform ${exportMenuOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {exportMenuOpen && (
                  <div className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                    <div className="py-1">
                      <button
                        onClick={handleExportComprehensiveCsv}
                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export CSV (Detailed)
                      </button>
                      <button
                        onClick={handleExportCsv}
                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Export CSV (Simple)
                      </button>
                      <hr className="my-1" />
                      <button
                        onClick={handlePrint}
                        className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        Print / PDF
                      </button>
                    </div>
                  </div>
                )}
              </div>
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
