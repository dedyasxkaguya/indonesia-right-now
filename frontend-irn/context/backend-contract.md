# Backend contract summary (from README.md)

- Service base: http://localhost:8000
- No API key required (API_KEY empty in .env)
- Single worker (APP_WORKERS=1)
- Endpoints consumed by frontend:
  - GET /news  → NewsResponse (see news-response.example.json)
  - POST /fetch → FetchResponse (see fetch-response.example.json)
  - POST /news/ai → NewsCluster[] + verification (AI cleansing; backend owns GROQ_API_KEY)
  - GET /news/ai/jobs/{id} → AI cleansing job status
- Relevant error codes:
  FETCH_SSRF_BLOCKED (400), FETCH_FORBIDDEN (403), FETCH_TIMEOUT (504),
  FETCH_NO_CONTENT (422), FETCH_AI_GUARD_BLOCKED (403),
  FETCH_AI_EXTRACTOR_FAILED (502), FETCH_AI_CONFIG (500), FETCH_INTERNAL (500),
  NEWS_ALL_SOURCES_FAILED (502), NEWS_NO_ITEMS_FETCHED (422),
  NEWS_INVALID_CONFIG (400), NEWS_WRITE_FAILED (500),
  VALIDATION_ERROR (422), REQUEST_TIMEOUT (504)
- /fetch is slow (10–25s); set client timeout ≥ 60s
- /news is fast (~10s); safe to cache 60s
