# Fix: AI Summary not showing on Vercel

## Plan
- [x] 1. Analyze root causes (CORS mismatch, Vercel timeout, fallback handling)
- [x] 2. Fix `backend/main.py` — Add CORS origin `tablyze-3qkp.vercel.app` + improve error handling
- [x] 3. Fix `backend/vercel.json` — Add function config (memory: 512MB, maxDuration: 30s)
- [x] 4. Fix `app/page.tsx` — Improve `summaryToShow` extraction robustness
- [x] 5. Verify build with `npm run build` or `npm run dev`

