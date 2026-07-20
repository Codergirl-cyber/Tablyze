"use client";

import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import DashboardShell from "./components/DashboardShell";
import KeyValueTable from "./components/KeyValueTable";
import SectionCard from "./components/SectionCard";
import StatCard from "./components/StatCard";
import MissingValuesBarChart from "./components/MissingValuesBarChart";
import DataTypesPieChart from "./components/DataTypesPieChart";
import CorrelationHeatmap from "./components/CorrelationHeatmap";
import AiSummaryCard from "./components/AiSummaryCard";
import StatCardSkeleton from "./components/StatCardSkeleton";
import ChartSkeleton from "./components/ChartSkeleton";
import TableSkeleton from "./components/TableSkeleton";
import UploadProgress, {
  type UploadStage,
  type UploadStatus,
} from "./components/UploadProgress";
import { StaggerContainer } from "./components/AnimatedContainer";
import ExportReportButton from "./components/ExportReportButton";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [currentStage, setCurrentStage] = useState<UploadStage>("uploading");
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>("idle");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const processingRef = useRef(false);
  const stageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dashboardRef = useRef<HTMLDivElement | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const formatFileLabel = (file: File) => `${file.name} • ${(file.size / 1024).toFixed(1)} KB`;
  const isCsvFile = (candidate: File | null) => {
    if (!candidate) return false;
    const fileName = candidate.name.toLowerCase();
    return candidate.type === "text/csv" || fileName.endsWith(".csv");
  };

  const selectFile = (selected: File | null) => {
    if (!selected) {
      setFile(null);
      setSelectedFileName(null);
      return;
    }

    if (!isCsvFile(selected)) {
      setUploadError("Please choose a valid CSV file.");
      setFile(null);
      setSelectedFileName(null);
      return;
    }

    setUploadError(null);
    setFile(selected);
    setSelectedFileName(formatFileLabel(selected));
    setResult(null);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    selectFile(event.target.files?.[0] ?? null);
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
    selectFile(event.dataTransfer.files?.[0] ?? null);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragActive(false);
  };

  const handleDropZoneKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      fileInputRef.current?.click();
    }
  };

  // Stage progression based on elapsed time
  useEffect(() => {
    if (!isUploading) {
      if (stageTimerRef.current) {
        clearInterval(stageTimerRef.current);
        stageTimerRef.current = null;
      }
      return;
    }

    const STAGE_MILESTONES: { stage: UploadStage; ms: number }[] = [
      { stage: "uploading", ms: 0 },
      { stage: "parsing", ms: 1500 },
      { stage: "computing", ms: 4000 },
      { stage: "generating", ms: 7000 },
    ];

    setCurrentStage("uploading");
    setUploadStatus("processing");
    const startTime = Date.now();

    stageTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      // Find the last milestone that we've passed
      let newStage: UploadStage = "generating";
      for (const m of STAGE_MILESTONES) {
        if (elapsed >= m.ms) {
          newStage = m.stage;
        }
      }
      setCurrentStage(newStage);
    }, 300);

    return () => {
      if (stageTimerRef.current) {
        clearInterval(stageTimerRef.current);
        stageTimerRef.current = null;
      }
    };
  }, [isUploading]);

  const uploadFile = useCallback(async () => {
    if (!file) return;

    if (processingRef.current) return;

    let uploadSucceeded = false;
    let uploadFailed = false;

    processingRef.current = true;
    setUploadError(null);
    setUploadStatus("processing");
    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        const message =
          typeof data?.error === "string"
            ? data.error
            : "Unable to upload the file at this time. Please try again.";
        setUploadError(message);
        setResult(null);
        uploadFailed = true;
      } else {
        setResult(data);
        uploadSucceeded = true;
      }
    } catch (err) {
      setUploadError(
        "Unable to upload the file right now. Please check your network and try again."
      );
      setResult(null);
      uploadFailed = true;
    } finally {
      setIsUploading(false);
      if (uploadFailed) {
        setUploadStatus("error");
      } else if (uploadSucceeded) {
        setUploadStatus("done");
      }
      processingRef.current = false;
    }
  }, [file]);

  const derived = useMemo(() => {
    if (!result || typeof result !== "object") return null;

    if (result.error) {
      return { error: String(result.error) };
    }

    const rows = typeof result.rows === "number" ? result.rows : undefined;
    const columns = typeof result.columns === "number" ? result.columns : undefined;

    // Duplicate rows derived client-side (no backend changes).
    // Uses row-wise JSON stringification of values.
    // If the backend doesn't provide full row data, this falls back to 0.
    const duplicateRows = (() => {
      const maybeRowsData = (result as Record<string, unknown>).rows_data;
      const rowObjects = Array.isArray(maybeRowsData) ? (maybeRowsData as unknown[]) : null;

      if (!rowObjects || !rowObjects.length) return 0;

      const normalized = rowObjects.map((r) => {
        if (r && typeof r === "object") {
          // stable stringify by sorting keys
          const obj = r as Record<string, unknown>;
          const keys = Object.keys(obj).sort();
          const sorted: Record<string, unknown> = {};
          for (const k of keys) sorted[k] = obj[k];
          return JSON.stringify(sorted);
        }
        return JSON.stringify(r);
      });

      const counts = new Map<string, number>();
      for (const s of normalized) counts.set(s, (counts.get(s) ?? 0) + 1);

      let duplicates = 0;
      for (const [, c] of counts) {
        if (c > 1) duplicates += c - 1;
      }
      return duplicates;
    })();
    const columnNames: string[] = Array.isArray(result.column_names)
      ? result.column_names
      : [];

    const dtypes: Record<string, string> =
      (result.dtypes as Record<string, string> | undefined) || {};
    const numericColumns = columnNames.filter(
      (c) =>
        String(dtypes[c] ?? "")
          .toLowerCase()
          .includes("int") ||
        String(dtypes[c] ?? "")
          .toLowerCase()
          .includes("float") ||
        String(dtypes[c] ?? "")
          .toLowerCase()
          .includes("number")
    ).length;

    const missingValues: Record<string, number> =
      (result.missing_values as Record<string, number> | undefined) || {};
    const missingTotal = Object.values(missingValues).reduce(
      (acc, v) => acc + (Number(v) || 0),
      0
    );

    const numericSummary = result.numeric_summary || {};

    const summaryRows: Array<Record<string, unknown>> = Object.entries(numericSummary).map(
      ([col, stats]) => {
        const s = stats as Record<string, unknown>;
        return {
          Column: col,
          Count: s?.count ?? null,
          Mean: s?.mean ?? null,
          Std: s?.std ?? null,
          Min: s?.min ?? null,
          "25%": s?.["25%"] ?? null,
          "50%": s?.["50%"] ?? null,
          "75%": s?.["75%"] ?? null,
          Max: s?.max ?? null,
        };
      }
    );

    const missingValuesEntries = Object.entries(missingValues).map(([k, v]) => ({
      column: k,
      missing: v,
    }));
    const dataTypesEntries = Object.entries(dtypes).map(([k, v]) => ({
      column: k,
      dtype: v,
    }));

    const summaryRowsForTable = summaryRows as Array<Record<string, React.ReactNode>>;

    return {
      rows,
      columns,
      numericColumns,
      missingTotal,
      duplicateRows,
      summaryRows: summaryRowsForTable,
      missingValuesEntries,
      dataTypesEntries,
      correlationMatrix: result.correlation_matrix || {},
      categoricalTopFrequencies: result.categorical_top_frequencies || {},
    };
  }, [result]);

  const hasAnalysis = Boolean(result) && !derived?.error;
  const errorMessage = uploadError ||
    (derived?.error
      ? `Something went wrong while analyzing your dataset: ${derived.error}`
      : null);
  const hasUploadResult = Boolean(result) && !uploadError;
  const summaryToShow =
    (result && typeof (result as Record<string, unknown>).ai_summary === "string" &&
      ((result as Record<string, unknown>).ai_summary as string).trim())
      ? ((result as Record<string, unknown>).ai_summary as string)
      : (result && typeof (result as Record<string, unknown>).summary === "string" &&
        ((result as Record<string, unknown>).summary as string).trim())
        ? ((result as Record<string, unknown>).summary as string)
        : undefined;

  return (
    <main className="min-h-screen bg-gray-50 text-black p-4 sm:p-6">
      <div className="w-full max-w-6xl mx-auto">
        <div className="bg-white shadow-sm border border-gray-200 rounded-2xl p-4 sm:p-6">
          <DashboardShell
            title="Tablyze"
            subtitle="Upload a CSV and explore dataset profiling results."
          >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-4">
                <div
                  role="button"
                  tabIndex={0}
                  aria-label="Upload CSV file"
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={handleDropZoneKeyDown}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  className={`rounded-xl border px-5 py-8 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:ring-offset-2 focus:ring-offset-white ${
                    dragActive
                      ? "border-gray-900 bg-gray-100"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    disabled={isUploading}
                    onChange={handleInputChange}
                    className="hidden"
                  />
                  <div className="flex flex-col items-center justify-center gap-2 text-center">
                    <span className="text-sm font-semibold text-gray-900">
                      Drag and drop a CSV file here, or click to browse
                    </span>
                    <span className="text-sm text-gray-500">
                      Only CSV files are accepted.
                    </span>
                    <span className="mt-2 inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                      {selectedFileName ?? "No file selected"}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    className="px-4 py-2 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 active:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={uploadFile}
                    disabled={!file || isUploading}
                  >
                    {isUploading ? "Analyzing…" : "Upload"}
                  </button>

                  <ExportReportButton
                    dashboardRef={dashboardRef}
                    fileName={selectedFileName?.split(" • ")[0] || file?.name || "dataset"}
                    hasAnalysis={hasAnalysis}
                    isExporting={isExporting}
                    onExportStart={() => setIsExporting(true)}
                    onExportEnd={() => setIsExporting(false)}
                  />

                  {file ? (
                    <div className="text-sm text-gray-600">
                      Selected: <span className="font-medium text-gray-900">{selectedFileName}</span>
                    </div>
                  ) : null}
                </div>
              </div>

              {isUploading ? (
                <UploadProgress currentStage={currentStage} status={uploadStatus} />
              ) : null}

              {errorMessage ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
                  <div className="flex items-start gap-2">
                    <svg className="h-4 w-4 mt-0.5 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                    </svg>
                    <span>{errorMessage}</span>
                  </div>
                </div>
              ) : null}
            </div>

            {isUploading && !hasAnalysis ? (
              <div className="mt-6">
                {/* Stat card skeletons — same grid as real StatCards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                </div>

                {/* Missing Values + Data Types skeletons — same lg:grid-cols-3 layout */}
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <SectionCard
                      title={<div className="animate-pulse rounded-md bg-gray-200 h-4 w-28" />}
                      subtitle="Missing counts per column"
                    >
                      <div className="animate-pulse rounded-md bg-gray-200 h-3 w-48" />
                      <div className="mt-3">
                        <ChartSkeleton />
                      </div>
                      <div className="mt-3">
                        <TableSkeleton rows={5} columns={2} />
                      </div>
                    </SectionCard>
                  </div>

                  <div>
                    <SectionCard
                      title={<div className="animate-pulse rounded-md bg-gray-200 h-4 w-20" />}
                      subtitle="Data type distribution (grouped by dtype)"
                    >
                      <div className="mt-1 animate-pulse rounded-md bg-gray-200 h-3 w-40" />
                      <div className="mt-3">
                        <ChartSkeleton />
                      </div>
                    </SectionCard>
                  </div>
                </div>

                {/* Correlation Heatmap + Summary Statistics skeletons — same lg:grid-cols-2 layout */}
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <SectionCard
                    title={<div className="animate-pulse rounded-md bg-gray-200 h-4 w-36" />}
                    subtitle="Correlation matrix for numeric columns"
                  >
                    <ChartSkeleton />
                  </SectionCard>

                  <SectionCard
                    title={<div className="animate-pulse rounded-md bg-gray-200 h-4 w-32" />}
                    subtitle="Numeric columns summary"
                  >
                    <div className="animate-pulse rounded-md bg-gray-200 h-3 w-56" />
                    <div className="mt-3">
                      <TableSkeleton rows={4} columns={9} />
                    </div>
                  </SectionCard>
                </div>

                {/* AI Summary skeleton — same position as AiSummaryCard */}
                <div className="mt-4">
                  <SectionCard
                    title={
                      <div className="flex items-center gap-2">
                        <div className="animate-pulse rounded-full bg-gray-200 h-9 w-9" />
                        <div className="animate-pulse rounded-md bg-gray-200 h-4 w-36" />
                      </div>
                    }
                    subtitle="AI-generated insights from your dataset"
                  >
                    <div className="rounded-xl border border-gray-200 p-4">
                      <div className="animate-pulse rounded-md bg-gray-200 h-3 w-full mb-2" />
                      <div className="animate-pulse rounded-md bg-gray-200 h-3 w-5/6 mb-2" />
                      <div className="animate-pulse rounded-md bg-gray-200 h-3 w-4/6" />
                    </div>
                  </SectionCard>
                </div>
              </div>
            ) : null}

            {!hasAnalysis && !isUploading && !file ? (
              <div className="mt-8">
                <div className="rounded-xl border border-gray-200 bg-gradient-to-b from-gray-50 to-white p-5 sm:p-7">
                  <div className="text-sm font-medium text-gray-700">Get started</div>
                  <h3 className="mt-1 text-lg sm:text-xl font-semibold text-gray-900">
                    Upload a CSV to unlock insights
                  </h3>
                  <p className="mt-2 text-sm sm:text-base text-gray-600 max-w-2xl">
                    You’ll see missing values, data types, correlation heatmaps, and summary
                    statistics.
                  </p>
                  <div className="mt-4 flex flex-col sm:flex-row gap-3 sm:items-center">
                    <div className="inline-flex items-center rounded-lg bg-white border border-gray-200 px-3 py-2 text-sm text-gray-700">
                      Tip: Try <span className="font-mono">sample.csv</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

{hasAnalysis ? (
              <StaggerContainer>
                <div ref={dashboardRef} className="mt-6">
                  <div data-export-section="stat-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatCard
                      label="Total Rows"
                      value={derived?.rows ?? "—"}
                      hint="Total records"
                    />
                    <StatCard
                      label="Total Columns"
                      value={derived?.columns ?? "—"}
                      hint="Total features"
                    />
                    <StatCard
                      label="Missing Values"
                      value={derived?.missingTotal ?? "—"}
                      hint="Total null/NaN count"
                    />
                    <StatCard
                      label="Duplicate Rows"
                      value={derived?.duplicateRows ?? "—"}
                      hint="Rows duplicated across all columns"
                    />
                  </div>

                  <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="lg:col-span-2" data-export-section="missing-values">
                      <SectionCard title="Missing Values" subtitle="Missing counts per column">
                        <div className="text-sm text-gray-600">
                          <span className="font-mono text-gray-900">missing_values</span> missing
                          counts per column.
                        </div>
                        <div className="mt-3">
                          <MissingValuesBarChart
                            missingValues={
                              (result?.missing_values as Record<string, number> | undefined) || {}
                            }
                          />
                        </div>
                        <div className="mt-3">
                          <KeyValueTable
                            rows={(derived?.missingValuesEntries || [])
                              .slice(0, 10)
                              .map((r) => ({ Column: r.column, Missing: r.missing }))}
                          />
                        </div>
                      </SectionCard>
                    </div>

                    <div data-export-section="data-types">
                      <SectionCard title="Data Types" subtitle="Data type distribution (grouped by dtype)">
                        <div className="mt-1 text-sm text-gray-600">
                          Distribution of column counts grouped by data type.
                        </div>
                        <div className="mt-3">
                          <DataTypesPieChart
                            dtypes={(result?.dtypes as Record<string, string> | undefined) || {}}
                          />
                        </div>
                      </SectionCard>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div data-export-section="correlation">
                      <SectionCard title="Correlation Heatmap" subtitle="Correlation matrix for numeric columns">
                        <CorrelationHeatmap
                          correlationMatrix={
                            (derived?.correlationMatrix as Record<string, Record<string, number>>)
                          }
                        />
                      </SectionCard>
                    </div>

                    <div data-export-section="summary-stats">
                      <SectionCard title="Summary Statistics" subtitle="Numeric columns summary">
                        <div className="text-sm text-gray-600">
                          Table derived from <span className="font-mono text-gray-900">numeric_summary</span>.
                        </div>
                        <div className="mt-3">
                          <KeyValueTable rows={derived?.summaryRows || []} />
                        </div>
                      </SectionCard>
                    </div>
                  </div>

                  {hasUploadResult ? (
                    <div className="mt-4" data-export-section="ai-summary">
                      <AiSummaryCard summary={summaryToShow ?? undefined} error={uploadError} />
                    </div>
                  ) : null}
                </div>
              </StaggerContainer>
            ) : null}
          </DashboardShell>
        </div>
      </div>
    </main>
  );
}


