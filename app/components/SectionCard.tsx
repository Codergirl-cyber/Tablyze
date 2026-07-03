import React from "react";

export default function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-gray-200 rounded-2xl shadow-sm">
      <div className="px-4 sm:px-5 py-3 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 leading-tight">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-sm text-gray-600 leading-snug">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}


