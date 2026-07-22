"use client";

import React from "react";
import { motion } from "framer-motion";
import { fadeInUp } from "./AnimatedContainer";
import SectionCard from "./SectionCard";

export default function AiSummaryCard({
  summary,
  error,
}: {
  summary?: string;
  error?: string | null;
}) {
  return (
    <motion.div variants={fadeInUp}>
      <SectionCard
        title={
          <div className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700 text-base">
              🤖
            </span>
            <span className="font-semibold">AI Dataset Summary</span>
          </div>
        }
        subtitle="AI-generated insights from your dataset"
      >
        {error ? (
          <div
            className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
            role="alert"
          >
            <div className="flex items-start gap-3">
              <svg className="h-5 w-5 mt-0.5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        ) : summary ? (
          <div
            className={`rounded-lg border p-4 text-sm leading-6 transition-all duration-200 ${
              summary === "AI summary unavailable."
                ? "bg-yellow-50 text-yellow-800 border-yellow-200"
                : "bg-white text-gray-700 border-gray-200"
            } whitespace-pre-wrap`}
          >
            {summary}
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-500 text-center">
            No AI summary is available yet. Upload a dataset to generate one.
          </div>
        )}
      </SectionCard>
    </motion.div>
  );
}
