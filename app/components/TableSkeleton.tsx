import React from "react";

/**
 * Skeleton placeholder for KeyValueTable.
 * Renders a header row + 3 data rows with pulsing bars,
 * matching the table's overflow-x-auto wrapper.
 */
export default function TableSkeleton({
  rows = 3,
  columns = 3,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="min-w-full text-sm">
        {/* header */}
        <div className="flex border-b border-gray-100 bg-white">
          {Array.from({ length: columns }).map((_, i) => (
            <div key={i} className="flex-1 px-3 py-2">
              <div className="animate-pulse rounded bg-gray-200 h-3 w-16 sm:w-20" />
            </div>
          ))}
        </div>
        {/* rows */}
        {Array.from({ length: rows }).map((_, ri) => (
          <div
            key={ri}
            className={`flex border-b border-gray-50 ${
              ri % 2 === 0 ? "bg-white" : "bg-gray-50"
            }`}
          >
            {Array.from({ length: columns }).map((_, ci) => (
              <div key={ci} className="flex-1 px-3 py-2">
                <div
                  className={`animate-pulse rounded bg-gray-200 h-3 ${
                    ci === 0 ? "w-20 sm:w-24" : "w-12 sm:w-16"
                  }`}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

