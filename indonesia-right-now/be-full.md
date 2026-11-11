# indonesia-right-now — Backend Engineering Handbook

This handbook describes the current backend's purpose, API, data flow, configuration, security boundaries, command-line tools, and developer workflow. It is intended as a practical orientation document; executable schemas, settings, and route implementations remain the source of truth.

For a short setup guide, start with [README.md](./README.md). Frontend-facing request and response notes are in [note-update.md](./note-update.md), and runtime toggles are in [TOGGLES.md](./TOGGLES.md).

## 1. Product and current scope

`indonesia-right-now` is a Python backend with three related capabilities:

1. Collect, filter, deduplicate, and normalize RSS/Atom items from configured feeds.
2. Add deterministic Indonesian/English categories and mapped IGS context links to API news items.
3. Fetch public web pages and extract content through a static HTTP client or a Playwright Chromium browser.
4. Optionally use Groq models to cluster weekly news (`/news/trending`), screen untrusted fetched text and extract structured news-like items (`/fetch`), or clean the extracted text of a single article (`/news/detail/`).

The project also ships two standalone command-line tools: `newsid` for feed collection and `pyscrape` for page extraction.

There is no application database or migration system. Feed and AI results are persisted as JSON files under configured output directories; AI extraction cache and request-pacing state are in process memory.

### Deliberate boundaries

- `/news` is a deterministic RSS/Atom collection and tagging path. It does not depend on the Groq workflow.
- `/news/trending` reuses the normalized feed articles and requires Groq for cross-source event clustering. It is not required for `/news` tags or IGS context.
- `/news/detail/` fetches one article and asks the model to clean extraction artifacts. It must preserve the original claims and paragraph order; it is not intended to summarize, translate, paraphrase, or create content. Completeness is not verified.
- `/fetch` is a general page scraper and can return AI-extracted structured items from the page text. It is not the feed-list endpoint.
- Shared AI infrastructure remains in use by `/fetch` and `/news/detail/`; the `/fetch` extraction workflow is distinct from article cleaning.
- Scraping is limited to public pages. CAPTCHA, HTTP 403, bot challenges, and other access controls are not bypassed.
- Source HTML parsing in `newsid` and `pyscrape` uses BeautifulSoup with Python's built-in `html.parser`; `selectolax` is not a project dependency. This addresses environments that block its native extension. It does not imply the whole application has no native/runtime components: Playwright requires an installed Chromium browser.

## 2. Technology and packaging

- Python `>=3.11` (`pyproject.toml`).
- FastAPI, Starlette, Uvicorn, Pydantic v2, and Pydantic Settings.
- RSS/Atom: `feedparser`, `httpx`, `PyYAML`.
- HTML and article extraction: `beautifulsoup4`, `html2text`, `trafilatura`.
- Browser scraping: Playwright with Chromium.
- AI: Groq Python SDK; provider requests run outside the event loop.
- Tests and developer tools: pytest, pytest-asyncio, respx, and Ruff (extras).

The package defines these console commands:

| Command | Entry point | Purpose |
|---|---|---|
| `indonesia-right-now` | `app.main:cli` | Run the API using configured host, port, log level, and one worker. |
| `newsid` | `newsid.cli:main` | Collect and write normalized feed data. |
| `pyscrape` | `pyscrape.cli:main` | Scrape and extract one public web page. |

Dependency declarations and optional extras are in [pyproject.toml](./pyproject.toml). There is no `requirements.txt`.

## 3. Local development setup

### Windows PowerShell

From the project directory:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e ".[dev,test]"
Copy-Item .env.example .env
```

Set a valid `GROQ_API_KEY` in `.env` if you want to use `/fetch` or `/news/detail/`. The example key is a placeholder, not a credential. For feed-only local work, set `AI_ENABLED=false`.

Install the Playwright browser and start the API:

```powershell
python -m playwright install chromium
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

If PowerShell activation is restricted by local policy, use the venv interpreter directly instead of changing that policy:

