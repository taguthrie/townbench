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

export default function TownSearch({
  towns,
  primaryTown,
  comparisonTowns,
  onSelectPrimary,
  onToggleComparison,
}: TownSearchProps) {
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<"" | "ME" | "NH">("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let result = towns;

    if (stateFilter) {
      result = result.filter((t) => t.state === stateFilter);
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
  }, [towns, search, stateFilter]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Reset page when filters change
  const handleSearch = (val: string) => {
    setSearch(val);
    setPage(1);
  };
  const handleStateFilter = (val: "" | "ME" | "NH") => {
    setStateFilter(val);
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
