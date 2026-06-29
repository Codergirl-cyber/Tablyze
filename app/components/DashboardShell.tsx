import React from "react";

export default function DashboardShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{title}</h1>
        {subtitle ? (
          <p className="mt-1 text-sm sm:text-base text-gray-600">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}