```powershell
.\.venv\Scripts\python.exe -m pip install -e ".[dev,test]"
.\.venv\Scripts\python.exe -m playwright install chromium
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

For Linux/macOS, activate with `source .venv/bin/activate` and copy `.env.example` to `.env` with `cp`.

The service listens on port `8000` by default. Liveness is available at `http://localhost:8000/health`. Interactive `/docs` and `/redoc` are disabled. The OpenAPI schema is at `/openapi.json` (and, like other non-health paths, requires `X-API-Key` if API-key authentication is configured).

### CLI quick reference

After installation, inspect supported flags with `newsid --help` and `pyscrape --help`.

```powershell
# Collect the configured preset without writing output.
newsid --preset indonesia-default --dry-run

# Fetch an individual feed and filter the last two days.
newsid https://example.org/feed.xml --since 48h --category indonesia

# Scrape a page without launching Chromium.
pyscrape https://example.org/article --engine static --mode markdown --output article.md --no-clipboard
```

`newsid` accepts one or more feed URLs or a YAML preset and writes timestamped JSON under `--output` (default `./output`). `pyscrape` defaults to Playwright, Markdown, and clipboard output when no output file is given; it can also save a screenshot, choose a scroll strategy, cap output length, and optionally check `robots.txt`.

### Docker

The [Dockerfile](./Dockerfile) builds a Python 3.11 image, installs the package and Chromium, and runs the `indonesia-right-now` console command as a non-root user. [docker-compose.yml](./docker-compose.yml) defines:

- `indonesia-right-now`: API on host port `8000`, `.env` loaded, `./output` mounted to `/data/output`.
- `indonesia-right-now-dev`: optional `dev` profile, reload enabled, host port `8001`, source mounted into the container.

Typical commands:

```powershell
docker compose up --build indonesia-right-now
docker compose --profile dev up --build indonesia-right-now-dev
```

The container still needs a valid Groq key to use AI-backed routes. The deployment config sets one worker; keep it that way.

## 4. API surface

Application endpoint responses use a JSON envelope; `/openapi.json` returns the OpenAPI document:

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

Errors use `ok: false`, `data: null`, and an `error` object with `code`, `message`, and `details`. Responses carry `X-Request-ID` and `X-Process-Time-Ms` headers. A caller may supply a printable `X-Request-ID` of at most 128 characters; otherwise the backend generates one.

| Method | Path | Auth | Function |
|---|---|---|---|
| `GET`, `POST` | `/news` | API key if configured | Collect and filter RSS/Atom sources; return a normalized feed document with article tags and IGS context. |
| `GET` | `/news/trending` | API key if configured | Group dated news from the prior seven days into SuperArticles, including standalone articles; requires Groq. |
| `GET` | `/news/detail/` | API key if configured | Fetch and clean one article's extracted readable text. |
| `GET`, `POST` | `/fetch` | API key if configured | Scrape a public page, extract requested format, and return structured AI items. |
| `GET` | `/health` | Public | Return `status: up` and the environment. |
| `GET` | `/meta` | API key if configured | Return service metadata and Playwright/Chromium availability. |

`/health` is the only API-key exception. When `API_KEY` is empty, the middleware does not enforce API-key authentication.

### 4.1 `GET` and `POST /news`

The accepted fields are declared in `app/schemas/news.py`. `GET` receives query parameters; `POST` receives a JSON object and can also use query parameters (the JSON body takes precedence). List fields use arrays in JSON and comma-separated values in query parameters.

| Field | Default | Description |
|---|---:|---|
| `sources` | configured preset | Inline source definitions. POST objects support `url`, optional `name`, `category`, `tier`, and `enabled`; GET accepts comma-separated URLs. |
| `preset` | `NEWSID_PRESET_PATH` | Bundled preset alias or YAML file path; used when inline sources are omitted. |
| `since` | `24h` | Relative window; number plus `s`, `m`, `h`, or `d`. |
| `until` | none | ISO-8601 exclusive upper bound for publication time. |
| `category` | `[]` | Keep items matching at least one requested category. |
| `publisher` | `[]` | Keep items whose publisher name/domain contains a requested term. |
| `keyword` | `[]` | Keep items whose title/summary contains any requested term. |
| `exclude` | `[]` | Drop items whose title/summary contains any requested term. |
| `max_items` | `200` | Maximum items parsed per source; `0` disables this per-feed cap. |
| `concurrency` | `8` | Concurrent feed requests. |
| `timeout` | `20` seconds | Per-request timeout. |
| `retries` | `3` | Retries for retryable feed errors. |
| `request_delay` | `0.75` seconds | Minimum spacing between requests to the same host. |
| `strict_dates` | `false` | Drop items without a usable date. |
| `detect_language` | `false` | Optionally identify Indonesian/English; requires `.[language]`. |
| `date_tz` | `Asia/Jakarta` | Run/output time zone. |
| `pretty` | `false` | Pretty-print the saved JSON file. |
| `dry_run` | `false` | Return the result without writing a snapshot. |

