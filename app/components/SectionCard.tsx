import React from "react";

export default function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border border-gray-200 rounded-xl shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            {subtitle ? (
              <p className="mt-0.5 text-sm text-gray-600">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

