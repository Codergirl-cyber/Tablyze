"use client";

import React from "react";
import { FadeInUp } from "./AnimatedContainer";
import OnboardingIllustration from "./OnboardingIllustration";

// ---------------------------------------------------------------------------
// Feature data
// ---------------------------------------------------------------------------
interface Feature {
  label: string;
  description: string;
  /** SVG path (simple icon) */
  iconPath: string;
}

const features: Feature[] = [
  {
    label: "Missing Values",
    description: "Detect nulls and gaps at a glance",
    iconPath:
      "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z",
  },
  {
    label: "Data Types",
    description: "See distributions of numeric, text, and more",
    iconPath:
      "M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75",
  },
  {
    label: "Correlation Heatmap",
    description: "Spot relationships between numeric features",
    iconPath:
      "M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605",
  },
  {
    label: "AI Summary",
    description: "Get automatic insights powered by AI",
    iconPath:
      "M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z",
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface OnboardingSectionProps {
  /** Called when the user clicks "Try sample.csv" */
  onLoadSample: () => void;
}

export default function OnboardingSection({
  onLoadSample,
}: OnboardingSectionProps) {
  return (
    <FadeInUp>
      <div className="mt-8 rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Top section: illustration + headline */}
        <div className="px-6 sm:px-8 pt-8 sm:pt-10 pb-6 flex flex-col sm:flex-row items-center gap-6 sm:gap-10">
          {/* Illustration */}
          <div className="shrink-0">
            <OnboardingIllustration />
          </div>

          {/* Headline + description */}
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Analyze your dataset in seconds
            </h2>
            <p className="mt-2 text-sm sm:text-base text-gray-600 leading-relaxed max-w-lg">
              Upload a CSV file and instantly get a complete profile of your
              data — missing values, data types, correlations, summary
              statistics, and AI-generated insights.
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Feature grid */}
        <div className="px-6 sm:px-8 py-6 sm:py-7">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
            {features.map((feature) => (
              <div key={feature.label} className="flex items-start gap-3">
                {/* Icon */}
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.8}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d={feature.iconPath}
                    />
                  </svg>
                </div>
                {/* Text */}
                <div className="min-w-0">
                  <span className="text-sm font-semibold text-gray-900">
                    {feature.label}
                  </span>
                  <p className="text-xs sm:text-sm text-gray-500 leading-snug mt-0.5">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-100" />

        {/* Bottom CTA section */}
        <div className="px-6 sm:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50/80">
          <p className="text-sm text-gray-600">
            Don&apos;t have a CSV handy? Try the sample dataset.
          </p>
          <button
            type="button"
            onClick={onLoadSample}
            className="
              inline-flex items-center gap-2 px-5 py-2.5
              rounded-xl text-sm font-semibold
              bg-gray-900 text-white shadow-sm
              hover:bg-gray-800 active:bg-gray-900 active:scale-[0.98]
              transition-all duration-200 ease-in-out
              focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2
            "
          >
            {/* CSV icon */}
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
            Try sample.csv
            {/* Arrow icon */}
            <svg
              className="h-3.5 w-3.5 -ml-0.5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
              />
            </svg>
          </button>
        </div>
      </div>
    </FadeInUp>
  );
}

