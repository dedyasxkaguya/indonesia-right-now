# AI Chatbot API — Frontend Contract

Endpoint: `POST /api/chat`

## Request

`Content-Type: application/json`

```json
{
  "mode": "IGS",
  "page_context": "Ekonomi",
  "dataset_name": "PDRB per Kapita",
  "context_data": "Pendapatan regional...",
  "question": "Berapa PDRB Jawa Barat tahun 2024?"
}
```

### Field constraints

| Field | Type | Required | Max length | Description |
|---|---|---|---|---|
| `mode` | string | yes | 32 | Chat mode, e.g. `"IGS"` |
| `page_context` | string | yes | 64 | Current page, e.g. `"Ekonomi"`, `"Analitik"` |
| `dataset_name` | string | yes | 128 | Dataset being viewed, e.g. `"PDRB per Kapita"` |
| `context_data` | string | yes | 10,000 | Pre-summarized Markdown table or text of the *visible* data. Keep it to **10 rows / ~3.000 characters**; statistics are computed by the backend tool, not by the model. |
| `question` | string | yes | 2,000 | User's question in Indonesian |

The backend rejects requests that include extra fields (`422 VALIDATION_ERROR`). All string fields are trimmed and validated for control characters.

### How the frontend must prepare `context_data`

- Send **only the data currently visible** to the user on that page.
- Represent it as a compact Markdown table or short prose, **not raw JSON**.
- Example for a table:

```markdown
| Provinsi | PDRB 2023 (Miliar Rp) | Pertumbuhan (%) |
|---|---|---|
| Jawa Barat | 3.200 | 5,12 |
| DKI Jakarta | 4.100 | 3,85 |
```

- Send at most **10 rows** and about **3.000 characters**. This is a sample, not the whole dataset.
- Do **not** send the entire dataset. The backend does not fetch data.
- Keep numbers in the exact format shown to the user. The model mirrors numbers it reads; for
  mean/median/sum it calls a backend tool that parses the same rows.
- List the value column last in each row; the backend reads the last numeric cell.
- If the current view has no data rows, send a short note: `"Tidak ada data yang terlihat pada halaman ini."`

## Success response

Status `200`. Standard envelope:

```json
{
  "ok": true,
  "data": {
    "answer": "Berdasarkan data yang diberikan, PDRB Jawa Barat tahun 2023 adalah 3.200 Miliar Rp dengan pertumbuhan 5,12%.",
    "model": "openai/gpt-oss-120b",
    "scope_locked": true,
    "duration_ms": 1420,
    "tool_execution_id": null
  },
  "error": null,
  "meta": {
    "request_id": "uuid-here",
    "duration_ms": 1450,
    "service": "indonesia-right-now",
    "version": "0.1.0",
    "ai": {
      "model": "openai/gpt-oss-120b",
      "duration_ms": 1420,
      "scope_locked": true
    }
  }
}
```

### Response fields

| Field | Type | Description |
|---|---|---|
| `answer` | string | Jawaban dalam Bahasa Indonesia, singkat, profesional, tanpa emoji |
| `model` | string | Model yang digunakan (`openai/gpt-oss-120b`) |
| `scope_locked` | boolean | `true` jika jawaban stick pada scope data yang diberikan |
| `duration_ms` | integer | Durasi pemrosesan dalam milidetik |
| `tool_execution_id` | string \| null | ID panggilan tool Groq bila model memakai `query_dataset_aggregate`; `null` jika jawaban langsung |

## Error responses

### Out-of-scope question

The backend does **not** return a special error for out-of-scope questions. The AI answers in Indonesian with the exact rejection message:

> Maaf, saya hanya dapat menjawab pertanyaan seputar data pada halaman ini.

The frontend should display this answer normally. `scope_locked` will be `true`.

### Validation error (422)

```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "question melebihi batas maksimum 2000 karakter.",
    "details": {
      "field": "question",
      "max_length": 2000
    }
  },
  "meta": { ... }
}
```

### AI disabled (503)

```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "CHAT_AI_DISABLED",
    "message": "AI chatbot sedang tidak aktif.",
    "details": {}
  },
  "meta": { ... }
}
```

### System / provider error (500 / 502)

```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "CHAT_AI_FAILED",
    "message": "Terjadi kesalahan sistem, silakan hubungi admin.",
    "details": {}
  },
  "meta": { ... }
}
```

Other transient provider errors (timeout, upstream failure) use the same generic user-facing message. The exact cause is logged server-side only.

## Tool calling (aggregate questions)

The model no longer has to do arithmetic in its head, which used to fail on
large tables and waste tokens. `/chat` offers one tool:

