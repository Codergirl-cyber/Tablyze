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
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        ) : summary ? (
          <div
            className={`rounded-2xl border border-gray-200 p-4 text-sm leading-6 ${
              summary === "AI summary unavailable."
                ? "bg-yellow-50 text-yellow-800 border-yellow-200"
                : "bg-white text-gray-700"
            } whitespace-pre-wrap`}
          >
            {summary}
          </div>
        ) : (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
            No AI summary is available yet. Upload a dataset to generate one.
          </div>
        )}
      </SectionCard>
    </motion.div>
  );
}
