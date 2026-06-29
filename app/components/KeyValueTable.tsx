import React from "react";

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

export default function KeyValueTable({
  rows,
}: {
  rows: Row[];
}) {
  if (!rows.length) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
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
                className="px-3 py-2 font-semibold border-b border-gray-100 bg-white sticky top-0"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr
              key={idx}
              className={idx % 2 === 0 ? "border-b border-gray-50 bg-white" : "border-b border-gray-50 bg-gray-50"}
            >
              {headers.map((h) => (
                <td key={h} className="px-3 py-2 text-gray-900 whitespace-nowrap">
                  {toRenderable(r[h])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}


