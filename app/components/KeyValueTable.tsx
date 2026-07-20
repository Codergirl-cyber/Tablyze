"use client";

import React from "react";
import { motion } from "framer-motion";

type Row = Record<string, React.ReactNode>;

function toRenderable(value: unknown): React.ReactNode {
  if (value === null || value === undefined) return "—";
  if (typeof value === "number") return Number.isFinite(value) ? value : "—";
  if (typeof value === "string") return value;
  if (typeof value === "boolean") return value ? "true" : "false";
  // Handle pandas-like JSON objects (shouldn't happen, but keep dashboard resilient)
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.04,
      duration: 0.3,
      ease: "easeOut" as const,
    },
  }),
};

export default function KeyValueTable({
  rows,
}: {
  rows: Row[];
}) {
  if (!rows.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 text-center">
        No rows to display.
      </div>
    );
  }

  const headers = Array.from(
    rows.reduce<Set<string>>((acc, r) => {
      Object.keys(r).forEach((k) => acc.add(k));
      return acc;
    }, new Set<string>())
  );

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="text-left text-gray-600">
          {headers.map((h) => (
              <th
                key={h}
                scope="col"
                className="px-3 py-2 font-semibold border-b border-gray-100 bg-white sticky top-0 text-xs sm:text-sm text-gray-500 uppercase tracking-wide"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <motion.tr
              key={idx}
              custom={idx}
              variants={rowVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-10px" }}
              className={idx % 2 === 0 ? "border-b border-gray-50 bg-white" : "border-b border-gray-50 bg-gray-50"}
            >
              {headers.map((h) => (
                <td key={h} className="px-3 py-2 text-gray-900 whitespace-nowrap">
                  {toRenderable(r[h])}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


