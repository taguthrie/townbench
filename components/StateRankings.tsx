"use client";

import { useState, useEffect } from "react";
import { Town } from "@/types";

interface RankingEntry {
  metric: string;
  rank: number;
  total: number;
  value: number;
  stateAvg: number;
}

interface RankingsData {
  townId: string;
  state: string;
  metadataRankings: RankingEntry[];
  budgetRankings: RankingEntry[];
  categoryRankings: RankingEntry[];
}

interface StateRankingsProps {
  town: Town;
}

function formatValue(value: number, metric: string): string {
  if (metric === "Population") return Math.round(value).toLocaleString();
  if (metric === "Road Miles") return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
  if (metric === "Valuation") return `$${(value / 1_000_000).toFixed(1)}M`;
  if (metric === "Total Budget") return `$${Math.round(value).toLocaleString()}`;
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function PercentileBar({ rank, total }: { rank: number; total: number }) {
  const percentile = total > 1 ? ((total - rank) / (total - 1)) * 100 : 50;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-20 rounded-full bg-gray-200">
        <div
          className="h-2 rounded-full bg-blue-500"
          style={{ width: `${percentile}%` }}
        />
      </div>
      <span className="text-xs text-gray-400">{Math.round(percentile)}%</span>
    </div>
  );
}

function RankingRow({ entry }: { entry: RankingEntry }) {
  return (
    <tr className="border-b border-gray-50">
      <td className="py-1.5 pl-4 pr-2 text-sm text-gray-700">{entry.metric}</td>
      <td className="px-2 py-1.5 text-right text-sm text-gray-900">
        {formatValue(entry.value, entry.metric)}
      </td>
      <td className="px-2 py-1.5 text-right text-sm font-medium text-gray-900">
        #{entry.rank} <span className="font-normal text-gray-400">of {entry.total}</span>
      </td>
      <td className="px-2 py-1.5 text-right text-sm text-gray-500">
        {formatValue(entry.stateAvg, entry.metric)}
      </td>
      <td className="px-4 py-1.5">
        <PercentileBar rank={entry.rank} total={entry.total} />
      </td>
    </tr>
  );
}

function Section({
  title,
  entries,
  defaultOpen = true,
}: {
  title: string;
  entries: RankingEntry[];
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  if (entries.length === 0) return null;

  return (
    <div className="print-break-avoid">
      <button
        className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm font-semibold text-gray-700 hover:bg-gray-50"
        onClick={() => setOpen(!open)}
      >
        <span className="text-gray-400 no-print">{open ? "▼" : "▶"}</span>
        {title}
      </button>
      {/* Show table when open OR when printing */}
      <div data-print-expand className={open ? "" : "hidden print:block"}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-4 py-1.5 text-left text-xs font-medium text-gray-500">Metric</th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-500">Value</th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-500">Rank</th>
              <th className="px-2 py-1.5 text-right text-xs font-medium text-gray-500">State Avg</th>
              <th className="px-4 py-1.5 text-left text-xs font-medium text-gray-500">Percentile</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <RankingRow key={entry.metric} entry={entry} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function StateRankings({ town }: StateRankingsProps) {
  const [data, setData] = useState<RankingsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setData(null);

    fetch(`/api/rankings?town_id=${town.id}`)
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [town.id]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm print-break-avoid">
      <button
        className="flex w-full items-center justify-between border-b border-gray-200 px-4 py-3"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="font-semibold text-gray-900">
          State Rankings — {town.state}
        </h3>
        <span className="text-gray-400 no-print">{expanded ? "▼" : "▶"}</span>
      </button>

      {/* Show content when expanded OR when printing */}
      <div data-print-expand className={expanded ? "" : "hidden print:block"}>
        {loading && (
          <div className="px-4 py-6 text-center text-sm text-gray-500 no-print">
            Loading rankings...
          </div>
        )}
        {!loading && data && (
          <div className="divide-y divide-gray-100">
            <Section title="Town Metrics" entries={data.metadataRankings} />
            <Section title="Budget Overview" entries={data.budgetRankings} />
            <Section
              title="Category Breakdown (Per Capita)"
              entries={data.categoryRankings}
              defaultOpen={false}
            />
          </div>
        )}
        {!loading && !data && (
          <div className="px-4 py-6 text-center text-sm text-gray-500">
            Unable to load rankings.
          </div>
        )}
      </div>
    </div>
  );
}
