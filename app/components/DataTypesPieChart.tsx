"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

type DtypesPieChartProps = {
  dtypes: Record<string, string>;
};

type Bucket = {
  key: string;
  label: string;
  match: (dtype: string) => boolean;
};

const BUCKETS: Bucket[] = [
  {
    key: "object",
    label: "object",
    match: (dtype) => /object/i.test(dtype),
  },
  {
    key: "int64",
    label: "int64",
    match: (dtype) => /int/i.test(dtype) && !/float/i.test(dtype),
  },
  {
    key: "float64",
    label: "float64",
    match: (dtype) => /float/i.test(dtype),
  },
  {
    key: "bool",
    label: "bool",
    match: (dtype) => /bool/i.test(dtype),
  },
  {
    key: "datetime64",
    label: "datetime64",
    match: (dtype) => /datetime/i.test(dtype),
  },
];

function bucketForDtype(dtype: string): string {
  const d = String(dtype ?? "");
  for (const b of BUCKETS) {
    if (b.match(d)) return b.key;
  }
  return "other";
}

const COLORS: Record<string, string> = {
  object: "#111827", // gray-900
  int64: "#2563eb", // blue-600
  float64: "#16a34a", // green-600
  bool: "#f59e0b", // amber-500
  datetime64: "#7c3aed", // violet-600
  other: "#94a3b8", // slate-400
};

export default function DataTypesPieChart({ dtypes }: DtypesPieChartProps) {
  const data = useMemo(() => {
    const counts = new Map<string, number>();

    for (const [, dtype] of Object.entries(dtypes || {})) {
      const bucket = bucketForDtype(dtype);
      counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
    }

    const order = [...BUCKETS.map((b) => b.key), "other"];
    return order
      .map((key) => {
        const label = BUCKETS.find((b) => b.key === key)?.label ?? "other";
        return {
          name: label,
          key,
          value: counts.get(key) ?? 0,
        };
      })
      .filter((d) => d.value > 0);
  }, [dtypes]);

  return (
    <div className="w-full h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip
            formatter={(value: unknown, name: unknown) => {
              return [`${value}`, String(name)];
            }}
          />
          <Legend />
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius="85%"
            innerRadius="45%"
            paddingAngle={2}
            label={(entry) => {
              const v = entry?.value ?? 0;
              if (typeof v !== "number" || v <= 0) return "";
              return `${entry.name}: ${v}`;
            }}
          >
            {data.map((entry) => (
              <Cell
                key={entry.key}
                fill={COLORS[entry.key] ?? COLORS.other}
              />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

