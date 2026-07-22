"use client";

import React from "react";
import { motion } from "framer-motion";
import { fadeInUp } from "./AnimatedContainer";

export default function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <motion.div
      variants={fadeInUp}
      className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 sm:p-6"
      whileHover={{
        scale: 1.02,
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.08)",
        transition: { type: "spring", stiffness: 300, damping: 20 },
      }}
    >
      <div className="text-xs sm:text-sm text-gray-500 font-medium tracking-wide uppercase" data-stat-label>{label}</div>
      <div className="mt-1 text-xl sm:text-2xl font-bold text-gray-900 tracking-tight leading-tight" data-stat-value>
        {value}
      </div>
      {hint ? <div className="mt-1.5 text-xs text-gray-400">{hint}</div> : null}
    </motion.div>
  );
}


