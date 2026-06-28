from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd

app = FastAPI()

# Allow frontend (Next.js)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"status": "backend running"}

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    try:
        df = pd.read_csv(file.file)

        total_rows = len(df)
        missing_series = df.isna().sum(axis=0)

        missing_values = {}
        for col in df.columns:
            missing_count = int(missing_series[col])
            missing_percent = (missing_count / total_rows * 100) if total_rows > 0 else 0.0
            missing_values[str(col)] = {
                "missing_count": missing_count,
                "missing_percent": missing_percent,
            }

        # Summary statistics + correlation for all numeric columns
        numeric_df = df.select_dtypes(include=["number"])

        # Correlation matrix (numeric columns only). If <2 numeric columns, return empty.
        correlation_matrix = {}
        if numeric_df.shape[1] >= 2:
            corr = numeric_df.corr(numeric_only=True)
            correlation_matrix = {
                str(col): {str(c2): to_jsonable(val) for c2, val in corr.loc[col].items()}
                for col in corr.columns
            }


        def to_jsonable(x):
            # Convert pandas/numpy scalars to native Python types for JSON.
            if pd.isna(x):
                return None
            if isinstance(x, (pd.Timestamp,)):
                return str(x)
            try:
                return x.item()  # numpy scalar -> python scalar
            except Exception:
                return x

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

            # IQR outlier bounds using Tukey's rule (1.5 * IQR)
            if q1 is None or q3 is None:
                iqr = None
                lower_bound = None
                upper_bound = None
                outlier_count = 0
            else:
                iqr_val = q3 - q1
                lower_bound_val = q1 - 1.5 * iqr_val
                upper_bound_val = q3 + 1.5 * iqr_val

                # Count outliers excluding NaNs
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


        # Top 5 most frequent values for each categorical (non-numeric) column
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
            "dtypes": df.dtypes.astype(str).to_dict(),
            "missing_values": missing_values,
            "numeric_summary": numeric_summary,
            "iqr_outliers": iqr_outliers,
            "correlation_matrix": correlation_matrix,
            "categorical_top_frequencies": categorical_top_frequencies,
        }




    except Exception as e:
        return {
            "error": str(e)
        }
