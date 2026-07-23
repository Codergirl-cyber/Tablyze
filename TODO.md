# Debug Logging Task

## Steps
- [x] 1. Analyze codebase to understand Groq integration (main.py, route.ts, cache.py, vercel.json)
- [x] 2. Create TODO.md with task tracking
- [x] 3. Add module-level `debug_logs` list and helper in `backend/main.py`
- [x] 4. Enhance Groq init logging (GROQ_API_KEY exists, client init status, init error)
- [x] 5. Enhance `generate_summary()` logging (model, start, success, exception)
- [x] 6. Return `debug` field in `/upload` response when not production
- [x] 7. Verify no business logic was changed

