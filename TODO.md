# Fix: AI summary not showing in deployed version

## Changes Made

### 1. `backend/main.py`
- **Removed `load_dotenv()` calls** — In Vercel serverless, `.env` files can shadow Dashboard env vars. Now uses `os.getenv()` directly.
- **Fixed CORS origins** — Changed from hardcoded list to dynamic via `CORS_ORIGINS` env var with sensible defaults including `https://tablyze-cssx.vercel.app`.
- **Improved logging** — Added `logging.basicConfig`, structured logger messages for easier debugging.

### 2. `app/api/upload/route.ts`
- **Added request timeout** — 60s AbortController timeout for backend processing.
- **Better logging** — Logs the backend URL being called and response preview.

### 3. `backend/cache.py`
- **🔧 PENDING: Optimize Redis** — Reduce connection timeout from 2s to 0.5s to avoid cold start delays on Vercel.

## Required Actions (user must do)

### A. Backend Vercel Project
Set these environment variables in Vercel Dashboard:
- `GROQ_API_KEY` = your Groq API key
- `CORS_ORIGINS` = `http://localhost:3000,https://YOUR_FRONTEND_URL.vercel.app`

### B. Frontend Vercel Project
Set these environment variables in Vercel Dashboard:
- `BACKEND_URL` = `https://tablyze-cssx.vercel.app`
- (or `NEXT_PUBLIC_API_URL` as an alias)

