"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { fadeIn } from "./AnimatedContainer";
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

    entries.sort((a, b) => a.column.localeCompare(b.column));
    return entries;
  }, [missingValues]);

  const hasAny = data.some((d) => d.missing > 0);

  if (!data.length || !hasAny) {
    return (
      <div className="w-full h-[220px] sm:h-[320px] flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-4 text-sm text-gray-500">
        No missing values found.
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
        <BarChart data={data} margin={{ top: 10, right: 16, left: 0, bottom: 40 }}>
          <XAxis
            dataKey="column"
            interval={0}
            angle={-35}
            textAnchor="end"
            height={80}
          />
          <YAxis allowDecimals={false} />
          <Tooltip
            formatter={(value: unknown) => [`${value}`, "Missing"]}
            labelFormatter={(label: unknown) => String(label)}
          />
          <Bar dataKey="missing" name="Missing" fill="#111827" />
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  );
}