For compatibility, the aliases `categories`, `publishers`, `keywords`, and `excludes` map to their singular canonical names. If both are given, the singular value wins.

The response's `data` contains:

- `schema_version`, `generated_at`, `date`, `date_tz`, and resolved `query`.
- `stats`: source totals/success/failure and item fetched/kept/deduplicated counts.
- `sources`: per-source status, publisher, item count, timestamp, and optional error.
- `items`: normalized objects with `id`, `title`, `url`, `publisher`, `publisher_domain`, `author`, `published_at`, `date_confidence`, `summary`, `content`, `categories`, `igs_context`, `language`, `source_url`, and `fetched_at`.
- `snapshot`: write status, path/filename, and `dry_run`.

Nullable metadata is expected: for example, author/date/summary/content/language can be absent. The API normalizes source category tags and adds keyword-based tags so each article has 2–3 `categories`; `igs_context` is an array of `{label, url}` objects and is empty when no tag has a configured mapping. These tags are deterministic and do not call Groq. Feed items retain RSS/Atom-supplied content; this endpoint does not generate summaries. Individual source failures are included in `sources`; if every configured source fails, the API reports an error. Successful responses are cached per resolved query for `NEWS_CACHE_TTL` seconds (default `300`), so the first collection can take tens of seconds and repeat requests return immediately from the process cache.

Example:

```powershell
curl.exe -X POST "http://localhost:8000/news" `
  -H "Content-Type: application/json" `
  -H "X-API-Key: your-key" `
  -d '{"sources":[{"name":"Example","url":"https://example.org/news.xml","enabled":true}],"since":"24h","max_items":20,"dry_run":true}'
