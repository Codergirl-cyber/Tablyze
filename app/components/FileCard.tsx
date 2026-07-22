"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type UploadStatus } from "./UploadProgress";

interface FileCardProps {
  /** The selected File object */
  file: File;
  /** Whether the upload is currently in progress */
  isUploading: boolean;
  /** Current upload status for success/error indicator */
  uploadStatus: UploadStatus;
  /** Callback to remove/clear the selected file */
  onRemove: () => void;
}

/**
 * Formats a file size in bytes to a human-readable string.
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Status indicator icon — shows success check, error cross, or loading pulse.
 */
function StatusIcon({
  uploadStatus,
}: {
  uploadStatus: UploadStatus;
}) {
  if (uploadStatus === "done") {
    return (
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100"
        aria-label="Upload successful"
      >
        <svg
          className="h-3.5 w-3.5 text-green-700"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2.5}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.5 12.75l6 6 9-13.5"
          />
        </svg>
      </motion.div>
    );
  }

  if (uploadStatus === "error") {
    return (
      <div
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-100"
        aria-label="Upload failed"
      >
        <svg
          className="h-3.5 w-3.5 text-red-700"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
    );
  }

  if (uploadStatus === "processing") {
    return (
      <div
        className="flex h-6 w-6 shrink-0 items-center justify-center"
        aria-label="Upload in progress"
      >
        <div className="h-2.5 w-2.5 rounded-full bg-gray-900 animate-pulse" />
      </div>
    );
  }

  // idle — just a muted dot
  return (
    <div
      className="flex h-6 w-6 shrink-0 items-center justify-center"
      aria-label="File selected"
    >
      <div className="h-2 w-2 rounded-full bg-gray-400" />
    </div>
  );
}

/**
 * FileCard — Displays the selected file in a clean card with filename,
 * file size, a remove button, and an upload status indicator.
 */
export default function FileCard({
  file,
  isUploading,
  uploadStatus,
  onRemove,
}: FileCardProps) {
  const isRemovable = !isUploading;

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={file.name + file.size}
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.98 }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className="group flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 shadow-sm transition-all duration-200 hover:border-gray-300 hover:shadow-md"
        role="status"
        aria-live="polite"
      >
        {/* File icon */}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500 transition-colors duration-200 group-hover:bg-gray-200 group-hover:text-gray-700">
          <svg
            className="h-4.5 w-4.5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
            />
          </svg>
        </div>

        {/* File details */}
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">
            {file.name}
          </p>
          <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
        </div>

        {/* Status indicator */}
        <StatusIcon uploadStatus={uploadStatus} />

        {/* Remove button */}
        {isRemovable ? (
          <motion.button
            type="button"
            onClick={onRemove}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors duration-200 hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
            aria-label={`Remove ${file.name}`}
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </motion.button>
        ) : null}
      </motion.div>
    </AnimatePresence>
  );
}

