"use client";

import React from "react";
import { motion } from "framer-motion";
import { fadeInUp } from "./AnimatedContainer";

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
    <motion.section
      variants={fadeInUp}
      className="bg-white border border-gray-200 rounded-xl shadow-sm"
      whileHover={{
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.1)",
        transition: { type: "spring", stiffness: 300, damping: 20 },
      }}
    >
      <div className="px-5 sm:px-6 py-4 border-b border-gray-100">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-gray-900 leading-tight">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 text-xs sm:text-sm text-gray-500 leading-snug">{subtitle}</p>
            ) : null}
          </div>
        </div>
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </motion.section>
  );
}


