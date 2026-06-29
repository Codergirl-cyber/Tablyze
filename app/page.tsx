"use client";

import { useMemo, useState } from "react";
import DashboardShell from "./components/DashboardShell";
import KeyValueTable from "./components/KeyValueTable";
import SectionCard from "./components/SectionCard";
import StatCard from "./components/StatCard";

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);

  const uploadFile = async () => {
    console.log("uploadFile called");
    console.log("Current file:", file);
    try {
      if (!file) {
        console.log("No file selected");
        return;
      }

      console.log("Uploading file...");

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      console.log("Response status:", res.status);

      const data = await res.json();
      console.log("Response data:", data);

      setResult(data);
    } catch (err) {
      console.error("Upload failed:", err);
    }
  };

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

    const dtypes: Record<string, string> = (result.dtypes as Record<string, string> | undefined) || {};
    const numericColumns = columnNames.filter(
      (c) => String(dtypes[c] ?? "").toLowerCase().includes("int") || String(dtypes[c] ?? "").toLowerCase().includes("float") || String(dtypes[c] ?? "").toLowerCase().includes("number")
    ).length;

    const missingValues: Record<string, number> = (result.missing_values as Record<string, number> | undefined) || {};
    const missingTotal = Object.values(missingValues).reduce((acc, v) => acc + (Number(v) || 0), 0);

    const numericSummary = result.numeric_summary || {};

    const summaryRows: Array<Record<string, unknown>> = Object.entries(numericSummary).map(([col, stats]) => {
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
    });

    // Placeholders (no chart implementation yet)
    const missingValuesEntries = Object.entries(missingValues).map(([k, v]) => ({ column: k, missing: v }));
    const dataTypesEntries = Object.entries(dtypes).map(([k, v]) => ({ column: k, dtype: v }));

    // KeyValueTable expects ReactNode values; cast derived rows for UI rendering.
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

  return (
    <main className="min-h-screen bg-gray-50 text-black p-4 sm:p-6">
      <div className="w-full max-w-6xl mx-auto">
        <div className="bg-white shadow-sm border border-gray-200 rounded-2xl p-4 sm:p-6">
          <DashboardShell title="Tablyze" subtitle="Upload a CSV and explore dataset profiling results." >
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const selectedFile = e.target.files?.[0] || null;
                    console.log("Selected file:", selectedFile);
                    setFile(selectedFile);
                  }}
                  className="block w-full sm:w-auto text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:border-0 file:rounded-lg file:bg-gray-100 file:text-gray-900 hover:file:bg-gray-200"
                />

                <button
                  className="px-4 py-2 rounded-lg bg-gray-900 text-white font-medium hover:bg-gray-800 active:bg-gray-900 disabled:opacity-50"
                  onClick={() => {
                    console.log("BUTTON CLICKED");
                    uploadFile();
                  }}
                  disabled={!file}
                >
                  Upload
                </button>
              </div>

              {derived?.error ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {derived.error}
                </div>
              ) : null}
            </div>

            {result && !derived?.error ? (
              <div className="mt-6">
                {/* Overview */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard label="Total Rows" value={derived?.rows ?? "—"} hint="Total records" />
                  <StatCard label="Total Columns" value={derived?.columns ?? "—"} hint="Total features" />
                  <StatCard label="Missing Values" value={derived?.missingTotal ?? "—"} hint="Total null/NaN count" />
                  <StatCard label="Duplicate Rows" value={derived?.duplicateRows ?? "—"} hint="Rows duplicated across all columns" />
                </div>

                {/* Charts placeholders + table */}
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
                  <div className="lg:col-span-2">
                    <SectionCard title="Missing Values" subtitle="Placeholder for missing values visualization">
                      <div className="text-sm text-gray-600">
                        Chart placeholder (no charts implemented yet). You can use the provided
                        <span className="font-mono text-gray-900 ml-1">missing_values</span> data.
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

                  <div>
                    <SectionCard title="Data Types" subtitle="Placeholder for dtypes visualization">
                      <div className="text-sm text-gray-600">
                        Chart placeholder (no charts implemented yet). You can use the provided
                        <span className="font-mono text-gray-900 ml-1">dtypes</span> data.
                      </div>
                      <div className="mt-3">
                        <KeyValueTable
                          rows={(derived?.dataTypesEntries || [])
                            .slice(0, 10)
                            .map((r) => ({ Column: r.column, Dtype: r.dtype }))}
                        />
                      </div>
                    </SectionCard>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <SectionCard
                    title="Correlation Heatmap"
                    subtitle="Placeholder for numeric correlation matrix heatmap"
                  >
                    <div className="text-sm text-gray-600">
                      Chart placeholder (no charts implemented yet). You can use
                      <span className="font-mono text-gray-900 ml-1">correlation_matrix</span>.
                    </div>
                  </SectionCard>

                  <SectionCard title="Summary Statistics" subtitle="Numeric columns summary">
                    <div className="text-sm text-gray-600">Table derived from <span className="font-mono text-gray-900">numeric_summary</span>.</div>
                    <div className="mt-3">
                      <KeyValueTable rows={derived?.summaryRows || []} />
                    </div>
                  </SectionCard>
                </div>
              </div>
            ) : null}
          </DashboardShell>
        </div>
      </div>
    </main>
  );
}

