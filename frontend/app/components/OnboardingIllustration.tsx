"use client";

import React from "react";

/**
 * OnboardingIllustration — A clean, minimal SVG illustration depicting
 * data-analysis concepts (bar chart, pie chart, document) for the
 * onboarding empty state.
 */
export default function OnboardingIllustration() {
  return (
    <svg
      width="280"
      height="200"
      viewBox="0 0 280 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="select-none"
    >
      {/* ---- Document / CSV backdrop ---- */}
      <rect
        x="100"
        y="24"
        width="120"
        height="156"
        rx="10"
        className="fill-gray-100 stroke-gray-200"
        strokeWidth="1.5"
      />
      {/* Document top accent line */}
      <rect
        x="115"
        y="40"
        width="60"
        height="6"
        rx="3"
        className="fill-gray-200"
      />
      {/* Document second line */}
      <rect
        x="115"
        y="54"
        width="40"
        height="5"
        rx="2.5"
        className="fill-gray-200"
      />

      {/* ---- Bar chart (left side on document) ---- */}
      <g transform="translate(115, 80)">
        {/* Bars */}
        <rect x="0" y="32" width="16" height="40" rx="2" className="fill-gray-900/80" />
        <rect x="22" y="14" width="16" height="58" rx="2" className="fill-gray-900/60" />
        <rect x="44" y="24" width="16" height="48" rx="2" className="fill-gray-900/80" />
        <rect x="66" y="6" width="16" height="66" rx="2" className="fill-gray-900" />
        {/* Baseline */}
        <line
          x1="0"
          y1="74"
          x2="84"
          y2="74"
          className="stroke-gray-300"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </g>

      {/* ---- Pie chart (right side on document) ---- */}
      <g transform="translate(170, 100)">
        {/* Outer circle */}
        <circle
          cx="24"
          cy="24"
          r="24"
          className="fill-none stroke-gray-200"
          strokeWidth="2"
        />
        {/* Pie segments */}
        <path
          d="M24 0 A24 24 0 0 1 46.4 38.4 L24 24 Z"
          className="fill-gray-900"
        />
        <path
          d="M46.4 38.4 A24 24 0 0 1 5.6 38.4 L24 24 Z"
          className="fill-gray-900/60"
        />
        <path
          d="M5.6 38.4 A24 24 0 0 1 24 0 L24 24 Z"
          className="fill-gray-300"
        />
        {/* Center dot */}
        <circle cx="24" cy="24" r="4" className="fill-white" />
      </g>

      {/* ---- Small decorative dots (data points) ---- */}
      <circle cx="60" cy="50" r="2.5" className="fill-gray-300" />
      <circle cx="220" cy="38" r="2" className="fill-gray-300" />
      <circle cx="230" cy="62" r="1.5" className="fill-gray-300" />
      <circle cx="50" cy="78" r="1.5" className="fill-gray-300" />
      <circle cx="55" cy="160" r="2" className="fill-gray-300" />
      <circle cx="225" cy="170" r="2.5" className="fill-gray-300" />
    </svg>
  );
}

