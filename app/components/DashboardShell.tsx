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
    <div className="w-full">
      <div className="mb-6 sm:mb-8">
        <div className="flex items-baseline justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
            {title}
          </h1>
        </div>
        {subtitle ? (
          <p className="mt-1 text-sm sm:text-base text-gray-600 leading-snug">
            {subtitle}
          </p>
        ) : null}
      </div>
      {children}
    </div>
  );
}


