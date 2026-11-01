# ARCHITECTURE

## Tech Stack & Dependencies
- **Framework:** Next.js 14 (App Router) – server‑side rendering, API routes, dynamic routing.
- **Language:** TypeScript (strict, `tsc --noEmit` passes).
- **Styling:** Tailwind CSS 3 with custom design tokens (paper, navy, red) and `@tailwindcss/typography`.
- **Charts & 3D:** ECharts 6 for 2‑D visualisasi; Three.js 0.169 + @react-three/fiber & @react-three/drei untuk peta interaktif.
- **Data Validation:** Zod 3 for schema enforcement of generated datasets.
- **AI Cleansing:** Groq LLM accessed via `/api/news` (server‑side only, API key stored in `.env.local`).
- **Utilities:** papaparse (CSV parsing), date‑fns, dexie (client‑side IndexedDB), sonner (toast), swr (data fetching).

## Data Pipeline (scripts/build-data.mjs)
1. **Input:** CSV files under `datasets/` (25+ datasets covering ekonomi, PBJ, layanan publik, APBD, makro, dan Phase B sources).
2. **Parsing:** `papaparse` reads each CSV with header row, converting strings to numbers where possible via `convertValue`.
3. **Schema Validation:** Each dataset validated against a Zod schema (`generatedDatasetSchema`).
4. **Normalization:** Province‑level datasets are normalised to a uniform `kode_wilayah` and `level` field; waste dataset distinguishes `provinsi` vs `kabkota`.
5. **Source‑of‑Truth Logic:** For overlapping social indicators, data up to 2022 is taken from legacy regional sources, newer years from the social indicator input.
6. **Aggregation:** `buildSocialDataset` merges ekonomi, makro, and new social indicator rows, applying population‑weighted aggregation (`jumlah_penduduk_total_ribu_jiwa`).
7. **Joining:** `joinRows` creates a map keyed by `kode_wilayah::tahun_anggaran` and merges all rows into a single unified record.
8. **Output:** Writes consolidated JSON files to `lib/data/` (e.g., `indikator_sosial.json`). Guarantees JSON‑safe values (`assertJsonSafe`).

## AI Cleansing Architecture
- **Endpoint:** `app/api/news/route.ts` (server component).
- **Flow:**
  1. Receive raw article URL.
  2. Fetch article HTML, strip HTML tags.
  3. Send sanitized text to Groq LLM with a prompt that enforces:
     - Removal of PII (NIK, NPSN, ds.).
     - No hallucination, factual summary only.
  4. Receive cleaned summary, cache in IndexedDB via `dexie` for offline reuse.
- **Security:** API key never sent to client; request performed server‑side.

## Design System (Anti‑Slop)
- **Typography:** `Plus Jakarta Sans` (body) & `IBM Plex Mono` (code/monospace).
- **Palette:** `paper‑50/100` (background), `gov‑primary` (navy), `brand‑red` (accent).
- **Borders:** Hairline (`border` utilities) with focus rings for accessibility.
- **Numbers:** `tabular‑nums` font‑feature for aligned numerals; formatter in `lib/utils/format-number.ts` provides compact Indonesian locale formatting (max 4 decimal places).
- **Accessibility:** ARIA labels on toggle, navigation, and dropdowns; `ModeToggle` uses `role="switch"`.

## Folder Structure Overview
```
app/                # Next.js App Router pages & API routes
  ├─ api/           # news, fetch, gov-geo endpoints
  ├─ gov/           # bidang pages (infrastruktur, lingkungan, pangan, …)
  ├─ _error/ …
components/         # UI primitives, layout, charts, three.js widgets
  ├─ layout/        # Sidebar, MobileSidebar, Navbar, ModeToggle
  ├─ gov/           # BidangHeader, YearSelectorClient, KPI strips, charts
  ├─ igs/           # GovYearProvider, InsightChart, Three.js map
lib/                # Data, transformers, utils, i18n labels
  ├─ data/          # JSON output of build-data.mjs
  ├─ transformers/  # Phase‑B typed data processors
  ├─ utils/         # format-number, weighting, aggregation helpers
  ├─ i18n/          # metric label definitions
scripts/            # build-data.mjs, additional‑datasets.mjs, geo‑builders
datasets/           # 25+ raw CSV files (2020‑2025)
public/             # static assets, favicons
test/               # vitest unit tests (29 passing)
README.md           # project overview (this file)
PHASE_PROGRESS.md   # latest build & QA status
PHASE_POLISH_PLAN.md#  # checklist of polish phases
```

---

*All code respects the anti‑slop guardrails from `PHASE_B_SPEC.md` and the repository contains **no** unused dependencies.*