```

Omit the API-key header when no key is configured.

### 4.2 `GET /news/trending`

The endpoint collects configured feed items from the previous seven days, excludes undated articles, and asks the configured Groq extractor model to group coverage of the same event or closely related development. Model requests use batches of at most 10 articles, executed at `TRENDING_BATCH_CONCURRENCY` in parallel (default `1` because provider per-minute limits are the practical ceiling); unmatched or unassigned articles are included as standalone SuperArticles with one source. Successful output is cached in memory for `TRENDING_CACHE_TTL` seconds (default `3600`). The service uses one worker, so the cache is shared by requests within that process. `AI_ENABLED` and a valid `GROQ_API_KEY` are required.

The standard response envelope's `data` contains `generated_at`, `window: "7d"`, and `super_articles`. A SuperArticle includes `id`, `topic_title`, `summary`, `article_count`, `sources`, `categories`, and `igs_context`. `sources` contains at least one article; a count of one represents standalone coverage. Topic title and summary come from the lead source article. The model returns article-ID groupings only; each source includes canonical `publisher`, `title`, `url`, nullable `published_at`, its own `categories`, and its own `igs_context`, all constructed from the feed records.

Categories are lists of two or three distinct labels. The IGS context mappings are `ekonomi` → `{label: "Data Ekonomi IGS", url: "/gov/ekonomi"}`, `kesehatan` or `sosial` → `{label: "Data Sosial IGS", url: "/gov/sosial-publik"}`, and `infrastruktur` → `{label: "Data Infrastruktur IGS", url: "/gov/infrastruktur"}`. Frontends should render these relative routes as contextual links and treat an empty `igs_context` as no mapped IGS view.

See [trending-fix.md](./trending-fix.md) for a frontend-focused response example and schema.

### 4.3 `GET /news/detail/`

Pass one required `url` query parameter. The backend:

1. Validates the destination as a public HTTP(S) URL and resolves public addresses.
2. Fetches HTML with redirects disabled at the HTTP layer; it validates each redirect before following it and pins the connection to the validated IP.
3. Rejects unsupported content types, oversized responses, excessive redirects, non-success HTTP responses, and pages without readable article text.
4. Extracts article text/metadata using Trafilatura and structured/HTML metadata fallbacks.
5. Runs the shared prompt-injection guard and the article-cleaning prompt.

The response includes requested/final URLs, title, author, publisher, publication date, language, cleaned `content`, lengths, extraction method, model, status, and `completeness: "not_verified"`. The AI cleaner is instructed to preserve claims, numbers, names, quotes, and order. Validation checks minimum retained text/word overlap and that source numbers remain, but this is not a proof of semantic fidelity or completeness. If a chunk looks over-cleaned, the model gets one stricter retry before the request fails. Bracketed citation markers such as `[12]` are ignored when comparing numbers because they are extraction artifacts, and the length floor allows a cleaning pass that drops a table or infobox while keeping the wording and every source number.

`AI_ENABLED=false` disables this endpoint (503). A missing or rejected Groq key, failed prompt-injection check, blocked content, extraction failure, or timeout has a distinct error mapping in `app/routers/news_detail.py`.

Both the guard and the cleaner process the article in chunks, so a long article costs many provider calls. On a low provider tier (for example an 8.000 tokens-per-minute Groq limit) a long article can exhaust its 429 retries inside the request timeout and return `NEWS_DETAIL_AI_FAILED` (502). Short and medium articles complete normally.

### 4.4 `GET` and `POST /fetch`

Request options are defined in `app/schemas/fetch.py`.

| Field | Default | Description |
|---|---:|---|
| `url` | required | Public page URL. |
| `mode` | `markdown` | `text`, `markdown`, `html`, or `reader`. |
| `engine` | `playwright` | Browser-rendered `playwright` or `static` HTTP. |
| `static` | `false` | Compatibility switch that selects the static engine. |
| `scroll` | `30` | Maximum browser scroll steps. |
| `scroll_mode` | `until-height-stable` | `steps` or `until-height-stable`. |
| `max_chars` | configured cap | Optional per-request content cap, bounded by `PYSCRAPE_MAX_CHARS` when that global cap is nonzero. |
| `timeout` | configured timeout | Optional per-fetch timeout. |
| `wait_until` | `networkidle` | Playwright wait state: `load`, `domcontentloaded`, or `networkidle`. |
| `headless` | `true` | Run Chromium headlessly. |
| `check_robots` | `false` | Check `robots.txt` before page access. |
| `screenshot` | `false` | Include an inline screenshot (Playwright only). |
| `include_raw` | `false` | Include the extracted raw text in the response. |
| `save` | `true` | Save AI extraction output as a JSON snapshot. |

`text` and `html` use BeautifulSoup's built-in HTML parser; `markdown` uses `html2text`; `reader` uses Trafilatura. The endpoint returns fetched page metadata/content, screenshot data if requested, optional `raw` content, `news_items`, AI metadata, snapshot metadata, and duration. The shared AI pipeline screens page text, extracts structured items, deduplicates/sorts them, and caps returned items at 64. `AI_ENABLED=false` disables this endpoint (503).

For JavaScript-heavy pages use Playwright and install Chromium. Static mode can be useful where browser rendering is unnecessary:

```powershell
curl.exe -X POST "http://localhost:8000/fetch" `
  -H "Content-Type: application/json" `
  -H "X-API-Key: your-key" `
  -d '{"url":"https://example.org/article","mode":"text","engine":"static","include_raw":true,"save":false}'
```

Do not treat AI-extracted fields as verified facts. The model may omit page items; it must not be used to circumvent a site's access controls.

### 4.5 `/health`, `/meta`, and API docs

- `/health` is deliberately public and is a basic liveness endpoint. It does not prove that Groq, feeds, or Chromium are operational.
- `/meta` reports name/version/environment, the configured single-worker value, and whether Playwright/Chromium can be inspected.
- `/openapi.json` is available while Swagger UI/ReDoc are disabled. A configured API key applies to it too.

### 4.6 `POST /chat/irn` (Presenter IRN)

News-focused chat endpoint, fully separate from `/chat` (IGS). Requires AI to be
enabled.

