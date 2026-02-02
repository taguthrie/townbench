"use client";

import { MetricType } from "@/types";
import { METRIC_LABELS } from "@/lib/taxonomy";

interface MetricSelectorProps {
  value: MetricType;
  onChange: (metric: MetricType) => void;
}

export default function MetricSelector({ value, onChange }: MetricSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-sm font-medium text-gray-700">Metric:</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as MetricType)}
        className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      >
        {Object.entries(METRIC_LABELS).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
    </div>
  );
}
