# indonesia-right-now — Backend API

`indonesia-right-now` is a FastAPI service that collects and normalizes news from RSS/Atom feeds and extracts readable content from public web pages. Optional Groq-powered AI workflows help check untrusted page content for prompt injection and clean extracted article text.

## Tech Stack

- **API:** FastAPI and Python 3.11+
- **AI:** Groq API for extraction and prompt-injection screening. Model IDs are configurable; the example configuration currently uses `openai/gpt-oss-120b` (set `AI_GUARD_MODEL` and `AI_EXTRACTOR_MODEL` to choose other models supported by your Groq account).
- **Scraping and extraction:** Playwright for browser-rendered pages, BeautifulSoup for HTML parsing, and static fetching where appropriate.
- **Validation and settings:** Pydantic and Pydantic Settings.

## Requirements and Environment Setup

- Python 3.11 or newer
- A Groq API key when `AI_ENABLED=true` (the default)

Copy `.env.example` to `.env` before starting the service, then replace the sample `GROQ_API_KEY` value with your key. Keep `.env` private; do not commit real API keys.

The backend listens on **port 8000**. Its example CORS configuration allows the frontend origin **`http://localhost:3000`**. If your frontend uses another origin, update `APP_CORS_ORIGINS` in `.env`.

## Run Locally

```bash
# 1. Clone the backend repository (replace the URL with the repository URL)
git clone <url-repo-backend>
cd indonesia-right-now

# 2. Create and activate a virtual environment
python -m venv venv
source venv/bin/activate  # Linux/macOS
# Windows PowerShell: .\venv\Scripts\Activate.ps1

# 3. Install the project and its dependencies from pyproject.toml
python -m pip install -e .

# 4. Create .env from the example and add your Groq API key
cp .env.example .env       # Linux/macOS
# Windows PowerShell: Copy-Item .env.example .env

# 5. Install Chromium for Playwright-based fetching
python -m playwright install chromium

# 6. Start the API on port 8000
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
```

The repository defines dependencies in `pyproject.toml` (it does not include a `requirements.txt`). The service requires one worker because feed and request-delay state is maintained in-process.

## Configuration

The `.env.example` file contains the development defaults. Common settings:

| Variable | Purpose |
|---|---|
| `APP_ENV` | Runtime environment: `development` or `production`. |
| `APP_WORKERS` | Keep at `1`. |
| `APP_REQUEST_TIMEOUT` | Overall API operation timeout in seconds. |
| `APP_CORS_ORIGINS` | Comma-separated browser origins; defaults to `http://localhost:3000`. |
| `API_KEY` | Optional API authentication. When set, send it in the `X-API-Key` header to protected endpoints. |
| `AI_ENABLED` | Enables AI-backed extraction workflows. When `false`, `/fetch` and `/news/detail/` return 503; feed collection at `/news` remains available. |
| `GROQ_API_KEY` | Groq API key required when AI is enabled. |
| `PYSCRAPE_DEFAULT_TIMEOUT` | Default page-fetch timeout in seconds. |
| `PYSCRAPE_MAX_CHARS` | Maximum extracted text length. |
| `FETCH_MAX_URL_LENGTH` | Maximum accepted URL length for `/fetch`. |
| `LOG_FORMAT` | `console` or `json` logging. |

Additional model, cache, rate-limit, and feed settings are documented in `.env.example`.

## API Endpoints

All endpoints are served from `http://localhost:8000`.

| Method and path | Description |
|---|---|
| `GET /news` | Collect and filter RSS/Atom feed items using query parameters. |
| `POST /news` | Collect feed items using a JSON request body. |
| `GET /fetch` | Fetch a public page using query parameters and extract its content. |
| `POST /fetch` | Fetch a public page using a JSON request body. |
| `GET /health` | Check whether the service is responding. |

Example feed request:

```bash
curl -X POST "http://localhost:8000/news" \
  -H "Content-Type: application/json" \
  -d '{
    "sources": [
      {
        "name": "Example feed",
        "url": "https://example.org/news.xml",
        "enabled": true
      }
    ],
    "since": "24h",
    "max_items": 20,
    "dry_run": true
  }'
```

Example page extraction request:

```bash
curl -X POST "http://localhost:8000/fetch" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.org/article",
    "mode": "text",
    "engine": "static"
  }'
```

When `API_KEY` is configured, include `-H "X-API-Key: your_api_key"` on protected requests. `/health` is available without API-key authentication. Interactive `/docs` and `/redoc` pages are disabled; the OpenAPI schema is available at `/openapi.json`.

## Frontend Integration

The frontend consumes this API at **`http://localhost:8000`** during local development. Run the frontend at **`http://localhost:3000`** to match the default CORS allowlist, or update `APP_CORS_ORIGINS` to match its actual origin.

## Responsible Data Collection

Use publicly accessible sources, respect their terms and `robots.txt` policies, and avoid excessive request rates. The service validates destination URLs to help prevent requests to private or internal networks. It does not bypass authentication, CAPTCHAs, or other access restrictions. Treat fetched page content as untrusted input; the AI safety check fails closed if it cannot complete.
