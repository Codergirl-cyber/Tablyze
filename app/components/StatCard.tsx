import React from "react";

export default function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
      <div className="text-sm text-gray-600">{label}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-gray-500">{hint}</div> : null}
    </div>
  );
}

