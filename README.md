# IRN & IGS Platform (Indonesia Right Now & Indonesia Government Stats)

A unified civic-tech platform combining real-time Indonesian news intelligence (IRN) and open government data visualization (IGS).

## Tech stack

Next.js 14, FastAPI, TypeScript, Python, Tailwind CSS, ECharts, Three.js, and Groq AI.

## Key features

- **Dual-mode architecture:** switch between IRN news discovery and IGS public-data exploration.
- **AI assistants:** IRN's Truth Guardrail presenter chatbot and IGS tool-calling data assistant.
- **25+ datasets:** explore government data through regional dashboards and visualizations.
- **Open data:** datasets and news context are presented for public exploration.

## Run the monorepo

Requirements: Node.js 20+, pnpm, and Python 3.11+.

1. Clone both repositories into the expected folders:

   ```bash
   git clone https://github.com/dedyasxkaguya/indonesia-right-now.git
   cd indonesia-right-now
   git clone https://github.com/dedyasxkaguya/indonesia-right-now-fe.git indonesia-right-now-fe
   ```

2. Set up and start the backend in the first terminal:

   ```powershell
   cd indonesia-right-now
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   python -m pip install -e .
   python -m playwright install chromium
   Copy-Item .env.example .env
   # Set GROQ_API_KEY in .env before starting
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 1
   ```

   On macOS/Linux, activate with `source .venv/bin/activate` and copy the environment file with `cp .env.example .env`.

3. Configure and start the frontend in a second terminal from the repository root:

   ```powershell
   cd indonesia-right-now-fe
   pnpm install
   Copy-Item .env.example .env.local
   # Set BACKEND_URL=http://localhost:8000 in .env.local
   pnpm dev
   ```

On macOS/Linux, copy the frontend environment file with `cp .env.example .env.local`. The backend runs at `http://localhost:8000` and the frontend at `http://localhost:3000`. Keep both terminals running. Environment files are local configuration and should not be committed.
