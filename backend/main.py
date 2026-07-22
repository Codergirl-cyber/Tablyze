import io
import logging
import time
from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
import traceback
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os
from groq import Groq
from cache import RedisCache

# Configure structured logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Environment variable handling
# On Vercel: env vars are injected by Vercel Dashboard, NOT from .env files.
# On local dev: export GROQ_API_KEY=... or use a backend/.env file manually.
# We do NOT call load_dotenv() here because in Vercel serverless it can
# accidentally load stale/shadow .env files and override Dashboard vars.
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Initialise the Redis cache (fails gracefully if Redis is unavailable)
# ---------------------------------------------------------------------------
cache = RedisCache()

# ---------------------------------------------------------------------------
# Groq client initialisation with debug logging
# ---------------------------------------------------------------------------
groq_client = None
groq_client_init_error = None
groq_api_key = os.getenv("GROQ_API_KEY")

if not groq_api_key:
    logger.warning(
        "[DEBUG] GROQ_API_KEY env var is NOT SET (empty or missing). "
        "Groq client will NOT be available. Make sure it is configured "
        "in the Vercel Dashboard → Backend project → Environment Variables."
    )
    groq_client_init_error = "GROQ_API_KEY is not set"
else:
    # Mask the key for safe logging — show first 4 + last 4 chars
    masked = groq_api_key[:4] + "****" + groq_api_key[-4:] if len(groq_api_key) > 8 else "****"
    logger.info(
        "[DEBUG] GROQ_API_KEY is SET (masked: %s, length=%d). Attempting Groq client init...",
        masked,
        len(groq_api_key),
    )
    try:
        groq_client = Groq(api_key=groq_api_key)
        logger.info("[DEBUG] Groq client initialized SUCCESSFULLY.")
    except Exception as e:
        groq_client_init_error = str(e)
        logger.warning(
            "[DEBUG] Groq client initialization FAILED: %s",
            e,
            exc_info=True,  # includes full traceback in logs
        )

logger.info("[DEBUG] groq_client is None? %s", groq_client is None)

# ---------------------------------------------------------------------------
# CORS Configuration
# Dynamically read allowed origins from env var, or use sensible defaults.
# For Vercel, set CORS_ORIGINS in the backend Dashboard to your frontend URL.
# ---------------------------------------------------------------------------
cors_origins_str = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:3000,https://tablyze.vercel.app,https://tablyze-cssx.vercel.app"
)
allowed_origins = [origin.strip() for origin in cors_origins_str.split(",") if origin.strip()]
logger.info("CORS allowed origins: %s", allowed_origins)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def generate_summary(stats: dict) -> str:
    """
    Generate a professional data summary using the Groq Chat Completions API.
    
    Args:
        stats: Dictionary containing dataset statistics (rows, columns, missing_values, 
               numeric_summary, correlation_matrix, etc.)
    
    Returns:
        A string containing the generated summary or a friendly error message.
    """
    logger.info("[DEBUG] generate_summary() CALLED. groq_client is None? %s", groq_client is None)
    
    # If Groq client failed to initialize, avoid calling it and return a clear message.
    if groq_client is None:
        logger.warning(
            "[DEBUG] generate_summary() — groq_client is None. "
            "Returning fallback message. groq_client_init_error=%s",
            groq_client_init_error,
        )
        return "Unable to generate summary at this moment. Error: Groq client not configured."

    try:
        # Format statistics for the LLM
        summary_text = f"""
Dataset Overview:
- Total Rows: {stats.get('rows', 'N/A')}
- Total Columns: {stats.get('columns', 'N/A')}
- Column Names: {', '.join(stats.get('column_names', []))}

Missing Values:
{format_missing_values(stats.get('missing_values', {}))}

Numeric Summary:
{format_numeric_summary(stats.get('numeric_summary', {}))}

Correlation Matrix (strong correlations only):
{format_correlations(stats.get('correlation_matrix', {}))}

Data Types:
{', '.join([f'{col}: {dtype}' for col, dtype in stats.get('dtypes', {}).items()])}
"""
        
        prompt = f"""You are a professional data analyst.

Analyze these dataset statistics:

{summary_text}

Your summary should:
- Mention dataset size.
- Highlight missing values.
- Mention strong correlations if present.
- Suggest possible preprocessing steps.
- Avoid speculation or unsupported conclusions.
- Keep the response concise (5–8 bullet points).

Provide your analysis as a bulleted list."""
        
        # Call Groq API with low temperature for consistency
        logger.info("[DEBUG] generate_summary() — About to call Groq API (model=llama-3.1-8b-instant)...")
        message = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.2,
        )
        
        # Extract and return the summary text
        summary_content = message.choices[0].message.content
        logger.info(
            "[DEBUG] generate_summary() — Groq API call SUCCEEDED. "
            "Response length=%d, preview=%s",
            len(summary_content),
            summary_content[:100] if summary_content else "None",
        )
        return summary_content
        
    except Exception as e:
        logger.error(
            "[DEBUG] generate_summary() — Groq API call FAILED: %s",
            str(e),
            exc_info=True,
        )
        return f"Unable to generate summary at this moment. Error: {str(e)}"


