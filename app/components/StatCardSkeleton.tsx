import React from "react";

/**
 * A skeleton placeholder that perfectly mirrors StatCard's outer dimensions
 * and inner spacing, preventing layout shifts while data is loading.
 */
export default function StatCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 sm:p-5">
      {/* label */}
      <div className="animate-pulse rounded bg-gray-200 h-3 w-20 sm:w-24" />
      {/* value */}
      <div className="mt-3 animate-pulse rounded bg-gray-200 h-7 w-16 sm:w-20" />
      {/* hint */}
      <div className="mt-2 animate-pulse rounded bg-gray-200 h-2.5 w-28 sm:w-32" />
    </div>
  );
}

