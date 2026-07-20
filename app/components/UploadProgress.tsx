"use client";

import React from "react";

export type UploadStage =
  | "uploading"
  | "parsing"
  | "computing"
  | "generating"
  | "finalizing";

export type UploadStatus = "idle" | "processing" | "error" | "done";

interface StageConfig {
  key: UploadStage;
  label: string;
}

const STAGES: StageConfig[] = [
  { key: "uploading", label: "Uploading CSV..." },
  { key: "parsing", label: "Parsing dataset..." },
  { key: "computing", label: "Computing statistics..." },
  { key: "generating", label: "Generating AI summary..." },
  { key: "finalizing", label: "Finalizing dashboard..." },
];

interface UploadProgressProps {
  currentStage: UploadStage;
  status: UploadStatus;
}

function StageDot({ active, completed, errored }: { active: boolean; completed: boolean; errored: boolean }) {
  if (errored) {
    return (
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100">
        <svg className="h-3 w-3 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gray-900">
        <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
    );
  }

  if (active) {
    return (
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-gray-900">
        <div className="h-2 w-2 rounded-full bg-gray-900 animate-pulse" />
      </div>
    );
  }

  // Inactive / upcoming
  return (
    <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 border-gray-300">
      <div className="h-2 w-2 rounded-full bg-gray-300" />
    </div>
  );
}

function StageLabel({ label, active, completed, errored }: { label: string; active: boolean; completed: boolean; errored: boolean }) {
  const getLabelColor = () => {
    if (errored) return "text-red-700";
    if (completed) return "text-gray-900";
    if (active) return "text-gray-900";
    return "text-gray-400";
  };

  return (
    <span className={`text-sm font-medium transition-colors duration-200 ${getLabelColor()}`}>
      {label}
    </span>
  );
}

function StageConnector({ completed, errored }: { completed: boolean; errored: boolean }) {
  const bgColor = completed && !errored ? "bg-gray-900" : "bg-gray-300";
  return (
    <div className={`ml-2.5 h-5 w-0.5 ${bgColor} transition-colors duration-300`} />
  );
}

export default function UploadProgress({ currentStage, status }: UploadProgressProps) {
  const stageIndex = STAGES.findIndex((s) => s.key === currentStage);
  const hasError = status === "error";

  return (
    <div className="mt-3 w-full" role="region" aria-label="Upload progress">
      <div className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
        <div className="flex items-start gap-3 mb-3" aria-live="polite" aria-atomic="true">
          <div className="mt-0.5">
            {hasError ? (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100">
                <svg className="h-3 w-3 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
              </div>
            ) : (
              <div className="flex h-5 w-5 items-center justify-center">
                <div className="h-2.5 w-2.5 rounded-full bg-gray-900 animate-pulse" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${hasError ? "text-red-800" : "text-gray-900"}`}>
              {hasError ? "Upload failed" : "Processing your dataset"}
            </p>
            <p className="mt-0.5 text-xs text-gray-500">
              {hasError
                ? "An error occurred during processing. See details below."
                : "Please wait while we analyze your file."}
            </p>
          </div>
        </div>

        <div className="space-y-0">
          {STAGES.map((stage, idx) => {
            const isActive = idx === stageIndex && !hasError;
            const isCompleted = idx < stageIndex;
            const isErrored = idx === stageIndex && hasError;
            const isUpcoming = idx > stageIndex;

            return (
              <div key={stage.key}>
                <div className="flex items-center gap-3 py-2">
                  <StageDot
                    active={isActive}
                    completed={isCompleted}
                    errored={isErrored}
                  />
                  <StageLabel
                    label={stage.label}
                    active={isActive}
                    completed={isCompleted}
                    errored={isErrored}
                  />
                  {isActive && (
                    <div className="flex gap-0.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-900 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-900 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-gray-900 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  )}
                </div>
                {idx < STAGES.length - 1 && (
                  <StageConnector
                    completed={isCompleted}
                    errored={isErrored}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

