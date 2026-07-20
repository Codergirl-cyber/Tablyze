"use client";

import React, { useRef, useState, useCallback } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ExportReportButtonProps {
  /** The container element holding all dashboard sections to capture */
  dashboardRef: React.RefObject<HTMLDivElement | null>;
  /** Name of the uploaded file (for report title) */
  fileName: string;
  /** Whether analysis results are ready */
  hasAnalysis: boolean;
  /** Whether the export is currently in progress */
  isExporting: boolean;
  /** Called when export starts */
  onExportStart: () => void;
  /** Called when export completes or errors */
  onExportEnd: () => void;
}

// ---------------------------------------------------------------------------
// PDF generation constants
// ---------------------------------------------------------------------------
const PDF_PAGE_FORMAT = "a4";
const PDF_UNIT = "mm";
const PAGE_WIDTH = 210; // mm (A4)
const PAGE_HEIGHT = 297; // mm (A4)
const MARGIN_TOP = 20;
const MARGIN_BOTTOM = 25;
const MARGIN_LEFT = 15;
const MARGIN_RIGHT = 15;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT; // 180mm

// ---------------------------------------------------------------------------
// Helper: capture a single element as a canvas image
// ---------------------------------------------------------------------------
async function captureElement(
  element: HTMLElement,
  label: string
): Promise<string | null> {
  try {
    const canvas = await html2canvas(element, {
      scale: 2, // retina quality
      useCORS: true,
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
    });
    return canvas.toDataURL("image/png");
  } catch (err) {
    console.error(`Failed to capture [${label}]:`, err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Helper: add a text block with optional bold prefix
// ---------------------------------------------------------------------------
function addTextBlock(
  doc: jsPDF,
  lines: string[],
  x: number,
  y: number,
  options?: { boldPrefix?: string; fontSize?: number; color?: [number, number, number] }
): number {
  const { boldPrefix, fontSize = 9, color = [60, 60, 60] } = options || {};
  let cursorY = y;

  lines.forEach((line) => {
    // Check if we need a new page
    if (cursorY > PAGE_HEIGHT - MARGIN_BOTTOM) {
      doc.addPage();
      cursorY = MARGIN_TOP;
    }

    doc.setFontSize(fontSize);

    if (boldPrefix && line.startsWith(boldPrefix)) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(line, x, cursorY);
      doc.setFont("helvetica", "normal");
    } else {
      doc.setFont("helvetica", "normal");
      doc.setTextColor(color[0], color[1], color[2]);
      doc.text(line, x, cursorY);
    }

    cursorY += fontSize * 0.45;
  });

  return cursorY;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ExportReportButton({
  dashboardRef,
  fileName,
  hasAnalysis,
  isExporting,
  onExportStart,
  onExportEnd,
}: ExportReportButtonProps) {
  const [localExporting, setLocalExporting] = useState(false);

  const exporting = isExporting || localExporting;

  const generateReport = useCallback(async () => {
    if (!dashboardRef.current || exporting) return;

    setLocalExporting(true);
    onExportStart();

    try {
      // ---------------------------------------------------------------
      // 1. Identify all capture sections within the dashboard
      // ---------------------------------------------------------------
      const dashboard = dashboardRef.current;

      // Stat cards grid
      const statCardsSection = dashboard.querySelector<HTMLElement>(
        '[data-export-section="stat-cards"]'
      );
      // Missing values section
      const missingValuesSection = dashboard.querySelector<HTMLElement>(
        '[data-export-section="missing-values"]'
      );
      // Data types section
      const dataTypesSection = dashboard.querySelector<HTMLElement>(
        '[data-export-section="data-types"]'
      );
      // Correlation heatmap section
      const correlationSection = dashboard.querySelector<HTMLElement>(
        '[data-export-section="correlation"]'
      );
      // Summary statistics section
      const summaryStatsSection = dashboard.querySelector<HTMLElement>(
        '[data-export-section="summary-stats"]'
      );
      // AI summary section
      const aiSummarySection = dashboard.querySelector<HTMLElement>(
        '[data-export-section="ai-summary"]'
      );

      // ---------------------------------------------------------------
      // 2. Capture all sections in parallel
      // ---------------------------------------------------------------
      const captures = await Promise.all([
        captureElement(statCardsSection!, "StatCards"),
        captureElement(missingValuesSection!, "MissingValues"),
        captureElement(dataTypesSection!, "DataTypes"),
        captureElement(correlationSection!, "Correlation"),
        captureElement(summaryStatsSection!, "SummaryStats"),
        captureElement(aiSummarySection!, "AiSummary"),
      ]);

      const [
        statCardsImg,
        missingValuesImg,
        dataTypesImg,
        correlationImg,
        summaryStatsImg,
        aiSummaryImg,
      ] = captures;

      // ---------------------------------------------------------------
      // 3. Build PDF
      // ---------------------------------------------------------------
      const doc = new jsPDF("p", "mm", "a4");
      let pageNum = 1;

      // ---- Helper: add page number footer ----
      const addFooter = () => {
        doc.setFontSize(8);
        doc.setTextColor(180, 180, 180);
        doc.setFont("helvetica", "normal");
        doc.text(
          `Page ${pageNum}`,
          PAGE_WIDTH / 2,
          PAGE_HEIGHT - 10,
          { align: "center" }
        );
        pageNum++;
      };

      // ---- Cover Page ----
      doc.setFillColor(17, 24, 39); // gray-900
      doc.rect(0, 0, PAGE_WIDTH, PAGE_HEIGHT, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(32);
      doc.setFont("helvetica", "bold");
      doc.text("Dataset Report", PAGE_WIDTH / 2, PAGE_HEIGHT / 2 - 30, {
        align: "center",
      });

      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(200, 200, 200);
      doc.text(fileName || "Unnamed Dataset", PAGE_WIDTH / 2, PAGE_HEIGHT / 2 + 10, {
        align: "center",
      });

      doc.setFontSize(10);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Generated on ${new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`,
        PAGE_WIDTH / 2,
        PAGE_HEIGHT / 2 + 30,
        { align: "center" }
      );

      addFooter();

      // ---- Helper: add image to PDF with auto-scaling ----
      const addImageToPage = (
        imgData: string | null,
        label: string,
        preferredHeightMm?: number
      ): void => {
        if (!imgData) {
          doc.setFontSize(10);
          doc.setTextColor(180, 180, 180);
          doc.setFont("helvetica", "italic");
          doc.text(
            `[${label} not available]`,
            MARGIN_LEFT,
            MARGIN_TOP + 20
          );
          return;
        }

        const imgProps = doc.getImageProperties(imgData);
        const imgWidth = imgProps.width;
        const imgHeight = imgProps.height;
        const aspectRatio = imgWidth / imgHeight;

        // Calculate dimensions to fit within content area
        let renderWidth = CONTENT_WIDTH;
        let renderHeight = renderWidth / aspectRatio;

        // If a preferred height is specified (e.g., for full-width sections)
        if (preferredHeightMm) {
          renderHeight = Math.min(renderHeight, preferredHeightMm);
          renderWidth = renderHeight * aspectRatio;
          if (renderWidth > CONTENT_WIDTH) {
            renderWidth = CONTENT_WIDTH;
            renderHeight = renderWidth / aspectRatio;
          }
        }

        // If the rendered image would exceed available page space, scale down
        const availableHeight = PAGE_HEIGHT - MARGIN_TOP - MARGIN_BOTTOM;
        if (renderHeight > availableHeight * 0.85) {
          renderHeight = availableHeight * 0.85;
          renderWidth = renderHeight * aspectRatio;
          if (renderWidth > CONTENT_WIDTH) {
            renderWidth = CONTENT_WIDTH;
            renderHeight = renderWidth / aspectRatio;
          }
        }

        // Check if there's enough room on current page; if not, add a new page
        const spaceNeeded = renderHeight + 15; // 15mm for header/title
        if (MARGIN_TOP + spaceNeeded > PAGE_HEIGHT - MARGIN_BOTTOM) {
          doc.addPage();
        }

        const yPos = MARGIN_TOP;

        // Draw label
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(30, 30, 30);
        doc.text(label, MARGIN_LEFT, yPos + 5);

        // Draw a thin line under the label
        doc.setDrawColor(200, 200, 200);
        doc.line(MARGIN_LEFT, yPos + 7, MARGIN_LEFT + CONTENT_WIDTH, yPos + 7);

        // Center the image horizontally
        const xOffset = MARGIN_LEFT + (CONTENT_WIDTH - renderWidth) / 2;
        doc.addImage(imgData, "PNG", xOffset, yPos + 12, renderWidth, renderHeight);

        // Add a page break after each section
        doc.addPage();
      };

      // ---- Dataset Overview (text-based) ----
      // Extract stat values from the DOM
      const statLabels = statCardsSection?.querySelectorAll('[data-stat-label]');
      const statValues = statCardsSection?.querySelectorAll('[data-stat-value]');
      const overviewLines: string[] = [];
      if (statLabels && statValues) {
        for (let i = 0; i < Math.min(statLabels.length, statValues.length); i++) {
          const label = statLabels[i]?.textContent?.trim() || "";
          const value = statValues[i]?.textContent?.trim() || "";
          overviewLines.push(`${label}: ${value}`);
        }
      }

      // ---- Page 2: Dataset Overview ----
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 30, 30);
      doc.text("Dataset Overview", MARGIN_LEFT, MARGIN_TOP + 5);

      doc.setDrawColor(17, 24, 39);
      doc.setLineWidth(0.5);
      doc.line(MARGIN_LEFT, MARGIN_TOP + 8, MARGIN_LEFT + 40, MARGIN_TOP + 8);

      let overviewY = MARGIN_TOP + 18;
      if (overviewLines.length > 0) {
        overviewY = addTextBlock(doc, overviewLines, MARGIN_LEFT, overviewY, {
          fontSize: 10,
          color: [60, 60, 60],
        });
      } else {
        doc.setFontSize(10);
        doc.setTextColor(180, 180, 180);
        doc.text("Overview statistics not available.", MARGIN_LEFT, overviewY + 5);
        overviewY += 10;
      }

      addFooter();

      // ---- Remaining sections as captured images ----
      addImageToPage(statCardsImg, "Overview Statistics");
      addImageToPage(missingValuesImg, "Missing Values");
      addImageToPage(dataTypesImg, "Data Types");
      addImageToPage(correlationImg, "Correlation Heatmap");
      addImageToPage(summaryStatsImg, "Summary Statistics");
      addImageToPage(aiSummaryImg, "AI Dataset Summary");

      // ---- Save the PDF ----
      const safeFileName = fileName
        .replace(/\.[^/.]+$/, "") // remove extension
        .replace(/[^a-zA-Z0-9_-]/g, "_")
        .substring(0, 50) || "dataset";
      doc.save(`${safeFileName}_report.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
    } finally {
      setLocalExporting(false);
      onExportEnd();
    }
  }, [dashboardRef, fileName, exporting, onExportStart, onExportEnd]);

  if (!hasAnalysis) return null;

  return (
    <button
      onClick={generateReport}
      disabled={exporting}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all duration-150 
        ${
          exporting
            ? "bg-gray-200 text-gray-500 cursor-not-allowed"
            : "bg-gray-900 text-white hover:bg-gray-800 active:bg-gray-900"
        }`}
      aria-label="Export report as PDF"
    >
      {exporting ? (
        <>
          <svg
            className="animate-spin h-4 w-4 text-gray-500"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Generating PDF…
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Export Report
        </>
      )}
    </button>
  );
}