def format_missing_values(missing_values: dict) -> str:
    """Format missing values data for the summary."""
    if not missing_values:
        return "- No missing values detected."
    
    items = [f"  - {col}: {count} missing" for col, count in missing_values.items() if count > 0]
    if not items:
        return "- No missing values detected."
    return "\n".join(items)


def format_numeric_summary(numeric_summary: dict) -> str:
    """Format numeric summary statistics for the summary."""
    if not numeric_summary:
        return "- No numeric columns found."
    
    lines = []
    for col, stats in numeric_summary.items():
        lines.append(f"  - {col}: mean={stats.get('mean', 'N/A')}, std={stats.get('std', 'N/A')}, "
                     f"min={stats.get('min', 'N/A')}, max={stats.get('max', 'N/A')}")
    return "\n".join(lines) if lines else "- No numeric columns found."


def format_correlations(correlation_matrix: dict) -> str:
    """Format strong correlations (>0.7 or <-0.7) for the summary."""
    if not correlation_matrix:
        return "- No correlations calculated."
    
    strong_correlations = []
    seen_pairs = set()
    
    for col1, correlations in correlation_matrix.items():
        for col2, corr_value in correlations.items():
            if corr_value is None or col1 == col2:
                continue
            
            # Avoid duplicate pairs
            pair = tuple(sorted([col1, col2]))
            if pair in seen_pairs:
                continue
            
            # Only show strong correlations
            if abs(corr_value) > 0.7:
                strong_correlations.append(f"  - {col1} ↔ {col2}: {corr_value:.2f}")
                seen_pairs.add(pair)
    
    if not strong_correlations:
        return "- No strong correlations detected."
    return "\n".join(strong_correlations)


@app.get("/")
def home():
    return {"status": "backend running"}

@app.get("/debug/env")
def debug_env():
    """Diagnostic endpoint to check runtime environment (safe, no secrets leaked)."""
    return {
        "groq_key_set": bool(os.getenv("GROQ_API_KEY")),
        "groq_key_name_used": "GROQ_API_KEY",
        "groq_client_initialized": groq_client is not None,
        "groq_client_init_error": groq_client_init_error,
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
        # Read the raw CSV bytes for caching purposes
        csv_bytes = await file.read()

        # ------------------------------------------------------------------
        # Try fetching cached analysis results for this exact CSV content
        # ------------------------------------------------------------------
        try:
            cached = cache.get(csv_bytes)
            if cached is not None:
                logger.info("Cache HIT — returning cached analysis")
                return cached
            logger.info("Cache MISS — performing fresh analysis")
        except Exception as exc:
            logger.warning("Cache lookup failed — proceeding with analysis: %s", exc)

        # Parse CSV from bytes
        df = pd.read_csv(io.BytesIO(csv_bytes))

        total_rows = len(df)
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

        # Create stats dictionary for AI summary generation
        stats = {
            "rows": df.shape[0],
            "columns": df.shape[1],
            "column_names": list(df.columns),
            "dtypes": df.dtypes.astype(str).to_dict(),
            "missing_values": missing_values,
            "numeric_summary": numeric_summary,
            "correlation_matrix": correlation_matrix,
        }

        # Generate AI summary
        logger.info("[DEBUG /upload] About to call generate_summary()...")
        try:
            ai_summary = generate_summary(stats)
            logger.info(
                "[DEBUG /upload] generate_summary() returned. "
                "ai_summary type=%s, length=%d, preview=%s",
                type(ai_summary).__name__,
                len(ai_summary) if ai_summary else 0,
                ai_summary[:120] if ai_summary else "None/Empty",
            )
        except Exception as exc:
            ai_summary = "AI summary unavailable."
            logger.error(
                "[DEBUG /upload] generate_summary() raised an UNEXPECTED exception: %s",
                exc,
                exc_info=True,
            )

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
            "ai_summary": ai_summary,
        }

        logger.info(
            "[DEBUG /upload] Final result keys=%s, ai_summary field type=%s, preview=%s",
            list(result.keys()),
            type(result["ai_summary"]).__name__,
            str(result["ai_summary"])[:120] if result["ai_summary"] else "None/Empty",
        )

        # ------------------------------------------------------------------
        # Store the analysis result in the cache for future requests
        # ------------------------------------------------------------------
        try:
            cache.set(csv_bytes, result)
        except Exception as exc:
            logger.warning("Failed to cache analysis result: %s", exc)

        return result




    except Exception as e:
            # Log full traceback for easier debugging in server logs
            traceback.print_exc()
            return JSONResponse(content={"error": str(e)}, status_code=500)
