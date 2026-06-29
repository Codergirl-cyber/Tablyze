"use client";

import React, { useMemo } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

type MissingValuesDatum = {
  column: string;
  missing: number;
};

export default function MissingValuesBarChart({
  missingValues,
}: {
  missingValues: Record<string, number>;
}) {
  const data: MissingValuesDatum[] = useMemo(() => {
    const entries = Object.entries(missingValues || {}).map(([column, missing]) => ({
      column,
      missing: Number(missing) || 0,
    }));

    // Keep a stable order; backend typically returns dict order but ensure deterministic UI.
    entries.sort((a, b) => a.column.localeCompare(b.column));
    return entries;
  }, [missingValues]);

  return (
    <div className="w-full h-[320px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 40 }}>
          <XAxis dataKey="column" interval={0} angle={-35} textAnchor="end" height={80} />
          <YAxis allowDecimals={false} />
          <Tooltip
            formatter={(value: unknown) => [`${value}`, "Missing"]}
            labelFormatter={(label: unknown) => String(label)}
          />
          <Bar dataKey="missing" name="Missing" fill="#111827" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

