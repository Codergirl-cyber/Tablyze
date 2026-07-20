"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { fadeIn } from "./AnimatedContainer";
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

const COLORS = {
  other: "#94a3b8", // slate-400
  palette: [
    "#111827", // gray-900
    "#2563eb", // blue-600
    "#16a34a", // green-600
    "#f59e0b", // amber-500
    "#7c3aed", // violet-600
    "#0891b2", // cyan-600
    "#dc2626", // red-600
    "#4f46e5", // indigo-600
    "#059669", // emerald-600
    "#d97706", // amber-700
  ],
} as const;

function colorForKey(key: string, index: number) {
  if (key === "other") return COLORS.other;
  return COLORS.palette[index % COLORS.palette.length];
}


export default function DataTypesPieChart({ dtypes }: DtypesPieChartProps) {
  const data = useMemo(() => {
    const counts = new Map<string, number>();

    for (const [, dtype] of Object.entries(dtypes || {})) {
      const normalized = String(dtype ?? "");
      if (!normalized) continue;
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }

    const all = Array.from(counts.entries())
      .map(([key, value]) => ({ name: key, key, value }))
      .filter((d) => d.value > 0);

    const distinctTypes = all.length;

    const sorted = [...all].sort((a, b) => {
      if (b.value !== a.value) return b.value - a.value;
      return a.key.localeCompare(b.key);
    });

    if (distinctTypes <= 6) {
      return sorted;
    }

    const top = sorted.slice(0, 6);
    const rest = sorted.slice(6);
    const otherValue = rest.reduce((acc, d) => acc + d.value, 0);

    const result = top;
    if (otherValue > 0) {
      result.push({ name: "other", key: "other", value: otherValue });
    }
    return result;
  }, [dtypes]);

  const hasAny = data.reduce((acc, d) => acc + d.value, 0) > 0;

  if (!data.length || !hasAny) {
    return (
      <div className="h-[220px] sm:h-[320px] flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm text-gray-600">
        No data types available.
      </div>
    );
  }

  return (
    <motion.div
      className="w-full h-[220px] sm:h-[320px]"
      variants={fadeIn}
      initial="hidden"
      animate="visible"
    >
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
            {data.map((entry, idx) => (
              <Cell key={entry.key} fill={colorForKey(entry.key, idx)} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </motion.div>
  );
}