Request fields: `mode` (exactly `"IRN"`), `page_context` (1-64 chars),
`visible_articles` (max 10 cards of `title`, `publisher`, `category`, `summary`,
`url`, `published_at`), and `question` (1-2000 chars). Unknown fields are
rejected with 422, so a full article body cannot be sent by accident.

Response `data` mirrors `/chat` but reports `tool_execution_ids` (a list) instead
of `tool_execution_id`. Two tools are available, capped at two executed calls per
message: `search_related_news` (max 5 results, 3 s timeout) and
`analyze_source_diversity` (2 s timeout). Both read the process-local article pool
in `app/services/news_cache.py`, which `/news` fills on every successful run; no
tool performs network access.

The truth guardrail is enforced in code, not only in the prompt: a question
containing a verdict word (`benar`, `hoax`, `palsu`, `akurat`, ...) never reaches
the model and is answered from coverage counts. Error codes are
`CHAT_IRN_AI_DISABLED`, `CHAT_IRN_AI_CONFIG`, and `CHAT_IRN_AI_FAILED`. Contract:
[irn-chatbot.md](./irn-chatbot.md).

## 5. Feed sources, parsing, and normalized data

### Source selection

`newsid.sources.load_sources` resolves sources in this order:

1. Explicit source arguments/inline source definitions.
2. A YAML source file.
3. The bundled `indonesia-default` preset (or its underscore alias).
4. A configured preset path when the API receives no inline sources or named preset.

YAML entries carry `tier`, `enabled`, and `disabled_reason` metadata; optional `notes` retain URL-verification details. The tier defaults to `legal` for older custom YAML files. `NEWSID_ACTIVE_TIERS` defaults to `legal`; adding `gray` opts into gray-tier sources. Ordinary disabled legal entries remain skipped, gray entries are intentionally opt-in despite their stored `enabled: false`, and blacklist entries are never loaded. An empty or unknown tier selection and a source file with no selected feeds raise a configuration error. The loader logs active tier counts and warns with the number and URLs of skipped feeds.

The current [default preset](./presets/indonesia_default.yaml) includes legal-tier community feeds and selected publishers, opt-in gray-tier publisher/government candidates, and blacklisted feeds retained from the prior exclusion policy. Some candidate feed endpoints were unavailable or returned 404/403 during verification; their `notes` fields record the observed response. Tier activation controls selection, not feed availability.

The API reads `NEWSID_ACTIVE_TIERS` from its settings and applies the same selection to preset and inline `/news` sources. The standalone `newsid` CLI reads the process environment variable directly. See [TOGGLES.md](./TOGGLES.md) for examples.

### Collection and normalization

`newsid.cli._collect` uses bounded asynchronous `httpx` requests and the `FeedFetcher`. The fetcher:

- Validates public destinations and revalidates each redirect.
- Limits redirects and response size, spaces requests per host, and retries selected transient failures with server retry hints where available.
- Parses the resulting bytes with `feedparser`.
- Follows an HTML page's RSS/Atom alternate link when a source URL is a web page.

`newsid.parser.parse_feed` normalizes each usable title/link, publisher, author, date confidence, summary, longer content, category tags/fallback source category, language, source URL, and fetch timestamp into `newsid.schema.NewsItem`. IDs derive from canonicalized item URLs. At the API response layer, `app.services.news_tagging` maps known source-tag aliases and matches Indonesian/English topic keywords to produce 2–3 categories and static IGS context links. It does not make an AI call. HTML text cleanup uses BeautifulSoup with `"html.parser"`.

Filtering supports relative time windows, an ISO-8601 `until` bound, categories, publisher name/domain, title/summary keywords, exclusions, and optional strict date handling. Results are deduplicated and sorted by publication time; missing-date entries sort after dated entries. The API's `max_items` is a per-source parse limit, not a global result cap.

The final API feed document uses schema version 1 and includes run metadata, query, counts, source records, normalized/tag-enriched items, and snapshot write information. Normal API calls write into `NEWSID_OUTPUT_DIR`; `dry_run=true` suppresses the write. The standalone `newsid` CLI continues to return feed-normalized items without the API-only IGS enrichment.

## 6. Page scraping and article extraction internals

### General-purpose fetch

