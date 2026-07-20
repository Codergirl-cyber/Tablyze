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
      className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 sm:p-5"
      whileHover={{
        scale: 1.02,
        boxShadow: "0 8px 30px rgba(0, 0, 0, 0.08)",
        transition: { type: "spring", stiffness: 300, damping: 20 },
      }}
    >
      <div className="text-sm text-gray-600 font-medium">{label}</div>
      <div className="mt-1 text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight leading-tight">
        {value}
      </div>
      {hint ? <div className="mt-2 text-xs text-gray-500">{hint}</div> : null}
    </motion.div>
  );
}


