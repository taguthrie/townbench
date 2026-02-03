"use client";

import { useState, useMemo } from "react";
import { Town } from "@/types";

interface TownSearchProps {
  towns: Town[];
  primaryTown: Town | null;
  comparisonTowns: Town[];
  onSelectPrimary: (town: Town) => void;
  onToggleComparison: (town: Town) => void;
}

const PAGE_SIZE = 50;

const SIZE_RANGES = [
  { label: "All Sizes", value: "", min: 0, max: Infinity },
  { label: "0-5K", value: "0-5k", min: 0, max: 5000 },
  { label: "5K-10K", value: "5k-10k", min: 5000, max: 10000 },
  { label: "10K-15K", value: "10k-15k", min: 10000, max: 15000 },
  { label: "15K-25K", value: "15k-25k", min: 15000, max: 25000 },
  { label: "25K-40K", value: "25k-40k", min: 25000, max: 40000 },
  { label: "40K-100K", value: "40k-100k", min: 40000, max: 100000 },
];

export default function TownSearch({
  towns,
  primaryTown,
  comparisonTowns,
  onSelectPrimary,
  onToggleComparison,
}: TownSearchProps) {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<"" | "ME" | "NH">("");
  const [countyFilter, setCountyFilter] = useState("");
  const [sizeFilter, setSizeFilter] = useState("");
  const [page, setPage] = useState(1);

  // Extract unique counties grouped by state
  const countiesByState = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const t of towns) {
      if (t.county) {
        if (!map.has(t.state)) map.set(t.state, new Set());
        map.get(t.state)!.add(t.county);
      }
    }
    const result: { state: string; counties: string[] }[] = [];
    for (const [state, counties] of map) {
      result.push({ state, counties: Array.from(counties).sort() });
    }
    result.sort((a, b) => a.state.localeCompare(b.state));
    return result;
  }, [towns]);

  const filtered = useMemo(() => {
    let result = towns;

    if (stateFilter) {
      result = result.filter((t) => t.state === stateFilter);
    }

    if (countyFilter) {
      result = result.filter((t) => t.county === countyFilter);
    }

    if (sizeFilter) {
      const range = SIZE_RANGES.find((r) => r.value === sizeFilter);
      if (range) {
        result = result.filter(
          (t) => t.population >= range.min && t.population < range.max
        );
      }
    }

    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(lower) ||
          t.state.toLowerCase().includes(lower) ||
          (t.county && t.county.toLowerCase().includes(lower))
      );
    }

    return result;
  }, [towns, search, stateFilter, countyFilter, sizeFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };
  const handleStateFilter = (val: "" | "ME" | "NH") => {
    setStateFilter(val);
    setCountyFilter(""); // Reset county when state changes
    setPage(1);
  };
  const handleCountyFilter = (val: string) => {
    setCountyFilter(val);
    setPage(1);
  };
  const handleSizeFilter = (val: string) => {
    setSizeFilter(val);
    setPage(1);
  };

  const isComparison = (town: Town) =>
    comparisonTowns.some((c) => c.id === town.id);

  return (
    <div className="flex h-full flex-col border-r border-gray-200 bg-gray-50">
      <div className="border-b border-gray-200 p-4">
        <h2 className="mb-2 text-lg font-semibold text-gray-900">Towns</h2>
        <input
          type="text"
          placeholder="Search towns..."
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {/* County filter dropdown */}
        <select
          value={countyFilter}
          onChange={(e) => handleCountyFilter(e.target.value)}
          className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Counties</option>
          {countiesByState
            .filter((g) => !stateFilter || g.state === stateFilter)
            .map((g) => (
              <optgroup key={g.state} label={g.state}>
                {g.counties.map((county) => (
                  <option key={`${g.state}-${county}`} value={county}>
                    {county}
                  </option>
                ))}
              </optgroup>
            ))}
        </select>
        {/* Size filter dropdown */}
        <select
          value={sizeFilter}
          onChange={(e) => handleSizeFilter(e.target.value)}
          className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {SIZE_RANGES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <div className="flex gap-1">
          {(["", "ME", "NH"] as const).map((s) => (
            <button
              key={s}
              onClick={() => handleStateFilter(s)}
              className={`rounded px-3 py-1 text-xs font-medium ${
                stateFilter === s
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-600 hover:bg-gray-300"
              }`}
            >
              {s || "All"}
            </button>
          ))}
          <span className="ml-auto self-center text-xs text-gray-400">
            {filtered.length} towns
          </span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {paged.map((town) => (
          <div
            key={town.id}
            className={`border-b border-gray-100 px-4 py-3 ${
              primaryTown?.id === town.id
                ? "bg-blue-50 border-l-4 border-l-blue-500"
                : isComparison(town)
                ? "bg-green-50 border-l-4 border-l-green-500"
                : "hover:bg-gray-100"
            }`}
          >
            <div className="flex items-center justify-between">
              <button
                onClick={() => onSelectPrimary(town)}
                className="text-left"
              >
                <div className="font-medium text-gray-900">{town.name}</div>
                <div className="text-xs text-gray-500">
                  {town.state}
                  {town.county ? ` · ${town.county}` : ""}
                  {" · Pop. "}
                  {town.population.toLocaleString()}
                </div>
              </button>
              {primaryTown?.id !== town.id && (
                <button
                  onClick={() => onToggleComparison(town)}
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    isComparison(town)
                      ? "bg-green-100 text-green-700"
                      : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                >
                  {isComparison(town) ? "✓ Compare" : "+ Compare"}
                </button>
              )}
            </div>
          </div>
        ))}
        {paged.length === 0 && (
          <div className="p-4 text-center text-sm text-gray-500">
            No towns found
          </div>
        )}
      </div>
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 px-4 py-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-xs text-gray-500">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
