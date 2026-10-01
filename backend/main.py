import os
import io
import logging
from pathlib import Path

from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env", override=False)

from fastapi import FastAPI, UploadFile, File
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import os
from pydantic import BaseModel, Field
from cache import RedisCache
from analysis import analyze_dataframe
from agent.agent import AgentError, investigate
from agent.state import dataset_store

# Configure structured logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_groq_key = os.getenv("GROQ_API_KEY", "")
logger.info(
    "LLM configuration: provider=%s model=%s groq_api_key_present=%s groq_api_key_length=%d",
    os.getenv("LLM_PROVIDER", "<unset>"),
    os.getenv("LLM_MODEL", "llama3.2"),
    bool(_groq_key),
    len(_groq_key),
)
del _groq_key

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


class InvestigateRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=4000)


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
        "dataset_loaded": dataset_store.has_dataset(),
        "llm_provider": os.getenv("LLM_PROVIDER", "<unset>"),
    }


@app.post("/upload")
async def upload(file: UploadFile = File(...)):
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
                    dataset_store.set_dataset(
                        pd.read_csv(io.BytesIO(csv_bytes)),
                        file.filename,
                    )
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

        result = analyze_dataframe(df)
        dataset_store.set_dataset(df, file.filename)

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


@app.post("/api/agent/investigate")
def agent_investigate(body: InvestigateRequest):
    stored = dataset_store.get_dataset()
    if stored is None:
        return JSONResponse(
            content={
                "error": "No dataset uploaded. Upload a CSV via POST /upload first.",
                "code": "no_dataset",
            },
            status_code=400,
        )

    try:
        payload = investigate(body.question, stored.dataframe)
        return {
            "question": payload["question"],
            "answer": payload["answer"],
            "evidence": payload["evidence"],
            "tools_used": payload["tools_used"],
            "investigation": payload["investigation"],
        }
    except AgentError as exc:
        status = 503 if exc.code == "llm_unavailable" else 400
        if exc.code == "empty_dataset":
            status = 400
        return JSONResponse(
            content={"error": str(exc), "code": exc.code},
            status_code=status,
        )
    except Exception:
        logger.exception("Agent investigation failed")
        return JSONResponse(
            content={"error": "Investigation could not be completed.", "code": "agent_failure"},
            status_code=500,
        )
