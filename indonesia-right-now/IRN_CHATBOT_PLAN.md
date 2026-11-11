# Presenter IRN — implementation plan

New chatbot for **IRN (Indonesia Right Now)** mode. It is a separate endpoint,
service, schema, and tool set from the IGS dataset assistant. `POST /chat`,
`app/services/chat.py`, `app/routers/chat.py`, and the IGS tool
(`query_dataset_aggregate`) are untouched.

## 1. Endpoint

| Item | Value |
|---|---|
| Route | `POST /chat/irn` |
| Router | `app/routers/chat_irn.py` (new) |
| Service | `app/services/chat_irn.py` (new) |
| Schemas | `app/schemas/chat_irn.py` (new) |
| Tools | `app/services/irn_tools.py` (new) |
| Shared article pool | `app/services/news_cache.py` (new) |
| Rate limit (production) | `30/minute`, same as IGS |
| Envelope | Unchanged `{ok, data, error, meta}` |
| Error codes | `CHAT_IRN_AI_DISABLED` (503), `CHAT_IRN_AI_CONFIG` (500), `CHAT_IRN_AI_FAILED` (502), `VALIDATION_ERROR` (422) |

IGS returns `tool_execution_id: str | None`. IRN can run more than one tool per
message, so it returns `tool_execution_ids: list[str]`.

## 2. Request schema

`ChatIRNRequest` — `extra="forbid"` everywhere, so contract drift is a 422:

| Field | Type | Limits |
|---|---|---|
| `mode` | literal `"IRN"` | required |
| `page_context` | string | 1–64 chars, e.g. `"Hari Ini"`, `"Dashboard"`, `"Artikel"` |
| `visible_articles` | list of `VisibleArticle` | max **10** items |
| `question` | string | 1–2000 chars, control characters stripped |

`VisibleArticle`: `title` (required, ≤400), `publisher` (≤160), `category`
(≤120), `summary` (≤1000), `url` (≤2048), `published_at` (≤64). No full article
body is accepted; unknown fields such as `content` are rejected.

## 3. Response schema

```json
{
  "answer": "Harga beras naik dilaporkan ANTARA dan Kompas...",
  "model": "openai/gpt-oss-120b",
  "scope_locked": false,
  "duration_ms": 812,
  "tool_execution_ids": ["call_abc123"]
}
```

`scope_locked` is true when the answer is the IRN out-of-scope sentence.

## 4. Shared article pool

`/news` already caches per resolved query inside its router closure, which no
other module can read. `app/services/news_cache.py` adds a process-local,
option-independent pool:

- `/news` publishes every successful run's items (`publish_articles`, best-effort,
  never raises into the news response).
- Bounded to 2000 articles, 6-hour TTL, deduplicated by URL (falling back to
  title+publisher).
- Normalizes only card metadata: title, publisher, category, summary, url,
  published_at. Real `/news` items expose the link as `source_url` and the feed
  as a shared URL, so identity is **title+publisher**, never the URL.
- Token matching tolerates Indonesian affixes: terms of four or more characters
  also match a shared stem (`beras`/`berasnya`, `pemerintah`/`pemerintahan`).
- In-memory and single-worker, matching the deployment model.

## 5. Tools and hard limits

Maximum **2 executed tool calls per user message**, enforced in code by
`MAX_TOOL_CALLS_PER_MESSAGE`. The agent loop runs at most `MAX_TOOL_ROUNDS = 2`
tool rounds, then a final tool-free completion. Over-budget calls still receive a
`role: "tool"` message (`{"error": "tool call limit reached"}`) because Groq
rejects a turn where any requested call lacks a tool response.

| Tool | Arguments | Returns | Timeout | Limit |
|---|---|---|---|---|
| `search_related_news` | `query`, `limit` | `{query, results:[{title,publisher,url}], error}` | 3 s | 5 results |
| `analyze_source_diversity` | `topic` | `{topic, total_articles, unique_publishers, publisher_count, error}` | 2 s | — |

Neither tool touches the network. Both read the pool only and degrade to an
`error` field instead of raising. Every execution is logged as
`irn.tool_call` with tool name, tool execution ID, ISO-8601 UTC timestamp, and
duration.

Tool outputs are treated as untrusted: only title, publisher, and URL are
forwarded to the model for search results.

## 6. System prompt — "Presenter IRN"

Personality: warm, professional, journalistic; addresses the user as "Anda";
greets on first contact; no emoji; 3–4 sentences unless listing sources.

Scope: answers only from `<visible_articles>` or tool results; otherwise the
exact sentence
`"Maaf, saya hanya dapat membantu Anda memahami berita yang sedang tampil di halaman ini."`

Truth guardrail: never claims an article is true/hoax/fake/accurate, never rates
publishers, keeps attribution ("menurut X") intact, and may only report coverage
breadth plus a suggestion to check original sources.

The guardrail is **also enforced in code**: any question containing a
verdict word (benar, hoax/hoaks, palsu, akurat, kredibel, …) never reaches the
model. `_truth_answer` builds the reply from pool coverage:

```
Saya tidak dapat memverifikasi kebenaran berita, namun berita ini diliput oleh
{N} sumber: {list}. Silakan cek sumber aslinya untuk informasi lebih lanjut.
```

Rationale: LLM overconfidence research (arXiv 2509.25498) shows models convert
attributed statements into declarative claims even when instructed otherwise, so
a prompt-only guardrail is insufficient for a truth verdict.

## 7. Verification

- `tests/test_chat_irn.py`: success, 422 variants (missing question, wrong mode,
  11 articles, unknown article field, over-long question), 503 when AI is off,
  search tool round-trip, diversity publisher count, 2-call cap, empty-pool
  degradation, scope rejection, three truth-guardrail phrasings (model must not
  be called), IGS endpoint still registered.
- Full suite + `ruff check app`.
- Manual `curl` against a server on port 8010.
