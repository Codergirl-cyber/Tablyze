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

        # Summary statistics for all numeric columns
        numeric_df = df.select_dtypes(include=["number"])

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
        for col in numeric_df.columns:
            s = numeric_df[col]
            stats = {
                "count": int(s.count()),
                "mean": to_jsonable(s.mean()),
                "std": to_jsonable(s.std()),
                "min": to_jsonable(s.min()),
                "25%": to_jsonable(s.quantile(0.25, interpolation="linear"))
                if s.count() > 0
                else None,
                "50%": to_jsonable(s.quantile(0.50, interpolation="linear"))
                if s.count() > 0
                else None,
                "75%": to_jsonable(s.quantile(0.75, interpolation="linear"))
                if s.count() > 0
                else None,
                "max": to_jsonable(s.max()),
            }
            numeric_summary[str(col)] = stats

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
            "categorical_top_frequencies": categorical_top_frequencies,
        }


    except Exception as e:
        return {
            "error": str(e)
        }
