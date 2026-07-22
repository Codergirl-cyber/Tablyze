import React from "react";

/**
 * Skeleton placeholder for chart containers.
 * Matches the exact h-[220px] sm:h-[320px] dimensions used by charts
 * and the same rounded-lg border styling of empty states.
 */
export default function ChartSkeleton() {
  return (
    <div className="w-full h-[220px] sm:h-[320px] flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 transition-opacity duration-200">
      <div className="flex flex-col items-center gap-3">
        {/* decorative chart icon */}
        <div className="flex items-end gap-1.5">
          <div className="animate-pulse w-6 sm:w-8 h-8 sm:h-10 rounded bg-gray-200 transition-opacity duration-200" />
          <div className="animate-pulse w-6 sm:w-8 h-12 sm:h-16 rounded bg-gray-200 transition-opacity duration-200" />
          <div className="animate-pulse w-6 sm:w-8 h-6 sm:h-8 rounded bg-gray-200 transition-opacity duration-200" />
          <div className="animate-pulse w-6 sm:w-8 h-14 sm:h-20 rounded bg-gray-200 transition-opacity duration-200" />
          <div className="animate-pulse w-6 sm:w-8 h-10 sm:h-12 rounded bg-gray-200 transition-opacity duration-200" />
        </div>
        <div className="animate-pulse rounded bg-gray-200 h-2.5 w-24 sm:w-28 transition-opacity duration-200" />
      </div>
    </div>
  );
}

