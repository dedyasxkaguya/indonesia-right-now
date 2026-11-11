# indonesia-right-now

FastAPI backend for collecting and normalizing RSS/Atom news, extracting content from public web pages, and returning structured results. It also provides separate command-line tools for feed collection and page scraping.

The active API includes `/news`, `/news/trending`, `/news/detail/`, `/fetch`, `/health`, and `/meta`. AI is used for weekly news clustering, structured extraction in `/fetch`, and guarded article-text cleaning in `/news/detail/`.

## Get started

Requirements: Python 3.11 or newer. From the project directory, in Windows PowerShell:

```powershell
py -3 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -e .
Copy-Item .env.example .env
```

Edit `.env` and set `GROQ_API_KEY` to a valid Groq API key. AI is enabled by default; without a valid key, `/news/trending`, `/fetch`, and `/news/detail/` cannot complete AI processing. To run feed collection only, set `AI_ENABLED=false`.

The default `/news` preset currently contains 15 Indonesian publisher feeds in
the legal tier. Additional gray-tier sources can be opted into with
`NEWSID_ACTIVE_TIERS=legal,gray` when configured; blacklisted sources remain
excluded. See [TOGGLES.md](./TOGGLES.md) for details.

Install Chromium for browser-based scraping, then start the single-worker API:

```powershell
python -m playwright install chromium
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

Feed collection is slow because it contacts every source; `/news` responses are cached per resolved query for `NEWS_CACHE_TTL` seconds (default `300`), so repeat requests are served from memory. `/news/trending` results are cached for `TRENDING_CACHE_TTL` seconds (default `3600`).

Check `http://localhost:8000/health`. The interactive Swagger and ReDoc pages are disabled; the OpenAPI schema is at `http://localhost:8000/openapi.json`. If `API_KEY` is set, send it as `X-API-Key` on every endpoint except `/health`.

For Linux/macOS, activate the virtual environment with `source .venv/bin/activate` and copy the environment file with `cp .env.example .env`. See [be-full.md](./be-full.md) for complete setup, endpoint contracts, configuration, architecture, safety boundaries, and development notes.

## API at a glance

| Method | Path | Purpose |
|---|---|---|
| `GET`, `POST` | `/news` | Fetch RSS/Atom feeds, return articles with 2–3 categories and IGS context links, and include source/run statistics. |
| `GET` | `/news/trending` | Cluster articles from the last seven days into multi-source SuperArticles, with categories and IGS context links. Requires AI to be enabled. |
| `GET` | `/news/detail/` | Fetch one public article and clean its extracted text without summarizing or rewriting it. |
| `GET`, `POST` | `/fetch` | Scrape a public page, return selected content, and optionally include AI-extracted structured items. |
| `GET` | `/health` | Public liveness response. |
| `GET` | `/meta` | Service and Playwright installation information. |

Application endpoint responses use the `{ "ok", "data", "error", "meta" }` envelope; `/openapi.json` returns the OpenAPI document. Examples and detailed request fields are in [be-full.md](./be-full.md).

## Tech and project docs

- **API/runtime:** FastAPI, Uvicorn, Pydantic Settings.
- **Feed collection:** `feedparser`, `httpx`, YAML presets, and normalized Pydantic models.
- **Page extraction:** Playwright/Chromium or static HTTP; BeautifulSoup uses Python's built-in `html.parser` for HTML parsing. `selectolax` is not a project dependency.
- **AI:** Optional Groq-backed weekly trending clusters, prompt-injection screening, `/fetch` structured extraction, and `/news/detail/` article cleaning.
- **News tags:** Deterministic Indonesian/English keyword tagging adds 2–3 categories and mapped IGS context links to news articles.
- **CLI tools:** `newsid` for feed collection and `pyscrape` for page extraction.

See [note-update.md](./note-update.md) for frontend integration notes, [TOGGLES.md](./TOGGLES.md) for runtime toggles, and [be-full.md](./be-full.md) for the developer handbook.

## Presenter IRN chatbot

`POST /chat/irn` is the news assistant for IRN mode. It is separate from the IGS
dataset assistant at `POST /chat`: it accepts up to 10 visible article cards
(`title`, `publisher`, `category`, `summary`, `url`, `published_at`) and sends
at most the first five to the model. It answers with a warm journalistic tone
and returns `tool_execution_ids` as a list.

It uses two news-pool tools with hard limits: `search_related_news` (max 5
results, 3 s) and `analyze_source_diversity` (2 s), with at most two executed tool
calls per message. Both read the in-memory pool that `/news` publishes into; they
never fetch external URLs. The assistant never states that an article is true,
hoax, or accurate — truth-verdict questions are answered deterministically with
publisher coverage instead of a model call.

See [irn-chatbot.md](./irn-chatbot.md) for the frontend contract and
[IRN_CHATBOT_PLAN.md](./IRN_CHATBOT_PLAN.md) for the design.
