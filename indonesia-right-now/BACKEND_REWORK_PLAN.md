# Backend rework plan and record

Date: 2026-11-11
Scope: FastAPI backend in this repository. No frontend code was changed.

## 1. What the frontend reported

- `GET /health` returned 200; the backend was reachable.
- `GET /news` worked but took **17–39 s**, exceeding the frontend proxy's 15 s
  server-side timeout and producing `UPSTREAM_TIMEOUT` on Dashboard/Analitik.
- `GET /news/trending` returned **500 INTERNAL_ERROR** consistently.
- `POST /chat` returned **502 CHAT_AI_FAILED** after roughly 62 s.

## 2. Defects found in the backend

### D1 — `_groq_chat` return-shape regression (root cause of the 500s)

`app/services/ai.py::_groq_chat` had been changed to return a 4-tuple
`(content, tokens, tool_call_id, tool_arguments)` for the chatbot, but
`_call_model` forwarded the 4-tuple while every non-chat caller still unpacked
two values:

- `app/services/trending.py` → `content, _ = await _call_model(...)`
- `app/services/ai.py::run_guard`
- `app/services/ai.py::extract_news`
- `app/services/article_ai.py`

Unpacking raised `ValueError: too many values to unpack`, which surfaced as
`TRENDING_GENERATION_FAILED` (500 in the deployed build) and broke `/fetch` and
`/news/detail/` as well.

### D2 — tools sent on every model call

`_groq_chat` unconditionally passed `tools` and `tool_choice="auto"`, so the
prompt-injection guard and the extractor could answer with a tool call instead of
the JSON their parsers require.

### D3 — chat tool round-trip was invalid and blocking

- `app/services/chat.py` called `json.dumps` without importing `json`.
- The follow-up request appended only a `role: "tool"` message without the
  preceding `assistant` message carrying `tool_calls`, and without
  `tool_call_id`. Groq rejects that sequence.
- Retries used `time.sleep(2/4/8/16/32)` inside the async request path, blocking
  the event loop and producing the observed ~62 s hang before a 502.
- The router dropped `tool_execution_id` from the response body.
- A missing key returned the internal message "Kunci AI tidak dikonfigurasi."
  instead of the generic system error used everywhere else.

### D4 — no caching for `/news`

Every page load re-contacted all configured feeds (16 s measured with the
`legal` tier). Nothing was reused between requests, so the frontend proxy
timed out.

### D5 — trending batches serial and provider-limited

Trending clusters ~190 articles in batches of 10. Running them concurrently at 5
is faster but exhausts the account's per-minute Groq limit (observed 429 storms),
so concurrency is now configurable with a safe serial default.

## 3. Fixes applied

| Area | Change |
|---|---|
| `app/services/ai.py` | `_groq_chat` accepts optional `tools`/`tool_choice`; returns `(content, tokens, tool_call_id, tool_arguments)`. `_call_model` returns `(content, tokens)`; new `_call_model_with_tools` is used only by chat. Exponential backoff is 2 s → 4 s → 8 s. |
| `app/services/trending.py` | Bounded-concurrency batch clustering via `TRENDING_BATCH_CONCURRENCY` (default 1). |
| `app/services/chat.py` | Valid assistant-tool-call → tool-result sequence with `tool_call_id`; `json` imported; no blocking sleeps (ProviderError is handled once); generic message for a missing key. |
| `app/services/chat.py` | `query_dataset_aggregate` rewritten: detects the last numeric cell, understands `3.200`, `3,5`, `Rp`, `%`, negatives, and honours an optional filter. |
| `app/routers/chat.py` | Returns `tool_execution_id`. |
| `app/routers/news.py` | Per-query TTL cache (`NEWS_CACHE_TTL`, default 300 s), bounded to 32 entries, shared across GET/POST. |
| `app/config.py` | New `news_cache_ttl` and `trending_batch_concurrency` settings, both validated. |
| `.env.example` | Documents the two new settings. |

## 4. Verification

Full suite: `python -m pytest -q` → **191 passed**.

Live server on port 8012 (`GET /news` default query, `legal` tier):

| Endpoint | Cold | Warm (cached) | Status |
|---|---:|---:|---|
| `GET /health` | 0.002 s | — | 200 |
| `GET /news` | 16.1 s | 0.003 s | 200 |
| `GET /news/trending` | 56.8 s | 0.003 s | 200 (was 500) |
| `POST /chat` (direct answer) | 0.52 s | — | 200 |
| `POST /chat` (aggregate tool) | 2.35 s | — | 200, `tool_execution_id` set |

The aggregate tool returned `2500.00` for the mean of 1.000 / 3.000 / 2.000 /
4.000, confirming the Python computation rather than model arithmetic.

The first request for any query is still slow because feed collection is
network-bound; only repeats are instant. `TRENDING_CACHE_TTL` (1 h) means the
slow trending pass happens at most once per hour.

## 4.1 Live smoke test of /fetch and /news/detail/

Run against the live server after the fixes above.

| Case | Result |
|---|---|
| `POST /fetch` static `https://example.com` | 200, 1.9 s, guard pass, 1 chunk |
| `POST /fetch` static `https://news.ycombinator.com` | 200, 2/2 chunks OK, 30 raw items extracted (previously 1 chunk failed because the model returned non-JSON) |
| `GET /news/detail/` short ANTARA feed article | 200, 3.1 s, 1.096 -> 1.006 chars (ratio 0.918) |
| `GET /news/detail/` long Wikipedia article (9 chunks) | 502 `NEWS_DETAIL_AI_FAILED` on the account's 8.000 TPM Groq limit |

Two defects were found and fixed during this smoke test:

1. **False-positive article rejection.** A legitimate chunk was rejected at ratio
   0.715 against a 0.72 floor, and 9 "missing numbers" were Wikipedia citation
   markers like `[12]`. `_validate_preservation` now strips bracketed citations
   before comparing numbers and uses a 0.65 length floor, with the 0.72
   word-overlap and number checks unchanged as the real fidelity guards. A
   stricter retry also runs before failing a chunk.
2. **Intermittent non-JSON extraction output.** The extractor could return the
   item list as a bare JSON array; `_json_payload` now wraps that form, and
   extraction `max_tokens` was raised to 4096 for item-heavy chunks.

The remaining long-article failure is a provider quota limit, not a code path:
a 9-chunk article needs roughly 20k tokens, which cannot fit in an 8.000 TPM
budget inside the 120 s request timeout. It maps to the generic 502.

## 5. Notes and limits

- Caches are process-local; the service must keep `APP_WORKERS=1`.
- Cached `/news` documents keep the `snapshot` block from the generating run.
- Trending cold time exceeds the frontend's 60 s abort; a request that is
  aborted still finishes server-side and populates the cache for the next load.
- Live `/fetch` and `/news/detail/` were not exercised end-to-end here because
  they need arbitrary public URLs; they share the fixed `_call_model` path and
  are covered by the unit suite.
