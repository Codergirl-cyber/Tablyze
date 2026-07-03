import React from "react";

export default function Spinner({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      role="status"
      aria-label="Loading"
    />
  );
}
