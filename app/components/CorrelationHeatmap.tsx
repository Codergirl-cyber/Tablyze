"use client";

import React, { useMemo } from "react";

type CorrelationMatrix = Record<string, Record<string, number>>;

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function rgbToCss(r: number, g: number, b: number) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

// Creates a diverging palette:
// - strong negative -> darker red
// - near zero -> very light neutral
// - strong positive -> darker blue
function correlationToColor(v: number) {
  // Normalize from [-1, 1] into [0, 1]
  const t = clamp((v + 1) / 2, 0, 1);

  // We want light neutral around 0. Use a piecewise mapping.
  // Define: blue side goes to dark, red side goes to dark, center stays light.
  const center = 0.5;
  const spread = 0.5;
  const distFromCenter = Math.abs(t - center) / spread; // 0..1

  // Neutral light color
  const neutral = { r: 248, g: 250, b: 252 }; // very light slate-ish

  if (t === center) {
    return rgbToCss(neutral.r, neutral.g, neutral.b);
  }

  if (t > center) {
    // Positive -> blend from neutral to dark blue
    const darkBlue = { r: 37, g: 99, b: 235 }; // blue-600
    const tt = distFromCenter; // 0..1
    return rgbToCss(
      lerp(neutral.r, darkBlue.r, tt),
      lerp(neutral.g, darkBlue.g, tt),
      lerp(neutral.b, darkBlue.b, tt)
    );
  }

  // Negative -> blend from neutral to dark red
  const darkRed = { r: 220, g: 38, b: 38 }; // red-600
  const tt = distFromCenter;
  return rgbToCss(
    lerp(neutral.r, darkRed.r, tt),
    lerp(neutral.g, darkRed.g, tt),
    lerp(neutral.b, darkRed.b, tt)
  );
}

function formatCorr(v: number | null | undefined) {
  if (v === null || v === undefined || !Number.isFinite(v)) return "—";
  return v.toFixed(2);
}

export default function CorrelationHeatmap({
  correlationMatrix,
}: {
  correlationMatrix: CorrelationMatrix;
}) {
  const { orderedCols, orderedRows, values } = useMemo(() => {
    const rows = Object.keys(correlationMatrix || {});
    const cols = new Set<string>();
    for (const r of rows) {
      const inner = correlationMatrix?.[r] || {};
      for (const c of Object.keys(inner)) cols.add(c);
    }
    const ordered = Array.from(cols).sort((a, b) => a.localeCompare(b));

    // If backend provided square matrix, rows should match columns. Still derive safely.
    const orderedRowsLocal = rows.length ? rows.sort((a, b) => a.localeCompare(b)) : ordered;

    const matrix: Array<Array<number | null>> = orderedRowsLocal.map((r) => {
      const rowObj = correlationMatrix?.[r] || {};
      return ordered.map((c) => {
        const v = (rowObj as Record<string, number | undefined>)?.[c];
        return typeof v === "number" && Number.isFinite(v) ? v : null;
      });
    });

    return {
      orderedCols: ordered,
      orderedRows: orderedRowsLocal,
      values: matrix,
    };
  }, [correlationMatrix]);

  const numericColsCount = orderedCols.length;

  if (!correlationMatrix || numericColsCount < 2 || orderedRows.length < 2) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
        Not enough numeric columns to compute a correlation heatmap.
      </div>
    );
  }


  return (
    <div className="w-full overflow-auto">
      <div className="min-w-[520px]">
        <div
          className="grid gap-px bg-gray-200"
          style={{
            gridTemplateColumns: `repeat(${orderedCols.length + 1}, minmax(88px, 1fr))`,
          }}
        >
          {/* header corner */}
          <div className="bg-white px-2 py-2 text-xs font-semibold text-gray-600 sticky left-0" />

          {orderedCols.map((c) => (
            <div
              key={c}
              className="bg-white px-2 py-2 text-xs font-semibold text-gray-700 whitespace-nowrap"
            >
              {c}
            </div>
          ))}

          {orderedRows.map((r, i) => (
            <React.Fragment key={r}>
              <div className="bg-white px-2 py-2 text-xs font-semibold text-gray-700 sticky left-0">
                {r}
              </div>
              {orderedCols.map((c, j) => {
                const v = values[i]?.[j];
                const bg = correlationToColor(v ?? 0);
                const textColor = (v ?? 0) >= 0.2 || (v ?? 0) <= -0.2 ? "rgb(255 255 255)" : "rgb(15 23 42)";
                return (
                  <div
                    key={`${r}__${c}`}
                    className="px-2 py-1.5 flex flex-col items-start justify-center"
                    style={{ backgroundColor: bg, color: textColor }}
                  >
                    <div className="text-[11px] font-medium leading-tight whitespace-nowrap">
                      {formatCorr(v ?? null)}
                    </div>
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