`app.routers.fetch` validates the URL, invokes the `pyscrape` fetch/extraction stack, applies the global/request content limit, then sends extracted text to the shared AI workflow. Fetch options choose:

- Static HTTP for straightforward HTML responses.
- Playwright Chromium for rendered pages, scrolling, and screenshots.
- Text, HTML, Markdown, or reader-style output.

Public-destination checks reject local/private/reserved IP ranges, credentials in URLs, unsupported schemes, and unsafe DNS results. Browser subrequests are guarded as well. Static and browser fetchers detect 403 and common CAPTCHA/bot-check indicators and fail instead of bypassing them. robots checking is opt-in for `/fetch` (`check_robots`), and the standalone `pyscrape` CLI also provides `--check-robots`.

### Article detail

`app.services.article_fetch` is the article-specific HTTP path, separate from the general scraper. It accepts HTML/XHTML, enforces a 10 MiB body limit and a redirect limit of five, validates/pins each public destination, and extracts article text with Trafilatura. JSON-LD `articleBody` is a fallback. Metadata comes from structured article data, extraction results, and common Open Graph/meta tags. Repeated HTML paragraphs are removed before extraction.

### Shared AI services

`app.services.ai` owns the Groq request adapter, prompt-injection guard, structured item validation/extraction, per-process cache, deduplication, and optional `/fetch` snapshots. `/fetch` structured output is capped at 64 items. `app.services.article_ai` uses the shared guard and model-call helper but has its own article-cleaning instruction and preservation checks.

The guard fails closed on provider or parse failures. It does not guarantee that AI output is correct or that all page content was captured. `/news/detail/` reports completeness as unverified. The shared guard/model infrastructure and `/fetch` extraction workflow remain required by active routes.

## 7. Runtime settings

Settings are defined in `app/config.py`, loaded case-insensitively from environment variables and `.env`. Values passed through the environment override Python defaults. `.env.example` is a development sample and differs from some `Settings` defaults (for example request timeout and CORS).

| Environment variable | Python default | Meaning / constraints |
|---|---:|---|
| `APP_NAME` | `indonesia-right-now` | Service name in metadata. |
| `APP_ENV` | `development` | `development` or `production`; production enables rate limits. |
| `APP_HOST` | `0.0.0.0` | Host for the CLI server command. |
| `APP_PORT` | `8000` | Port, 1–65535. |
| `APP_WORKERS` | `1` | Runtime requires exactly one worker due to in-process request-delay/feed state. |
| `APP_LOG_LEVEL` | `INFO` | Standard Python log level. |
| `APP_CORS_ORIGINS` | `*` | Comma-separated origins; cannot mix wildcard and explicit origins. Sample `.env` uses `http://localhost:3000`. |
| `APP_REQUEST_TIMEOUT` | `120` | Overall API operation timeout in seconds. |
| `API_KEY` | empty | If nonempty, `X-API-Key` is required except on `/health`. |
| `RATE_LIMIT_FETCH` | `20/minute` | Production `/fetch` limit. |
| `RATE_LIMIT_NEWS` | `10/minute` | Production `/news`, `/news/trending`, and `/news/detail/` limit. |
| `RATE_LIMIT_HEALTH` | `120/minute` | Production `/meta` limit. `/health` remains public and unwrapped by the limiter. |
| `NEWSID_PRESET_PATH` | `./presets/indonesia_default.yaml` | API default source preset. |
| `NEWSID_ACTIVE_TIERS` | `legal` | Comma-separated source tiers; `blacklist` is always excluded. |
| `NEWSID_OUTPUT_DIR` | `./output` | Feed JSON snapshots. |
| `NEWSID_UA` | `news-indonesia-collector/1.0` | Feed request user agent. |
| `PYSCRAPE_UA` | `pyscrape/1.0 (+public)` | API scraper/article request user agent. |
| `PYSCRAPE_DEFAULT_TIMEOUT` | `60` | Default fetch timeout; must be positive. Sample `.env` sets `30`. |
| `PYSCRAPE_MAX_CHARS` | `50000` | Global page output cap; `0` disables this cap. |
| `FETCH_MAX_URL_LENGTH` | `2048` | Maximum URL length for fetch/article destinations. |
| `LOG_FORMAT` | `json` | `json` or `console`; sample `.env` uses `console`. |
| `GROQ_API_KEY` | empty | Required for AI-backed routes when `AI_ENABLED=true`. |
| `AI_ENABLED` | `true` | When false, `/news/trending`, `/fetch`, and `/news/detail/` return 503; `/news` and its deterministic tagging still work. |
| `AI_GUARD_MODEL` | `openai/gpt-oss-120b` | Groq model for prompt-injection screening. |
| `AI_EXTRACTOR_MODEL` | `openai/gpt-oss-120b` | Groq model for extraction and article cleaning. |
| `AI_GUARD_THRESHOLD` | `0.7` | Blocking confidence threshold, strictly between 0 and 1. |
| `AI_CHUNK_MAX_CHARS` | `3000` | Configured chunk target; 500–20000, with a 3000-character per-request cap. |
| `AI_MAX_CHUNKS` | `20` | Maximum text chunks; must be at least one. |
| `AI_EXTRACTOR_RETRIES` | `1` | Retry count for invalid structured extraction output; nonnegative. |
| `AI_OUTPUT_LANGUAGE` | `id` | `id` or `auto`; controls structured extraction language behavior. |
| `AI_CACHE_TTL` | `600` | In-process `/fetch` result cache lifetime in seconds; positive. |
| `AI_CACHE_MAX` | `128` | In-process cache capacity; positive. |
| `AI_OUTPUT_DIR` | `./output/ai` | `/fetch` snapshot directory; must be writable when AI is enabled at startup. |
| `AI_REQUEST_TIMEOUT` | `120` | Groq SDK request timeout; positive. HTTP 429 responses retry after 2, 4, and 8 seconds, then fail with a generic provider error. |
| `NEWS_CACHE_TTL` | `300` | In-process `/news` response cache per resolved query in seconds; positive. |
| `TRENDING_CACHE_TTL` | `3600` | In-process `/news/trending` successful-response cache duration in seconds; positive. |
| `TRENDING_BATCH_CONCURRENCY` | `1` | Parallel Groq clustering batches for `/news/trending`; raise only within the account's request-per-minute limit. |

