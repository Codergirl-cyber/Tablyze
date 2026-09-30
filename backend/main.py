import io
import logging
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os
from cache import RedisCache

# Configure structured logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Initialise the Redis cache (fails gracefully if Redis is unavailable)
# ---------------------------------------------------------------------------
cache = RedisCache()

# ---------------------------------------------------------------------------
# CORS Configuration
# Dynamically read allowed origins from env var, or use sensible defaults.
# For Vercel, set CORS_ORIGINS in the backend Dashboard to your frontend URL.
# ---------------------------------------------------------------------------
cors_origins_str = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,https://tablyze.vercel.app,https://tablyze-cssx.vercel.app,https://tablyze-3qkp.vercel.app"
)
allowed_origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]
logger.info("CORS allowed origins: %s", allowed_origins)

app = FastAPI()
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
UPLOAD_CACHE_ENABLED = False

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def home():
    return {"status": "backend running"}

@app.get("/debug/env")
def debug_env():
    """Diagnostic endpoint to check runtime environment (safe, no secrets leaked)."""
    if os.getenv("VERCEL_ENV") == "production" or os.getenv("NODE_ENV") == "production":
        return JSONResponse(content={"error": "Not found"}, status_code=404)

    return {
        "redis_available": cache.available,
        "redis_url_set": bool(os.getenv("REDIS_URL")),
        "cors_origins": allowed_origins,
        "python_version": os.sys.version,
    }

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    def to_jsonable(val):
        # Minimal helper to keep JSON-serializable output for pandas/numpy scalars
        if pd.isna(val):
            return None
        if hasattr(val, "item"):
            try:
                return val.item()
            except Exception:
                pass
        return val

    try:
        if not file.filename or not file.filename.lower().endswith(".csv"):
            return JSONResponse(
                content={"error": "Please upload a CSV file."},
                status_code=400,
            )

        # Read the upload in bounded chunks so oversized files are rejected early.
        chunks = []
        total_bytes = 0
        while chunk := await file.read(1024 * 1024):
            total_bytes += len(chunk)
            if total_bytes > MAX_UPLOAD_BYTES:
                return JSONResponse(
                    content={"error": "CSV files must be 10 MB or smaller."},
                    status_code=413,
                )
            chunks.append(chunk)

        csv_bytes = b"".join(chunks)
        if len(csv_bytes) > MAX_UPLOAD_BYTES:
            return JSONResponse(
                content={"error": "CSV files must be 10 MB or smaller."},
                status_code=413,
            )

        # ------------------------------------------------------------------
        # Try fetching cached analysis results for this exact CSV content
        # ------------------------------------------------------------------
        if UPLOAD_CACHE_ENABLED:
            try:
                cached = cache.get(csv_bytes)
                if cached is not None:
                    logger.info("Cache HIT — returning cached analysis")
                    return cached
                logger.info("Cache MISS — performing fresh analysis")
            except Exception as exc:
                logger.warning("Cache lookup failed — proceeding with analysis: %s", exc)

        # Parse CSV from bytes
        try:
            df = pd.read_csv(io.BytesIO(csv_bytes))
        except (pd.errors.EmptyDataError, pd.errors.ParserError, UnicodeDecodeError) as exc:
            return JSONResponse(
                content={"error": f"Invalid CSV file: {exc}"},
                status_code=400,
            )
        except Exception:
            logger.exception("CSV parsing failed unexpectedly")
            return JSONResponse(
                content={"error": "The CSV file could not be processed."},
                status_code=422,
            )

        total_rows = len(df)
        duplicate_rows = int(df.duplicated().sum())
        missing_series = df.isna().sum(axis=0)

        missing_values = {}
        for col in df.columns:
            missing_count = int(missing_series[col])
            missing_values[str(col)] = missing_count

        numeric_df = df.select_dtypes(include=["number"])

        # Correlation matrix (numeric columns only). If <2 numeric columns, return empty.
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

        result = {
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

        # ------------------------------------------------------------------
        # Store the analysis result in the cache for future requests
        # ------------------------------------------------------------------
        if UPLOAD_CACHE_ENABLED:
            try:
                cache.set(csv_bytes, result)
            except Exception as exc:
                logger.warning("Failed to cache analysis result: %s", exc)

        return result




    except Exception:
        logger.exception("Unexpected error while processing upload")
        return JSONResponse(
            content={"error": "The upload could not be processed."},
            status_code=500,
        )
