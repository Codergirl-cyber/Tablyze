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
    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-5">
      <div className="text-sm text-gray-600 font-medium">{label}</div>
      <div className="mt-1 text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight leading-tight">
        {value}
      </div>
      {hint ? <div className="mt-2 text-xs text-gray-500">{hint}</div> : null}
    </div>
  );
}


