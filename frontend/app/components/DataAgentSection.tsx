"use client";

import { useCallback, useRef, useState } from "react";
import SectionCard from "./SectionCard";
import {
  investigateDataset,
  type InvestigateResponse,
  InvestigateError,
} from "../lib/agent";

const SUGGESTIONS: { label: string; question: string }[] = [
  {
    label: "What unusual patterns exist?",
    question: "What unusual patterns exist in this dataset?",
  },
  {
    label: "Which columns have the most missing data?",
    question: "Which columns have the most missing data?",
  },
  {
    label: "Are there strong correlations?",
    question: "Are there strong correlations between numeric variables?",
  },
];

function formatEvidenceValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export default function DataAgentSection({
  hasDataset,
}: {
  hasDataset: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [isInvestigating, setIsInvestigating] = useState(false);
  const [investigation, setInvestigation] = useState<InvestigateResponse | null>(null);
  const [investigationError, setInvestigationError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const canInvestigate =
    hasDataset && question.trim().length > 0 && !isInvestigating;

  const runInvestigation = useCallback(async () => {
    if (!hasDataset || !question.trim() || inFlightRef.current) return;

    inFlightRef.current = true;
    setIsInvestigating(true);
    setInvestigationError(null);

    try {
      const response = await investigateDataset(question);
      setInvestigation(response);
    } catch (error) {
      if (error instanceof InvestigateError) {
        setInvestigationError(error.message);
      } else {
        setInvestigationError(
          "Something went wrong while investigating the dataset. Please try again."
        );
      }
    } finally {
      setIsInvestigating(false);
      inFlightRef.current = false;
    }
  }, [hasDataset, question]);

  const handleQuestionKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && canInvestigate) {
      event.preventDefault();
      void runInvestigation();
    }
  };

  return (
    <div className="mt-6">
      <SectionCard
        title="Data Agent"
        subtitle="Ask the system to investigate your uploaded dataset"
      >
        {!hasDataset ? (
          <p className="text-sm text-gray-600">Upload a CSV to start an investigation.</p>
        ) : (
          <p className="text-sm text-gray-600">
            Ask a natural-language question. The agent will run registered analysis tools and
            answer using the results.
          </p>
        )}

        <div className="mt-4 flex flex-col gap-3">
          <label className="sr-only" htmlFor="data-agent-question">
            Investigation question
          </label>
          <input
            id="data-agent-question"
            type="text"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={handleQuestionKeyDown}
            disabled={!hasDataset || isInvestigating}
            placeholder="What unusual patterns exist in this dataset?"
            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-900/20 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500"
          />

          {hasDataset ? (
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion.question}
                  type="button"
                  disabled={isInvestigating}
                  onClick={() => setQuestion(suggestion.question)}
                  className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {suggestion.label}
                </button>
              ))}
            </div>
          ) : null}

          <div>
            <button
              type="button"
              onClick={() => void runInvestigation()}
              disabled={!canInvestigate}
              className={`inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold shadow-md transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 ${
                !canInvestigate
                  ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none"
                  : "bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]"
              }`}
            >
              {isInvestigating ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
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
                  Investigating dataset…
                </>
              ) : (
                "Investigate"
              )}
            </button>
          </div>
        </div>

        {investigationError ? (
          <div
            className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            role="alert"
          >
            {investigationError}
          </div>
        ) : null}

        {investigation && hasDataset ? (
          <div className="mt-6 space-y-5 border-t border-gray-100 pt-5">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Answer</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                {investigation.answer}
              </p>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900">Evidence</h3>
              {investigation.evidence.length > 0 ? (
                <ul className="mt-2 space-y-2 text-sm text-gray-700 list-disc pl-5">
                  {investigation.evidence.map((item, index) => {
                    const valueText = formatEvidenceValue(item.value);
                    return (
                      <li key={`${item.source}-${index}`}>
                        <span>{item.finding}</span>
                        {valueText ? (
                          <span className="text-gray-500"> ({valueText})</span>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-gray-500">No evidence items were returned.</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900">Tools used</h3>
              {investigation.tools_used.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {investigation.tools_used.map((tool) => (
                    <span
                      key={tool}
                      className="inline-flex items-center rounded-md bg-gray-100 px-2.5 py-1 font-mono text-xs text-gray-800"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-gray-500">No tools were reported.</p>
              )}
            </div>

            {investigation.investigation?.length ? (
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Investigation</h3>
                <ol className="mt-2 space-y-2 text-sm text-gray-700">
                  {investigation.investigation.map((step) => (
                    <li key={step.step}>
                      <span className="font-mono text-xs text-gray-900">{step.tool}</span>
                      {step.reason ? <span className="text-gray-500">: {step.reason}</span> : null}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}
