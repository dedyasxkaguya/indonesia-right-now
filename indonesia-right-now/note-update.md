# Frontend integration notes

This document describes the current backend-facing contract for the frontend. The authoritative request and response validation lives in `app/schemas/` and the API routers.

## Routes

| Method | Path | Purpose |
|---|---|---|
| `GET`, `POST` | `/news` | Collect feed items with filtering and source statistics. |
| `GET` | `/news/trending` | Cluster the last seven days of news into multi-source SuperArticles. Requires AI to be enabled. |
| `GET` | `/news/detail/` | Extract and clean one article's available text. Requires AI to be enabled. |
| `GET`, `POST` | `/fetch` | Extract a public page and run the structured-item workflow. Requires AI to be enabled. |
| `POST` | `/chat/irn` | Presenter IRN news assistant. Accepts up to 10 visible article cards; returns `tool_execution_ids`. Requires AI to be enabled. |
| `GET` | `/health` | Public liveness check. |
| `GET` | `/meta` | Service version/environment and Playwright availability. |

Application endpoint responses use this envelope (`/openapi.json` returns the OpenAPI document):

```json
{
  "ok": true,
  "data": {},
  "error": null,
  "meta": {
    "request_id": "request-id",
    "duration_ms": 12.34,
    "service": "indonesia-right-now",
    "version": "0.1.0"
  }
}
```

For an error, `ok` is `false`, `data` is `null`, and `error` contains `code`, `message`, and `details`. Clients should branch on HTTP status and `error.code`. Responses return `X-Request-ID` and `X-Process-Time-Ms`; a caller may supply a printable `X-Request-ID` of at most 128 characters.

If `API_KEY` is configured, send it in `X-API-Key` on every endpoint except `/health`. The sample CORS configuration allows `http://localhost:3000`; deployments should set `APP_CORS_ORIGINS` to the actual frontend origin.

## `/news` contract

`GET /news` accepts options as query parameters. For list-like options, use comma-separated values. `POST /news` accepts the same options as a JSON object; JSON fields override matching query parameters. Inline `sources` can be provided in a POST body as objects containing `url` and optional `name`, `category`, `tier`, and `enabled`.

When inline sources are omitted, the API uses `preset` or `NEWSID_PRESET_PATH`. The bundled default is `presets/indonesia_default.yaml`.

| Option | Default | Meaning |
|---|---:|---|
| `sources` | preset | Inline source list (POST) or comma-separated URLs (GET). |
| `preset` | configured path | Bundled preset name or YAML source file. |
| `since` | `24h` | Relative publication window, such as `6h` or `7d`. Units are `s`, `m`, `h`, `d`. |
| `until` | none | ISO-8601 upper publication-time bound. |
| `category` | empty | Keep matching source/category tags. |
| `publisher` | empty | Keep publishers whose name or domain contains a supplied term. |
| `keyword` | empty | Keep an item if any term occurs in title or summary. |
| `exclude` | empty | Drop items if any term occurs in title or summary. |
| `max_items` | `200` | Maximum items parsed from each source; `0` means no per-feed cap. |
| `concurrency` | `8` | Concurrent feed requests. |
| `timeout` | `20` | Per-request timeout in seconds. |
| `retries` | `3` | Retries for retryable feed errors. |
| `request_delay` | `0.75` | Minimum delay between requests to the same host, in seconds. |
| `strict_dates` | `false` | Exclude entries without a usable publication date. |
| `detect_language` | `false` | Detect `id`/`en`; requires the optional `language` extra. |
| `date_tz` | `Asia/Jakarta` | Time zone used for run date and snapshot metadata. |
| `pretty` | `false` | Pretty-print the saved JSON snapshot. |
| `dry_run` | `false` | Do not write a snapshot. |

Canonical filter names are singular. For compatibility, the deprecated aliases `categories`, `publishers`, `keywords`, and `excludes` are accepted; canonical names win when both forms are supplied.

The response `data` is a feed document containing `schema_version`, `generated_at`, `date`, `date_tz`, the resolved `query`, `stats`, per-source `sources`, and normalized `items`. Item fields include `id`, `title`, `url`, `publisher`, `publisher_domain`, `author`, `published_at`, `date_confidence`, `summary`, `content`, `categories`, `igs_context`, `language`, `source_url`, and `fetched_at`. Some values, such as `author`, dates, `summary`, `content`, and `language`, may be `null`. `categories` contains 2–3 normalized tags; `igs_context` may be empty.

`/news` caches successful responses in process memory for `NEWS_CACHE_TTL` seconds (default `300`), keyed by the resolved options. The first request for a given query still contacts every feed (tens of seconds); repeats are served from the cache and return immediately. The cached document keeps the `snapshot` block from the run that generated it.

Tags are derived from normalized RSS/Atom categories plus lightweight Indonesian/English keyword matching; they do not depend on `AI_ENABLED` or Groq. `igs_context` is a list of `{label, url}` objects for the frontend to render as related-data links:

| Category | Label | Frontend route |
|---|---|---|
| `ekonomi` | Data Ekonomi IGS | `/gov/ekonomi` |
| `kesehatan`, `sosial` | Data Sosial IGS | `/gov/sosial-publik` |
| `infrastruktur` | Data Infrastruktur IGS | `/gov/infrastruktur` |

Other categories have no mapped context and produce an empty array. Categories are classification hints, not exclusive labels.

## `/news/trending`

`GET /news/trending` collects the configured feeds from the previous seven days, excluding articles without a publication date, then uses the configured Groq extractor model to group related coverage. Articles without a matching story are returned as standalone SuperArticles with one source. The response is cached in memory for `TRENDING_CACHE_TTL` seconds (default: `3600`); the endpoint uses the standard response envelope. It requires `AI_ENABLED=true` and a valid `GROQ_API_KEY`.

The `data` object contains `generated_at`, `window` (`"7d"`), and `super_articles`. A SuperArticle has a stable hash `id`, `topic_title` and `summary` taken from its lead source article, `article_count`, and canonical source records with `publisher`, `title`, `url`, and nullable `published_at`. `sources` contains one or more articles; one source means the article is standalone coverage. The backend asks the model only for article-ID groupings in batches of at most 10, and constructs source records from the raw feed data rather than trusting model-generated URLs or publisher metadata.

Each SuperArticle and source article also includes 2–3 normalized `categories` and an `igs_context` array of `{label, url}` links. Categories come from source tags and lightweight keyword matching; the service does not make a per-article AI call. IGS contexts are provided for `ekonomi`, `kesehatan`/`sosial`, and `infrastruktur`; other tags have an empty array. See [trending-fix.md](./trending-fix.md) for the response schema and frontend consumption guidance.

## `/news/detail/`

`GET /news/detail/?url=https%3A%2F%2Fexample.org%2Fstory` fetches one public article, extracts readable text and metadata, then uses a prompt-injection check and Groq cleaning. Cleaning is intended to remove navigation, duplicates, and boilerplate while retaining the article's original claims and order. It does not intentionally summarize, translate, paraphrase, or add facts. Completeness is reported as `not_verified`; do not treat the result as a guaranteed full transcript.

## `/fetch`

`GET /fetch?url=...` and `POST /fetch` accept the same fields. `url` is required. `mode` is `text`, `markdown`, `html`, or `reader`; `engine` is `playwright` or `static`. Other options include scrolling, `timeout`, `wait_until`, `headless`, `check_robots`, `screenshot`, `include_raw`, `save`, and `max_chars`. The schema and defaults are in `app/schemas/fetch.py`.

The response contains the extracted page information plus `news_items`, AI metadata, and optional raw text/snapshot data. `include_raw` defaults to false and `save` defaults to true. A 403, CAPTCHA, or bot-check is an access restriction; the backend does not attempt to bypass it.

## Default feed preset and source policy

The default preset is maintained in `presets/indonesia_default.yaml`. It explicitly assigns each source to a tier and retains disabled entries with a `disabled_reason`. By default, `NEWSID_ACTIVE_TIERS=legal` loads enabled legal-tier feeds only. Set `NEWSID_ACTIVE_TIERS=legal,gray` in the backend environment to opt into gray-tier sources; blacklisted sources are never loaded. The same filtering applies to preset and inline `/news` sources. See [TOGGLES.md](./TOGGLES.md) for the toggle details.

Some retained publisher and government URLs have not been verified as working RSS/Atom feeds. The preset's `notes` field records the verification outcome; enabling a tier does not guarantee every feed endpoint is valid. The backend logs selected tier counts and skipped-source counts.

## Client behavior

- Preserve the response envelope and nullable item fields.
- Display source and item-level errors; some source failures may appear in a successful `/news` response when other feeds succeeded.
- Treat request IDs as support/debugging identifiers, not as stable news-item IDs.
- Use the singular filter names for new requests.
- Use `/health` for liveness; `/meta` is not a substitute for dependency/readiness checks.

## Presenter IRN chat (`POST /chat/irn`)

Send `{mode: "IRN", page_context, visible_articles, question}`. `visible_articles`
holds at most 10 cards with `title`, `publisher`, `category`, `summary`, `url`,
and `published_at`; unknown fields are a 422 and full article text must not be
sent. The reply carries `answer`, `model`, `scope_locked`, `duration_ms`, and
`tool_execution_ids` (a list, one entry per executed tool call, maximum two).

`scope_locked: true` is a normal answer: the assistant declined an off-topic
question. Truth-verdict questions ("apakah berita ini benar?") return publisher
coverage, never a yes/no verdict, so do not present that reply as fact-checking.
Tool results come from the in-memory pool filled by `/news`; if no news request
has run yet, tools may return nothing while the assistant still answers from the
visible articles. Full detail: [irn-chatbot.md](./irn-chatbot.md).