`get_settings()` is cached with `lru_cache`; tests or code changing environment variables should clear that cache before reloading settings. The application stores the created settings on `app.state.settings`. AI cache data and host pacing state live in process memory; snapshots are JSON files. There is no database layer.

## 8. Security, privacy, and operational constraints

- **Outbound URL safety:** Public HTTP(S) destinations only. URL credentials, local/internal hostnames, and any DNS result outside public address ranges are rejected. Redirect targets are revalidated. Article HTTP connections are pinned to resolved addresses to reduce DNS-rebinding risk.
- **Untrusted page content:** Fetched text is untrusted. AI guard failures stop processing; blocked prompt-injection content is not sent onward to extraction/cleaning.
- **No access-control bypass:** 403, CAPTCHA, bot checks, robots denial (when checked), and other access restrictions are not bypassed. Do not add bypass logic.
- **Request authentication:** Configure `API_KEY` for non-health API paths. Use a secret management mechanism appropriate to deployment; never commit `.env` or real keys.
- **CORS:** The checked-in sample permits the local frontend origin. Set origins deliberately in deployed environments.
- **Rate limits:** Configured for production mode only. Feed request spacing and scraper state are in-process, so run exactly one API worker unless that state is deliberately redesigned.
- **AI limits:** Groq use can incur provider charges and can fail due to invalid credentials, network issues, provider limits, or model availability. Do not treat generated structured items as verified or exhaustive.
- **Output data:** Feed snapshots and `/fetch` AI snapshots are written locally by default. Avoid exposing the output directory publicly if it may contain fetched or derived content.
- **External source policy:** Respect source terms, robots policies, and reasonable request rates. Feed failures are expected operationally and reported per source when partial collection succeeds.

## 9. Repository map