```json
{
  "type": "function",
  "function": {
    "name": "query_dataset_aggregate",
    "description": "Compute mean, median, or sum over the dataset currently shown to the user.",
    "parameters": {
      "type": "object",
      "properties": {
        "metric": { "type": "string", "enum": ["mean", "median", "sum"] },
        "group_by": { "type": "string" },
        "filter": { "type": "object", "additionalProperties": true }
      },
      "required": ["metric", "group_by"],
      "additionalProperties": false
    }
  }
}
```

Flow: the model asks for the tool, the backend computes the statistic from the
rows in `context_data` (Indonesian separators such as `3.200` and `3,5` are
understood), then the model writes the final Indonesian sentence. Answers that
use the tool return a non-null `tool_execution_id`; direct answers return `null`.

The tool only sees what the frontend sent. If a statistic needs rows outside the
sample, the answer says the data is unavailable rather than inventing a number.
No frontend change is required: the request schema is unchanged.

## Scope rules enforced by the backend

The system prompt instructs the model to:

1. Answer **only** from the provided `context_data`.
2. Reject off-topic questions (general knowledge, math, IRN news, etc.) with the exact Indonesian rejection message above.
3. Never invent numbers. If a figure is not in the visible context, say the data is not available.
4. Mirror numbers exactly as they appear in the context — do not add commas, currency symbols, or rounding.
5. Respond in Indonesian, short, professional, no emojis.
6. Keep answers to a few sentences.

## Configuration (backend settings)

| Setting | Default | Effect |
|---|---|---|
| `AI_ENABLED` | `true` | If `false`, `/chat` returns 503 |
| `GROQ_API_KEY` | — | Required when AI is enabled |
| `AI_EXTRACTOR_MODEL` | `openai/gpt-oss-120b` | Model used for chat answers |
| `AI_REQUEST_TIMEOUT` | `120` | Groq request timeout in seconds |
| `APP_ENV` | `development` | Rate limiting enabled only in `production` |
| `TRENDING_BATCH_CONCURRENCY` | `1` | Unrelated to chat; bounds Groq clustering concurrency |

Rate limit in production: **30 requests per minute** per IP.

## 16 UX/Quality suggestions implemented

1. **Strict schema validation** — `ChatRequest` uses `extra="forbid"` to reject unknown fields.
2. **Field length limits** — every string field has `min_length`/`max_length` to bound token exposure.
3. **Empty-question rejection** — whitespace-only or control-character-only `question`/`context_data` is rejected early with a clear 422.
4. **Strict scope-locked system prompt** — model is instructed to answer only from the provided context.
5. **Explicit out-of-scope rejection phrase** — the exact Indonesian sentence the model must use when rejecting.
6. **System prompt as a single maintainable constant** — `IGS_SYSTEM_PROMPT` in `app/services/chat.py`, not inline in the route.
7. **Uses configured extractor model** — reads `AI_EXTRACTOR_MODEL` from settings, not a hardcoded model ID.
8. **Temperature = 0** — factual, grounded answers via `_call_model` with `temperature=0`.
9. **Bounded answer length** — `max_tokens=1024` caps runaway output.
10. **Exponential backoff for Groq 429** — retries after 2s, then 4s, then 8s before failing with the generic 502.
11. **Generic user-facing error on provider failure** — users see `"Terjadi kesalahan sistem, silakan hubungi admin."` never the raw exception.
12. **Real provider errors logged server-side** — structured logs capture model, error type, and a truncated message, redacted from the client.
13. **API-key middleware applied** — the existing `RequestContextMiddleware` covers `/chat`; if `API_KEY` is set, the frontend must send `X-API-Key`.
14. **Production rate limiting** — `/chat` is wrapped with `limiter.limit("30/minute")` in production.
15. **Input sanitization for prompt injection** — control characters are stripped from user input; `context_data` is treated as untrusted and never placed inside instruction position.
16. **Indonesian, short, professional, no emojis** — system prompt enforces language, tone, and length; answers are kept concise.

## Frontend integration checklist

- Send the request as `POST /chat` with `Content-Type: application/json`.
- Include `X-API-Key` if the deployment configures `API_KEY`.
- Prepare `context_data` as compact Markdown; keep it under 10,000 characters and under ~50 visible rows.
- Do not send the entire dataset or raw JSON; summarize off-screen rows.
- Branch on `ok` and `error.code`; on success, display `data.answer`.
- Treat `scope_locked: true` as the model having stuck to the provided data.
- Show the generic system error message to users on 500/502; do not surface internals.
- Track `meta.request_id` for support/debugging.
