"""Pandas analysis shared by upload and the Data Agent tools."""

from __future__ import annotations

import pandas as pd


def to_jsonable(val):
    if pd.isna(val):
        return None
    if hasattr(val, "item"):
        try:
            return val.item()
        except Exception:
            pass
    return val


def analyze_dataframe(df: pd.DataFrame) -> dict:
    """Run the full Tablyze analysis pipeline on a DataFrame."""
    total_rows = len(df)
    duplicate_rows = int(df.duplicated().sum())
    missing_series = df.isna().sum(axis=0)

    missing_values = {}
    for col in df.columns:
        missing_count = int(missing_series[col])
        missing_values[str(col)] = missing_count

    numeric_df = df.select_dtypes(include=["number"])

    correlation_matrix = {}
    if numeric_df.shape[1] >= 2:
        corr = numeric_df.corr(numeric_only=True)
        correlation_matrix = {
            str(col): {str(c2): to_jsonable(val) for c2, val in corr.loc[col].items()}
            for col in corr.columns
        }

    numeric_summary = {}
    iqr_outliers = {}

    for col in numeric_df.columns:
        s = numeric_df[col]
        count = int(s.count())

        q1 = (
            to_jsonable(s.quantile(0.25, interpolation="linear"))
            if count > 0
            else None
        )
        q3 = (
            to_jsonable(s.quantile(0.75, interpolation="linear"))
            if count > 0
            else None
        )

        if q1 is None or q3 is None:
            iqr = None
            lower_bound = None
            upper_bound = None
            outlier_count = 0
        else:
            iqr_val = q3 - q1
            lower_bound_val = q1 - 1.5 * iqr_val
            upper_bound_val = q3 + 1.5 * iqr_val
            outlier_count = int(
                ((s < lower_bound_val) | (s > upper_bound_val)).sum()
            )
            iqr = to_jsonable(iqr_val)
            lower_bound = to_jsonable(lower_bound_val)
            upper_bound = to_jsonable(upper_bound_val)

        stats = {
            "count": count,
            "mean": to_jsonable(s.mean()),
            "std": to_jsonable(s.std()),
            "min": to_jsonable(s.min()),
            "25%": q1,
            "50%": to_jsonable(s.quantile(0.50, interpolation="linear")) if count > 0 else None,
            "75%": q3,
            "max": to_jsonable(s.max()),
        }
        numeric_summary[str(col)] = stats

        iqr_outliers[str(col)] = {
            "q1": q1,
            "q3": q3,
            "iqr": iqr,
            "lower_bound": lower_bound,
            "upper_bound": upper_bound,
            "outlier_count": outlier_count,
        }

    categorical_df = df.select_dtypes(exclude=["number"])
    categorical_top_frequencies = {}
    for col in categorical_df.columns:
        s = categorical_df[col]
        vc = s.value_counts(dropna=True).head(5)
        categorical_top_frequencies[str(col)] = [
            {"value": to_jsonable(idx), "count": int(cnt)}
            for idx, cnt in vc.items()
        ]

    return {
        "rows": df.shape[0],
        "columns": df.shape[1],
        "column_names": list(df.columns),
        "dtypes": {str(k): str(v) for k, v in df.dtypes.astype(str).to_dict().items()},
        "duplicate_rows": duplicate_rows,
        "missing_values": missing_values,
        "numeric_summary": numeric_summary,
        "iqr_outliers": iqr_outliers,
        "correlation_matrix": correlation_matrix,
        "categorical_top_frequencies": categorical_top_frequencies,
    }