```text
app/
  main.py                 FastAPI construction, middleware/handlers, server CLI
  config.py               Environment-backed Settings and validation
  runtime.py              Startup checks, Playwright probe, request IDs
  middleware.py           Request context, optional API-key check, access logs
  security.py             API-key compare and fetch URL validation
  responses.py, errors.py Shared response envelope and application errors
  routers/
    news.py               /news request parsing and collection orchestration
    news_detail.py        /news/detail/ route and error mapping
    fetch.py              /fetch parsing, scraping, AI orchestration
    health.py             /health and /meta
  schemas/                 Pydantic API request/response models
  services/
    ai.py                 Shared Groq guard, extraction, cache, snapshots
    article_ai.py         Article-specific AI cleaner and preservation checks
    article_fetch.py      Safe article HTTP fetching and readable extraction
    pinned_http.py        HTTP transport pinned to validated destination IPs
newsid/
  cli.py                  Feed-collector CLI and shared collection/document logic
  config.py               Source models, URL checks, YAML loading
  fetcher.py              Async feed requests, redirect checks, host pacing
  sources.py              Preset resolution and HTML feed autodiscovery
  parser.py               RSS/Atom parsing and normalized item construction
  normalize.py            Text cleanup, canonical URL/date helpers
  filters.py              Time, category, publisher, keyword filters
  dedupe.py, writer.py    Stable dedupe and atomic JSON output
pyscrape/
  cli.py                  Standalone page-scraper CLI
  fetcher.py              Static HTTP fetch and bot-check detection
  browser.py, scroll.py   Playwright fetching, URL checks, scrolling
  extract.py              Text/Markdown/HTML/reader output conversion
  safety.py, robots.py    Public-IP validation and optional robots checks
presets/
  indonesia_default.yaml  Default feed sources and source policy notes
  TOGGLES.md              Runtime toggle and source-tier guide
tests/                    API, AI, scraping, feed, security, and regression tests
```

Generated directories such as `.venv`, `venv`, `build`, `*.egg-info`, caches, and `output` are not source-of-truth code; `.gitignore` excludes several of these. Do not hand-edit generated package/build artifacts as project source.

## 10. Tests and quality checks

Install development/test dependencies with `python -m pip install -e ".[dev,test]"`. Run the full suite from the repository root:

```powershell
python -m pytest -q
```

Run Ruff when installed:

```powershell
python -m ruff check .
```

Test modules are grouped around API/routes (`test_api.py`, `test_fetch.py`), AI (`test_ai.py`), article extraction (`test_article_detail.py`), URL/network safety (`test_url_safety.py`, legacy safety tests), RSS parsing/collection (`test_news_preset.py`, `tests/legacy/new/`), scraper CLI and browser scrolling (`tests/legacy/scrape/`), and HTML parsing (`test_html_parsing.py`).

Many integration tests use `respx` mocks; the normal test suite should not require live feed hosts or a Groq key. A live manual smoke test of AI routes does require a valid provider key. Chromium must be installed for actual Playwright browser fetching; tests that mock those paths may not launch it.

## 11. Change guidance for future developers

1. Read the relevant API schema and router before changing a request/response contract.
2. Preserve the shared response envelope, request IDs, error mappings, and nullable feed metadata.
3. Keep feed collection independent of Groq. Avoid adding AI work to `/news`.
4. Keep `/news/detail/` focused on faithful article cleaning; its integrity/completeness checks are safety guardrails, not a claim of perfect semantic preservation.
5. Keep `/fetch` and `/news/detail/` URL validation, redirect validation, and no-bypass behavior intact.
6. If adding a source, edit the YAML preset and source-policy documentation together; test parsing/selection without making real network calls.
7. If a new HTML parser is needed, prefer `beautifulsoup4` with `"html.parser"` where it fits. Avoid introducing native extensions without checking target Windows application-control constraints.
8. Add or update targeted tests, run them, then run the full suite for cross-route changes.
9. Keep `APP_WORKERS=1` until in-process pacing/cache state and deployment guarantees have been intentionally redesigned.

## 12. Current limitations and likely operational issues

- Feed content, availability, robots behavior, and server response formats are controlled by external publishers.
- `NEWSID_PRESET_PATH`, output paths, and `.env` are relative to the process working directory unless absolute paths are configured.
- The default configuration enables AI; set a valid provider key or disable AI before starting if only `/news` is needed.
- Playwright needs a browser install and may be restricted by machine policy even though feed parsing uses the standard-library HTML parser.
- `completeness: "not_verified"` on article detail is intentional.
- One API worker is an architectural constraint, not just a Docker default.
