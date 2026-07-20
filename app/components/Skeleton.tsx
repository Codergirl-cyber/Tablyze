import React from "react";

/**
 * A thin, reusable bar with rounded corners and animate-pulse.
 * Use for lines of text, values, labels, etc.
 */
export function SkeletonBar({
  width = "100%",
  height = "14px",
  className = "",
}: {
  width?: string;
  height?: string;
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-md bg-gray-200 ${className}`}
      style={{ width, height }}
    />
  );
}

/**
 * A circular skeleton placeholder.
 */
export function SkeletonCircle({
  size = "32px",
  className = "",
}: {
  size?: string;
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-full bg-gray-200 ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * A block-level skeleton placeholder for larger areas (charts, images).
 */
export function SkeletonBlock({
  height = "220px",
  className = "",
}: {
  height?: string;
  className?: string;
}) {
  return (
    <div
      className={`animate-pulse rounded-xl bg-gray-200 ${className}`}
      style={{ width: "100%", height }}
    />
  );
}

/**
 * A set of stacked skeleton lines (like a paragraph placeholder).
 */
export function SkeletonText({
  lines = 3,
  className = "",
}: {
  lines?: number;
  className?: string;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBar
          key={i}
          width={i === lines - 1 ? "60%" : "100%"}
          height="12px"
        />
      ))}
    </div>
  );
}

