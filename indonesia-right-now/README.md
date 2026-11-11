# IRN & IGS Backend API

FastAPI service powering Indonesian news collection and public-data assistant features for the IRN & IGS platform.

## Tech stack

Python, FastAPI, Pydantic, Groq AI SDK, BeautifulSoup, and Playwright.

## Run locally

Requirements: Python 3.11+.

1. From this folder, create and activate a virtual environment:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

   On macOS/Linux, activate with `source .venv/bin/activate`.

2. Install the project and browser dependencies:

   ```bash
   python -m pip install -e .
   python -m playwright install chromium
   ```

3. Create `.env` from `.env.example` (`Copy-Item .env.example .env` in PowerShell; `cp .env.example .env` on macOS/Linux) and set `GROQ_API_KEY`. AI is enabled by default; set `AI_ENABLED=false` if you want to run without AI.

4. Start the API:

   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
   ```

The API is available at `http://localhost:8000`; check `http://localhost:8000/health`.

## Features

- **RSS scraper:** collects and normalizes articles from configured Indonesian publisher feeds.
- **AI cleansing:** screens untrusted content for prompt injection and supports article processing and multi-source story clustering.
- **AI chat endpoints:** `POST /chat` provides the IGS tool-calling data assistant; `POST /chat/irn` provides the IRN Truth Guardrail presenter.
- **Caching and rate limits:** news and trending responses are cached; configured API endpoints enforce rate limits.

See `.env.example` for configuration options. Rate limits apply in production; an optional `API_KEY` enables API-key authentication.
