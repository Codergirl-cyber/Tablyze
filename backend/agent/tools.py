"""Controlled analysis tools for the Data Agent."""

from __future__ import annotations

from typing import Any, Callable

import pandas as pd

from analysis import analyze_dataframe

ToolFn = Callable[[pd.DataFrame, dict], dict[str, Any]]

TOOL_DESCRIPTIONS: dict[str, str] = {
    "profile_dataset": (
        "Overview: row/column counts, column names, data types, duplicate row count."
    ),
    "get_missing_values": "Per-column missing (null) value counts.",
    "get_duplicate_count": "Count of fully duplicate rows.",
    "get_numeric_statistics": "Descriptive statistics for numeric columns (mean, std, min, max, quartiles).",
    "get_outlier_counts": "Tukey IQR outlier counts and bounds per numeric column.",
    "get_correlations": "Pearson correlation matrix for numeric columns (empty if fewer than two).",
    "get_categorical_frequencies": "Top 5 value frequencies for non-numeric columns.",
}


def _wrap(tool_name: str, result: dict) -> dict[str, Any]:
    return {"tool": tool_name, "result": result}


def profile_dataset(df: pd.DataFrame, analysis: dict) -> dict[str, Any]:
    return _wrap(
        "profile_dataset",
        {
            "rows": analysis["rows"],
            "columns": analysis["columns"],
            "column_names": analysis["column_names"],
            "dtypes": analysis["dtypes"],
            "duplicate_rows": analysis["duplicate_rows"],
        },
    )


def get_missing_values(df: pd.DataFrame, analysis: dict) -> dict[str, Any]:
    cols_with_missing = {
        col: count for col, count in analysis["missing_values"].items() if count > 0
    }
    return _wrap(
        "get_missing_values",
        {
            "missing_values": analysis["missing_values"],
            "columns_with_missing": cols_with_missing,
            "total_missing_cells": int(sum(analysis["missing_values"].values())),
        },
    )


def get_duplicate_count(df: pd.DataFrame, analysis: dict) -> dict[str, Any]:
    return _wrap(
        "get_duplicate_count",
        {"duplicate_rows": analysis["duplicate_rows"]},
    )


def get_numeric_statistics(df: pd.DataFrame, analysis: dict) -> dict[str, Any]:
    return _wrap(
        "get_numeric_statistics",
        {"numeric_summary": analysis["numeric_summary"]},
    )


def get_outlier_counts(df: pd.DataFrame, analysis: dict) -> dict[str, Any]:
    return _wrap(
        "get_outlier_counts",
        {"iqr_outliers": analysis["iqr_outliers"]},
    )


def get_correlations(df: pd.DataFrame, analysis: dict) -> dict[str, Any]:
    return _wrap(
        "get_correlations",
        {"correlation_matrix": analysis["correlation_matrix"]},
    )


def get_categorical_frequencies(df: pd.DataFrame, analysis: dict) -> dict[str, Any]:
    return _wrap(
        "get_categorical_frequencies",
        {"categorical_top_frequencies": analysis["categorical_top_frequencies"]},
    )


REGISTERED_TOOLS: dict[str, ToolFn] = {
    "profile_dataset": profile_dataset,
    "get_missing_values": get_missing_values,
    "get_duplicate_count": get_duplicate_count,
    "get_numeric_statistics": get_numeric_statistics,
    "get_outlier_counts": get_outlier_counts,
    "get_correlations": get_correlations,
    "get_categorical_frequencies": get_categorical_frequencies,
}


def run_tool(tool_name: str, df: pd.DataFrame, analysis: dict) -> dict[str, Any]:
    if tool_name not in REGISTERED_TOOLS:
        raise ValueError(f"Unknown tool: {tool_name}")
    return REGISTERED_TOOLS[tool_name](df, analysis)


def run_tools(tool_names: list[str], df: pd.DataFrame) -> list[dict[str, Any]]:
    analysis = analyze_dataframe(df)
    outputs: list[dict[str, Any]] = []
    for name in tool_names:
        outputs.append(run_tool(name, df, analysis))
    return outputs
