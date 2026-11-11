# Frontend contract — Presenter IRN chatbot

`POST /chat/irn` is the IRN (Indonesia Right Now) news assistant. It is separate
from the IGS dataset assistant at `POST /chat`; use whichever matches the mode
the user is in.

## Endpoint

```
POST /chat/irn
Content-Type: application/json
```

If `API_KEY` is configured on the backend, send `X-API-Key` like every other
endpoint. Responses use the standard envelope: `{ok, data, error, meta}`.

## Request

```json
{
  "mode": "IRN",
  "page_context": "Hari Ini",
  "visible_articles": [
    {
      "title": "Harga beras naik di sejumlah daerah",
      "publisher": "ANTARA",
      "category": "Ekonomi",
      "summary": "Harga beras naik pada pekan ini.",
      "url": "https://www.antaranews.com/berita/123",
      "published_at": "2026-11-11T08:00:00+07:00"
    }
  ],
  "question": "Ada berita lain tentang topik ini?"
}
```

| Field | Type | Required | Limits |
|---|---|---|---|
| `mode` | string | yes | must be exactly `"IRN"` |
| `page_context` | string | yes | 1–64 chars (`Hari Ini`, `Dashboard`, `Artikel`) |
| `visible_articles` | array | no | max **10** items |
| `question` | string | yes | 1–2000 chars |

`visible_articles[]`:

| Field | Type | Required | Max |
|---|---|---|---|
| `title` | string | yes | 400 |
| `publisher` | string or null | no | 160 |
| `category` | string or null | no | 120 |
| `summary` | string or null | no | 1000 |
| `url` | string or null | no | 2048 |
| `published_at` | string or null | no | 64 |

Unknown fields are **rejected** with 422. Send card metadata only — never the
full article body.

## Response — success

```json
{
  "ok": true,
  "data": {
    "answer": "Selain ANTARA, topik ini juga diliput Kompas dan Tempo. Ketiganya menekankan kenaikan harga di pasar tradisional.",
    "model": "openai/gpt-oss-120b",
    "scope_locked": false,
    "duration_ms": 812,
    "tool_execution_ids": ["call_abc123"]
  },
  "error": null,
  "meta": {
    "request_id": "01a1c7d5-...",
    "duration_ms": 815.42,
    "service": "indonesia-right-now",
    "version": "0.1.0"
  }
}
```

- `tool_execution_ids` is a **list**: one ID per executed tool call, in order.
  It is empty when no tool ran. At most 2 IDs per message.
- `scope_locked` is `true` when the assistant refused an off-topic question.

## Response — errors

Validation (422):

```json
{
  "ok": false,
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "details": {
      "errors": [
        {"loc": ["body", "visible_articles"], "msg": "List should have at most 10 items", "type": "too_long"}
      ]
    }
  },
  "meta": {"request_id": "01a1c7d5-...", "duration_ms": 1.2, "service": "indonesia-right-now", "version": "0.1.0"}
}
```

| Status | `error.code` | Meaning |
|---|---|---|
| 422 | `VALIDATION_ERROR` | Bad fields, wrong `mode`, more than 10 articles |
| 500 | `CHAT_IRN_AI_CONFIG` | Provider credentials rejected / missing |
| 502 | `CHAT_IRN_AI_FAILED` | Provider unavailable |
| 503 | `CHAT_IRN_AI_DISABLED` | `AI_ENABLED=false` on the server |
| 429 | `RATE_LIMITED` | Production rate limit (30/min) |

Error messages are intentionally generic; show a retry hint, not the raw text.

## Personality to expect

**Presenter IRN** is a warm, professional, journalistic research companion. It
addresses the user as "Anda", greets warmly on a fresh conversation, avoids
emoji, and answers in 3–4 sentences unless it is listing sources. It speaks
Indonesian only.

Two behavioural rules the UI should surface honestly:

1. **Scope.** It only discusses the articles on screen and what its tools find.
   Off-topic questions produce exactly:
   `"Maaf, saya hanya dapat membantu Anda memahami berita yang sedang tampil di halaman ini."`
2. **No truth verdicts.** It cannot say an article is true, hoax, fake, or
   accurate, and it never rates publishers. For "apakah berita ini benar?" it
   replies with how many publishers cover the story and a suggestion to check the
   original source. Do not label that answer as fact-checking in the UI.

## Tools

| Tool | Purpose | Result |
|---|---|---|
| `search_related_news(query, limit)` | Find other articles in the current news pool | max 5 `{title, publisher, url}` |
| `analyze_source_diversity(topic)` | Count distinct publishers covering a topic | `{total_articles, unique_publishers, publisher_count}` |

Limits: 5 search results, 3 s search timeout, 2 s diversity timeout, **2 executed
tool calls per message**. Tools never fetch external pages; an empty pool simply
returns no results.

## Frontend implementation notes

1. Send **max 10 visible articles** with only `title`, `publisher`, `category`,
   `summary`, `url`, `published_at`. Do not send full article content.
2. Render `tool_execution_ids` only for debugging/telemetry. Do not show raw IDs
   or raw tool payloads to users.
3. Treat `scope_locked: true` as a normal 200 answer (display it), not an error.
   Show `duration_ms` only if you have a debug mode; typical responses are
   sub-second when no tool is used, and up to ~3 s with a tool round-trip.
4. The backend is single-worker with an in-memory article pool; the pool is
   populated by `/news`. If the user's first action is a chat before any `/news`
   load, tool results may be empty — that is expected, and the assistant still
   answers from `visible_articles`.
