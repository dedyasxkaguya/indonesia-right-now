# Context Files to Provide the AI

Attach these **3 files + 1 contract snippet** (same as before, unchanged):

| # | File | Rename as |
|---|---|---|
| 1 | `deepseek_json_20261027_f94d43.json` | `design-system.json` |
| 2 | `contohdata.json` (trimmed to ~40 items) | `news-response.example.json` |
| 3 | `contohdatafetch.json` | `fetch-response.example.json` |
| 4 | snippet below | `backend-contract.md` |

```markdown
# Backend contract summary (from README.md)

- Service base: http://localhost:8000
- No API key required (API_KEY empty in .env)
- Single worker (APP_WORKERS=1)
- Endpoints consumed by frontend:
  - GET /news  → NewsResponse (see news-response.example.json)
  - POST /fetch → FetchResponse (see fetch-response.example.json)
- Relevant error codes:
  FETCH_SSRF_BLOCKED (400), FETCH_FORBIDDEN (403), FETCH_TIMEOUT (504),
  FETCH_NO_CONTENT (422), FETCH_AI_GUARD_BLOCKED (403),
  FETCH_AI_EXTRACTOR_FAILED (502), FETCH_AI_CONFIG (500), FETCH_INTERNAL (500),
  NEWS_ALL_SOURCES_FAILED (502), NEWS_NO_ITEMS_FETCHED (422),
  NEWS_INVALID_CONFIG (400), NEWS_WRITE_FAILED (500),
  VALIDATION_ERROR (422), REQUEST_TIMEOUT (504)
- /fetch is slow (10–25s); set client timeout ≥ 60s
- /news is fast (~10s); safe to cache 60s
```

---

# The Prompt (English) — **indonesia-right-now**, Anti-Generic Edition

> **Instructions for the AI coding agent:** You are an **opinionated, senior brand and frontend designer and engineer**. Build the **indonesia-right-now** web application per this specification. Do not add features outside scope. Follow design tokens and data transformations literally. All UI copy must be in **Bahasa Indonesia**. Code must run via `pnpm install && pnpm dev` once the backend at `localhost:8000` is active.
>
> **Before writing any code:** complete the three-step rationale below, in a short comment block at the top of `app/page.tsx` and in `README.md`:
> 1. **Generic defaults you refuse.** List the AI-default moves you would normally make here (Inter, blue-purple gradients, centered hero + 3 floating feature cards, generic "3 steps" section, nested card-in-card borders, gray-on-colored text, floating UI mockups, decorative blobs). Commit to rejecting each of them, and note *what you did instead*.
> 2. **Your chosen visual direction.** Restate the palette (hex codes), the two typefaces (§1.4), and the single memorable element (§1.5) in your own words, plus one sentence on why they fit *this* product.
> 3. **Anti-AI checklist.** Confirm each rule in §1.2 is honored.
>
> **Hard rule:** Never invent numbers, logos, testimonials, or publishers. Every figure on screen must trace to a real field in `news-response.example.json` or `fetch-response.example.json`, or a value computed by a transformer in §4. If a value isn't there, show `<StateCard variant="empty">` instead.

---

## 0. Context & Mission

Build the **indonesia-right-now** web application — an Indonesian news intelligence portal. The visual DNA inherits *editorial seriousness* from a formal anti-corruption platform (the "JAGA" design system), but is executed with **premium, warm-paper editorial minimalism** — think *The Economist*, *Stripe Press*, *Are.na*, *NYT Interactive*, not *Linear-clone-of-the-week*.

**Product name and wordmark everywhere:** `indonesia-right-now` — lowercase, hyphenated, one atomic wordmark. Do not capitalize, do not shorten, do not split. Use the exact string in the navbar, `<title>`, meta description, footer, README, `package.json` name, and all placeholder copy.

Three pillars:
1. **Real-time visual news curation** from the feed aggregator (`/news`).
2. **Deep URL analysis** — user pastes a link → AI extracts items + pipeline quality report (`/fetch`).
3. **Data intelligence** — source health, publisher dominance, category velocity, publish→fetch latency, AI pipeline quality.

Backend `indonesia-right-now` runs at `http://localhost:8000`. **No API key required.** Frontend must not assume the backend is always alive — handle every state (loading, error, empty, partial, offline).

---

## 1. Brand Identity & Anti-Generic Design

### 1.1 What we are explicitly NOT
Ban these AI-default moves from the codebase:

| Banned | Why | Replacement |
|---|---|---|
| Font `Inter`, `Roboto`, `Arial`, or system sans-serif | Inter is the universal AI default; it erases character | **Plus Jakarta Sans** (§1.4) |
| Purple-to-blue or indigo gradients anywhere | The universal "AI hero" signature | Warm-paper backgrounds + a single sharp accent (§1.3) |
| Centered hero with two buttons | Cookie-cutter | Asymmetric 60/40 split with type-driven headline (§5.1) |
| Row of 3 rounded floating feature cards | Overused trope | **Numbered editorial ledger** — vertical, left-aligned, hairline separators, monospace numerals (§5.1) |
| Card-in-card (nested `box-shadow` containers) | Cheap depth hack | Flat layers with hairline dividers only (`border-color: --ink-10`) |
| Gray body text on colored backgrounds | Illegible & lazy | Ink-on-paper contrast ≥ AA, colored text is reserved for accents |
| Generic floating UI mockups | Stock AI aesthetic | Real rendered components from `/api/news`, or omit |
| Decorative SVG "blob" backgrounds | The AI signature | One hairline motif (§1.5) or nothing |
| Flashy scroll-triggered animations on every section | Amateur | One orchestrated hero load + subtle micro-interactions only |
| Emoji icons in UI copy | Clashes with editorial tone | `lucide-react` at 16/20/24px stroke-1.5 |

### 1.2 Anti-AI rules (must hold)
- **No gradient across two hue families.** A tonal gradient within the same hue (e.g., `#A02020 → #D32F2F`) is allowed only on primary buttons, ≤ 8% visual area.
- **Dominant background tone**: warm paper `#F7F3EC`, not white. Cards are warm cream `#FDFBF6`, not white. This alone is the biggest anti-AI signal.
- **Sharp accent, restrained**: only `#D32F2F` (red) and `#B45309` (ochre) carry visual weight. Purple `#4A148C` is *data-viz only* — never UI chrome.
- **Typography does the heavy lifting.** Headlines are larger than you think they should be (56–72px on desktop). Body is smaller than you think (15px, `leading-7`). The *ratio* is what feels premium.
- **Whitespace is structural, not decorative.** Section padding 96–120px vertical on desktop. Column gutters 32–48px. Never fill space just because it's empty.
- **Asymmetric grids**: never `grid-cols-3` for content rows. Use `grid-cols-12` with asymmetric spans (`span-7` / `span-4` with `offset-1`), or CSS grid with explicit `grid-template-columns: 5fr 7fr` and varied row heights.
- **One motion choreography per page**, at most. Hero counters ease in once on load (~1.2s), Three.js canvas reveals with a slow opacity + scale (700ms). Everything else is micro (hover, focus) — never scroll-triggered pop-ins on 8 elements.
- **Hairlines over shadows.** Prefer `border: 1px solid #D9D2C4` to `box-shadow` for structure. Use shadow only for modal overlays.
- **No fabricated content.** No testimonials, no invented "10M+ users", no fake publisher logos. If a metric isn't computed from real data, don't show it.

### 1.3 Palette — Warm Paper, Sharp Accent

```ts
// tailwind.config.ts
colors: {
  paper: {
    50:  '#FDFBF6',  // card surface (warm cream)
    100: '#F7F3EC',  // canvas (dominant background)
    200: '#EDE8DF',  // subtle surface (inputs, tags)
    300: '#D9D2C4',  // hairline border
    400: '#B8AF9B',  // muted border
  },
  ink: {
    900: '#141414',  // primary text, near-black, warmer than #000
    700: '#3A3733',  // strong secondary
    500: '#5C5852',  // body secondary
    400: '#8C8882',  // captions
    300: '#B8B4AE',  // disabled
    100: '#E8E5E0',  // dividers on paper
  },
  brand: {
    red:      '#D32F2F',  // the single primary accent (from JAGA)
    redDeep:  '#A02020',  // press/hover state
    ochre:    '#B45309',  // editorial secondary accent — dated marks, pull-quotes, timestamp emphasis
  },
  data: {
    purple:   '#4A148C',  // DATA VIZ ONLY — chart edges, alt-series, network nodes
    purpleSoft:'#EDE7F6',
    success:  '#15803D',
    danger:   '#B91C1C',
    amber:    '#FBBF24',  // category pill
    pink:     '#FDE8E8',  // icon square background
  },
},
```

**Rule of thirds:** Roughly 70% of any viewport is paper tones, 25% is ink text, 5% is brand red. If red is competing for attention with ink, red wins *locally* (a single button, a single rule) — it's a scalpel, not a paint bucket.

### 1.4 Typography — Two Typefaces Only

**Primary — `Plus Jakarta Sans`** (Google Fonts, by Tokotype, commissioned for the Jakarta city government). Weights 400 / 500 / 600 / 700 / 800.

```ts
// app/layout.tsx
import { Plus_Jakarta_Sans, IBM_Plex_Mono } from 'next/font/google';

export const sans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
  display: 'swap',
});

export const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});
```

**Rationale for Plus Jakarta Sans:** it's a geometric sans with subtle humanist details (the angled terminal on `a`, the open apertures) that reads editorial at display sizes and warm at body sizes. Thematically exact — this is a portal about Indonesia, set in a typeface designed for Jakarta's own government. It is *not* Inter, *not* Roboto, *not* a system fallback.

**Secondary / mono — `IBM Plex Mono`** (Google Fonts). This is my recommendation: it is genuinely linear (geometric monospace) yet has editorial weight — the slightly-slab serifs on `i`, `l`, and `1` communicate "data, discipline, printed ledger" without drifting into developer-terminal territory (unlike JetBrains Mono) or quirk (unlike Space Mono). It pairs beautifully with Plus Jakarta Sans because both share a similar x-height and terminal angle.

**Mono usage is surgical.** Use IBM Plex Mono *only* for:
- Large KPI numbers (`mono-num` token: 40–56px, weight 600, `tracking-tight`)
- Section index numerals (`01 / 02 / 03` in the ledger, §5.1)
- Timestamps, error codes, table cell data, URL strings
- Small uppercase eyebrow labels (`tracking-[0.14em]`, size 11px, weight 500)
- Never for body paragraphs, headlines, or buttons.

**Typography scale (`tailwind.config.ts`):**
```ts
fontSize: {
  'display': ['68px', { lineHeight: '1.02', letterSpacing: '-0.035em', fontWeight: '700' }],
  'h1':      ['48px', { lineHeight: '1.08', letterSpacing: '-0.025em', fontWeight: '700' }],
  'h2':      ['32px', { lineHeight: '1.2',  letterSpacing: '-0.02em',  fontWeight: '700' }],
  'h3':      ['20px', { lineHeight: '1.35', letterSpacing: '-0.01em',  fontWeight: '600' }],
  'body':    ['15px', { lineHeight: '1.7',  letterSpacing: '0' }],
  'caption': ['13px', { lineHeight: '1.5',  letterSpacing: '0.01em' }],
  'eyebrow': ['11px', { lineHeight: '1.4',  letterSpacing: '0.14em',  fontWeight: '600' }],
  'mono-num':['44px', { lineHeight: '1',    letterSpacing: '-0.02em', fontWeight: '600' }],
},
```

**Section headers** use `display` or `h1` with a leading mono numeral:
```
01 —— Aliran Berita
```
The numeral `01` in IBM Plex Mono, `brand.red`; the em-dash rule is a 32px hairline in `paper-300`; the label in Plus Jakarta Sans `h2`.

### 1.5 The Memorable Element — **"The Thread"**

Every page has a **single vertical hairline in `brand.red`**, 1px wide, running down the **left gutter** from just below the navbar to just above the footer. On it are **numbered markers** — small circles with mono numerals — positioned at each major section. The active section's marker fills solid red; inactive markers are hollow (`border: 1px solid brand.red`, 6px diameter). On hover, the number's `font-size` grows from 11px to 14px and a **flag** slides out 16px horizontally (`transform: translateX`) — a tiny paper-colored rectangle with the section name in mono 10px.

Implementation: a single `<aside>` component (`<TheThread sections={[{id, label}]} />`) fixed or `sticky` on the left. Uses `IntersectionObserver` for the active state. On mobile (< 1024px) it collapses to nothing.

**Why this:** it's a "case-file margin" motif — the visual language of investigation, editorial annotation, and prosecution files, which fits both the JAGA legacy and the news-integrity mission. It costs ~80 lines of code, has zero performance impact, and is instantly recognizable as *"that site with the red thread"*. It is the *one* thing you'll remember.

### 1.6 Layout anti-patterns to actively subvert

| Instead of… | Build… |
|---|---|
| Hero: centered text + two buttons | Asymmetric: 7/12 type-driven headline left, 5/12 `<IndonesiaFlowScene />` right, CTA buttons **left-aligned under headline, inline with a hairline** |
| Row of 3 rounded feature cards | **Vertical ledger** — three rows, each: mono numeral `01/02/03` (48px, `ink-300`) on the left, h3 + 2-line description in the middle, red "→ Selengkapnya" link on the right. Hairline divider between rows. No boxes, no shadows. |
| "How it works" 3-step section | **One horizontal timeline-tape**: a 1px ink-100 hairline with three mono-labeled tick marks, each with a short paragraph beneath. Reads like a data feed, not a marketing page. |
| FAQ accordion | Omit entirely. Not needed for a tool. |
| Pricing table | Omit entirely. This isn't a SaaS product. |
| Testimonials | Omit entirely. Zero testimonials exist. |
| Footer with 4 dense columns | Footer: 12-column grid, wordmark + tagline (span 5), nav (span 3), backend status + `last sync` (span 4, right-aligned, mono). One hairline above, one below. |

---

## 2. Tech Stack & Constraints

| Area | Choice |
|---|---|
| Framework | Next.js 14 App Router (RSC + Client Components) |
| Styling | Tailwind CSS 3.4 |
| 3D | `@react-three/fiber` + `@react-three/drei` + `three` |
| Charts (2D) | `recharts` |
| Icons | `lucide-react` |
| UI animation | `framer-motion` (used sparingly — see §1.2) |
| Date | `date-fns` + `date-fns-tz` |
| Validation | `zod` (API parsing + type guards) |
| Language | UI in **Bahasa Indonesia** (no toggle) |
| Data fetching | RSC for pages; SWR for client-side refetch |
| Dev port | `localhost:3000` |
| Package name | `indonesia-right-now` |

**Prohibited:**
- Never call `http://localhost:8000` from a Client Component. All requests via Route Handlers in `/app/api/*`.
- No global state manager (Redux/Zustand). SWR + Server Actions suffice.
- No `any` in TypeScript. All API responses validated via `zod`.
- No additional typeface beyond Plus Jakarta Sans and IBM Plex Mono.

---

## 3. API Contract & Proxy Route Handlers

### 3.1 TypeScript Types (`lib/types/api.ts`)

```ts
export interface NewsSource {
  url: string;
  publisher: string;
  status: 'ok' | 'error';
  fetched_at: string;
  items: number;
  error: { code: string; message: string } | null;
}

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  publisher: string;
  publisher_domain: string;
  author: string | null;
  published_at: string;
  date_confidence: 'exact' | 'approx' | 'unknown';
  summary: string | null;
  content: string | null;
  categories: string[];
  language: string | null;
  source_url: string;
  fetched_at: string;
}

export interface NewsStats {
  sources_total: number;
  sources_ok: number;
  sources_failed: number;
  items_fetched: number;
  items_kept: number;
  items_deduped: number;
}

export interface NewsResponse {
  ok: boolean;
  data: {
    schema_version: number;
    generated_at: string;
    date: string;
    date_tz: string;
    query: Record<string, unknown>;
    stats: NewsStats;
    sources: NewsSource[];
    items: NewsItem[];
    snapshot: { written: boolean; filename: string; path: string; dry_run: boolean };
  };
  error: null | { code: string; message: string; details?: unknown };
  meta: { request_id: string; duration_ms: number; service: string; version: string };
}

export interface FetchNewsItem {
  id: string;
  title: string;
  snippet: string | null;
  url: string | null;
  source_name: string | null;
  source_verified: boolean;
  published_text: string | null;
  duration_text: string | null;
  views_text: string | null;
  badges: string[]; // 'BREAKING' | 'LIVE' | 'SHORTS' | 'BARU' | 'POPULER'
  extras: Record<string, unknown>;
}

export interface FetchAIStats {
  guard_status: 'pass' | 'error' | 'blocked';
  guard_confidence: number;
  chunks_total: number;
  chunks_ok: number;
  chunks_failed: number;
  items_raw: number;
  items_kept: number;
  items_omitted: number;
  deduped: number;
  language: string;
  model: string;
  cached: boolean;
  duration_ms: number;
}

export interface FetchResponse {
  ok: boolean;
  data: {
    url: string;
    final_url: string;
    mode: string;
    engine: string;
    title: string;
    truncated: boolean;
    length: number;
    http_status: number;
    screenshot_png_base64: string | null;
    duration_ms: number;
    news_items: FetchNewsItem[];
    raw: string | null;
    ai: FetchAIStats;
    saved: { written: boolean; path: string; filename: string };
  };
  error: null | { code: string; message: string; details?: unknown };
  meta: { request_id: string; duration_ms: number; service: string; version: string };
}
```

### 3.2 Route Handler Proxy

**`app/api/news/route.ts`**
- `GET` with optional query (`since=24h&max_items=100`).
- Fetch `http://localhost:8000/news?${qs}` (`process.env.BACKEND_URL ?? 'http://localhost:8000'`).
- `next: { revalidate: 60 }`.
- Validate response with `zod`. On mismatch → `{ ok: false, error: { code: 'UPSTREAM_SCHEMA_MISMATCH' } }`.
- `AbortController` timeout 15s → `{ ok: false, error: { code: 'UPSTREAM_TIMEOUT' } }`.

**`app/api/fetch/route.ts`**
- `POST` body `{ url: string }` (zod: must be `http(s)`, ≤ 2048 chars).
- Fetch `http://localhost:8000/fetch` with `{ url, mode: 'text', save: false, include_raw: false }`.
- Timeout 60s.
- Return validated JSON.
- Translate backend error codes into user-facing Bahasa Indonesia (§5.4 table).

**Backend down (`ECONNREFUSED`):** return `503` with `{ ok: false, error: { code: 'BACKEND_OFFLINE', message: 'Layanan berita tidak dapat dijangkau. Coba lagi beberapa saat lagi.' } }`. UI renders with "Coba Ulang".

---

## 4. Data Transformation Layer — 7 Insights (All Required)

Create `lib/transformers/` — deterministic pure functions. Each accepts `NewsResponse['data']` or `FetchResponse['data']` and returns render-ready shape.

| # | Insight | Function | Renderer |
|---|---|---|---|
| 1 | **Source Health Score** | `computeSourceHealth(data)` → `{ healthPct, byStatus[], errorCodes[], worstOffenders[] }` | Donut (60% `brand.red` / 40% `ink-300`) + horizontal bar list of error codes |
| 2 | **Publisher Dominance** | `computePublisherDominance(items)` → top 8 `{ publisher, count, sharePct, domains[] }` | Horizontal stacked bar; #1 = `brand.red`, gradient to `ink-400`; mono share labels |
| 3 | **Category Velocity** | `computeCategoryVelocity(items)` → `{ category, hourly: number[], deltaPct }[]` (24h rolling, hourly buckets) | Multi-line sparkline; `deltaPct > 50%` flagged "melonjak" in `brand.ochre` |
| 4 | **AI Pipeline Reliability** | `computePipelineReliability(data)` → `{ extractionYield, dedupeRate, fetchSuccessRate }` | 3 arc gauges + 2-sentence narrative |
| 5 | **Time-to-Publish Latency** | `computeLatency(items)` → `{ median, p95, buckets[] }` (minutes) | Histogram + median & p95 hairlines; caption "Median X menit dari publish ke fetch" |
| 6 | **Cross-Source Dedup Rate** | `computeDedupRate(stats)` → `{ rate, deduped, fetched }` | Single KPI card, mono num + sparkline |
| 7 | **Keyword Co-occurrence** | `computeKeywordGraph(items, { topN: 20 })` → `{ nodes[], edges[] }` (tokenize title, drop ID stopwords, count co-occurrences) | 2D SVG network graph (**not** Three.js); nodes sized by weight; click → highlight neighbors |

**Rules:** deterministic (no `Math.random`); empty/partial input → `{ insufficient: true }` and UI shows `<StateCard variant="empty">`; every KPI has interpretive subtext — no bare numbers.

---

## 5. Page Specifications

### 5.1 `/` — Landing

**Section 1 — Hero (min 100dvh, asymmetric 7/5 split)**
- **Left (span 7):**
  - Eyebrow (mono, `eyebrow` token, `ink-400`): `LIVE · 24 JAM · 10 SUMBER`
  - `<h1 display>` (two lines): "Berita Indonesia," / "dalam satu pandangan **jernih**." — the final word `jernih` set in `brand.red`.
  - Subpar (max 52ch): "indonesia-right-now mengumpulkan, mengurasi, dan menganalisis ribuan berita dari 10 sumber tiap 24 jam."
  - CTA row (inline, not stacked-centered): primary red `Lihat Dashboard →` + a text-link `Analisis URL` (`brand.red` with underline offset 4px).
  - Below a 32px gap, a **counter ribbon** (not cards): a horizontal row of 4 figures separated by vertical 1px hairlines — each figure `mono-num` 44px with a mono `eyebrow` label beneath. Numbers animate once on load with `CountUp` (~1200ms ease-out).
- **Right (span 5):** `<IndonesiaFlowScene />` — Three.js (spec §6.1). Canvas transparent, floats on `paper-100`.
- Bottom of hero, spanning full width: **"The Thread" begins here** (see §1.5).

**Section 2 — "Tiga Pilar" as a Ledger**
Instead of cards, build a **vertical ledger**: three rows separated by hairlines `ink-100`. Each row:
```
01 —— Kurasi Otomatis
      Deskripsi dua baris. Tidak ada kotak, tidak ada shadow.
                                                    → Selengkapnya
```
Left: mono numeral (`h2` size, `ink-300`) + em-dash rule. Middle: `h3` title + `body` description. Right: red text-link. Row padding-block 40px.

**Section 3 — "Snapshot Hari Ini"**
- Section header with mono `02 ——`.
- A 12-col grid with **mixed heights and spans**: Source Health card spans 4 rows × 1 (tall); Items Kept spans 5; Median Latency spans 3; then a line chart (`categoryVelocity`) spanning 8 cols below.
- All cards: `bg-paper-50`, `border border-paper-300`, `rounded-card` (12px), NO drop shadow. Card padding 24–28px.

**Section 4 — "Coba Analisis URL"**
- Left column (span 5): section header with mono `03 ——`, headline, hint text (mono URL sample, `ink-500`), warning callout (a `border-l-2 border-brand-red pl-4 text-body` — hairline rule, not a rounded alert box).
- Right column (span 7): the URL form itself. Input takes full width, 2px border on focus (`brand.red`), min-height 56px. Submit button red, right-aligned with mono label `Analisis →`.
- Below: skeleton → preview of 3 results → CTA "Lihat analisis lengkap →" to `/analisis-url?url=...`.

**Section 5 — Closing**
Single sentence in `display` centered (exception to asymmetry rule): "Bukti, bukan sekadar klik." Below it, one red underline link `Mulai dari Dashboard →`. Nothing else. Footer immediately after.

### 5.2 `/dashboard` — Operational Dashboard

Layout: 12-col grid, left sidebar (span 3, sticky top-24) + content (span 9).

**Sidebar:**
- Filters stacked vertically with mono labels: `RENTANG WAKTU` (pill toggle: 24j / 7h / 30h), `KATEGORI` (checkbox list from unique categories), `PUBLISHER` (checkbox list).
- Below: "Sumber" list — 10 rows, each `[dot] Nama Publisher` (mono `caption`), dot `data.success` / `data.danger`. Hover tooltip: `error.code` in mono.
- All filters trigger `/api/news` refetch via SWR. Loading: skeleton bars on each KPI card.

**Content:**
- **Row 1 — KPI strip** (not cards; a single framed strip with internal vertical hairlines, `bg-paper-50`, `border border-paper-300`): four figures — Source Health (%), Items Kept, Median Latency (min), Dedup Rate (%). Each `mono-num` with `eyebrow` label + `caption` subtext. Height fixed ~140px.
- **Row 2 — Feed (span 8) + Dominance (span 4)**: feed items rendered as **editorial list items** (not cards): each row separated by `border-t border-paper-300`, with `[mono category pill] [title h3 in 2 lines] [publisher · time caption]` + gradient thumbnail on the right if exists, else nothing. Dominance: horizontal stacked bar in the right column.
- **Row 3 — Velocity chart** (full width): Recharts `LineChart` with `brand.red` + `data.purple` + `brand.ochre` series; no grid lines except horizontal hairlines; no legend box — labels directly on lines.
- **Row 4 — Pipeline quality** (full width): three gauges + a 2-sentence `body` narration with mono-emphasized numbers.

**Empty state:** full-width `<StateCard>` "Tidak ada berita cocok dengan filter. Reset filter." with red button.

### 5.3 `/analitik` — Deep Analytics

24h snapshot, more narrative, no filters.

- Hero: `h1` "Analitik 24 Jam" + mono `generated_at` in `caption` (`d MMM yyyy · HH:mm zzz`).
- **Section A — Ecosystem Health:** `sources[]` table. No card chrome — the table *is* the section, with a 1px `paper-300` border top and bottom, mono column headers (`eyebrow`), ink-900 body cells, hairline zebra (`odd:bg-paper-100/40`). Tabs above: `Semua · Sehat · Gagal` (text buttons with red underline on active).
- **Section B — News Flow Map (Three.js):** `<PublisherNetworkScene />` (§6.2). Legend as a plain list on the left, zoom/reset as mono text buttons on the right.
- **Section C — Keyword Network (2D SVG):** `<KeywordGraph />`. Nodes in `data.purpleSoft` fills with `data.purple` stroke; edges `paper-300` at 40% opacity. Click node → highlight neighbors + show top-5 titles in a side panel (`bg-paper-100`, hairline left border).
- **Section D — Latency Distribution:** histogram + median & p95 lines in `brand.ochre` and `brand.red`; caption with narrative.
- **Section E — Category Distribution:** Recharts `<Treemap>` with `brand.red`, `brand.ochre`, and data-viz purples as fills (3–5 categories max; the rest collapse into `ink-300` "Lainnya").
- **Section F — AI Quality (last `/fetch`):** card with `guard_status`, confidence gauge, chunk success ratio, `items_kept / items_raw`, model name (mono), `cached` flag.

### 5.4 `/analisis-url` — Primary Feature

**State 1 — Input:**
- Two-column: left is form (span 6), right is a short editorial explainer (span 5, offset 1) with mono steps `01 → Ambil halaman`, `02 → Guard`, `03 → Ekstrak`, `04 → Dedup`.
- URL input: `min-h-14`, `bg-paper-50`, `border-2 border-paper-300`, focus → `border-brand-red`. Submit button `bg-brand-red text-paper-50` right-aligned.
- Warning callout below input: `border-l-2 border-brand-red pl-4` — "Beberapa URL akan diblokir oleh proteksi SSRF (target privat/lokal tidak diizinkan)."

**State 2 — Loading:**
- Skeleton UI. A **mono checklist on the left** ("Mengambil halaman …", "Memindai prompt-injection …", "Mengekstrak berita (3 chunk paralel) …") with a subtle loading indicator — **no spinner**; each step gets a red dot that pulses once when "complete" (staged timeouts for UX, since backend ~20s).

**State 3 — Result:**
- Header: mono `final_url` in `ink-700` (external link), `http_status` badge (pill, `border` red if ≥ 400), `duration_ms` in `caption`.
- **Left panel — Pipeline Report:** in a `bg-paper-50 border border-paper-300 rounded-card p-6` frame. Includes: guard confidence gauge (arc), chunk success (`3 / 5` mono-num), items kept vs raw (`22 / 22`), deduped (`0`), model name mono, cached flag pill.
- **Right panel — `news_items`:** 2-column grid of **editorial cards** (not rounded "app cards"): `border-t border-paper-300 pt-4` (hairline top instead of full border), title h3, source name in `ink-700` weight 600, published text in `caption` `ink-400`, metadata pills (`duration_text`, `views_text`) in mono `caption` `ink-500` with `bg-paper-200 px-2 py-0.5 rounded-pill`. Badges above title: `BREAKING` (red pill), `LIVE` (red pill with pulsing dot), `SHORTS` (ochre pill), `BARU` (green pill).
- "Analisis URL lain" button — ghost, top-right of result view.

**Error state mapping:**

| code | Bahasa Indonesia message |
|---|---|
| `FETCH_SSRF_BLOCKED` | "URL mengarah ke alamat privat/lokal — tidak diizinkan." |
| `FETCH_AI_GUARD_BLOCKED` | "Konten halaman terindikasi mengandung prompt-injection. Analisis dibatalkan." |
| `FETCH_AI_EXTRACTOR_FAILED` | "AI tidak menemukan item berita yang dapat diekstrak." |
| `FETCH_TIMEOUT` | "Halaman memakan waktu terlalu lama. Coba URL lain atau ulangi." |
| `BACKEND_OFFLINE` | "Layanan tidak terjangkau. Pastikan server berjalan." |

Rendered as `<StateCard variant="error">` with the message + mono `error.code` + retry button.

---

## 6. Three.js Specifications

**General:**
- `<Canvas>` lazy-loaded via `next/dynamic` `{ ssr: false }` + paper-toned skeleton placeholder.
- All scenes: `dpr={[1, 1.75]}`, `frameloop="demand"`, `gl={{ antialias: true, powerPreference: 'high-performance' }}`.
- Pause rendering on tab blur (`document.visibilitychange`).
- **Reduced motion** (`useReducedMotion()`) → static single-frame.
- Canvas transparent so `paper-100` shows through; **no Three.js lighting spilling onto page chrome** — keep the canvas bounded.
- Colors on 3D: `brand.red` (points, hotspots), `paper-300` (grid lines if any), `data.purple` (edges in PublisherNetwork). **No blue. No cyan. No purple gradients.** A red-to-ochre gradient on hotspot pulse is allowed.

### 6.1 `<IndonesiaFlowScene />` — Hero

Indonesian archipelago silhouette as a **point cloud** (lighter, more premium than a solid mesh). Particles drift slowly Sabang→Merauke; density and velocity driven by `items_kept` from `/api/news`. Red hotspots pulse at ~20 fictional publisher HQ locations spread across the archipelago (Java clusters to ~4 distinct points, not 6). **No globe lines, no continents in the background, no floating labels.**

- Sample archipelago silhouette from an SVG path → precompute ~8,000 points → `lib/three/indonesia-points.json`.
- `<Points>` + `<PointsMaterial size={0.015} color="#D32F2F" transparent opacity={0.55} />`.
- Slow rotation 0.02 rad/s; hotspots are small spheres with `emissive` red + `useFrame` pulse scale.
- `OrbitControls`: no zoom, no pan, no autoRotate; drag to rotate with damping 0.1.
- Budget: < 12k triangles, < 500KB tree-shaken bundle.

### 6.2 `<PublisherNetworkScene />` — Analytics

Nodes = top 8 publishers in 3D circular arrangement; size ∝ article count. Edges = co-occurrence (same category in 24h window). Node color `data.purple` fills with `brand.red` accents on the largest 3. Edges `paper-300` at 30% opacity, dashed if weight below threshold. Hover node → highlight + `drei <Html>` tooltip with publisher name in **Plus Jakarta Sans 12px weight 600**.

- Entrance: nodes emerge from origin with stagger via `useSpring`.
- Click node: fly-to camera (damped lerp).
- Budget: < 3k triangles, 8 nodes, ≤ 28 edges.

### 6.3 Guardrails
- Lighthouse ≥ 90.
- Canvas ≤ 60% of viewport height (mobile: < 40dvh).
- `navigator.deviceMemory < 4` or `hardwareConcurrency < 4` → render static SVG fallback.

---

## 7. Folder Architecture

```
indonesia-right-now/
├─ app/
│  ├─ layout.tsx                     # fonts, metadata, TheThread, Navbar, Footer
│  ├─ page.tsx                       # Landing
│  ├─ dashboard/page.tsx             # RSC
│  ├─ analitik/page.tsx              # RSC
│  ├─ analisis-url/page.tsx          # Client form
│  └─ api/
│     ├─ news/route.ts
│     └─ fetch/route.ts
├─ components/
│  ├─ layout/         Navbar.tsx, Footer.tsx, TheThread.tsx, Breadcrumbs.tsx
│  ├─ ui/             Button.tsx, SurfaceCard.tsx, StateCard.tsx, Badge.tsx, Pill.tsx, CountUp.tsx, SectionHeader.tsx, LedgerRow.tsx
│  ├─ dashboard/      KpiStrip.tsx, SourceHealthDonut.tsx, PublisherBars.tsx,
│  │                  VelocityChart.tsx, PipelineGauges.tsx, NewsFeed.tsx, NewsRow.tsx
│  ├─ analytics/      SourceTable.tsx, KeywordGraph.tsx, LatencyHistogram.tsx,
│  │                  CategoryTreemap.tsx, AIQualityCard.tsx
│  ├─ url-analysis/   UrlForm.tsx, AnalysisResult.tsx, PipelineReport.tsx
│  └─ three/
│     ├─ IndonesiaFlowScene.tsx
│     ├─ PublisherNetworkScene.tsx
│     ├─ CanvasWrapper.tsx
│     └─ IndonesiaFlowStatic.tsx
├─ lib/
│  ├─ api/            client.ts, schemas.ts
│  ├─ transformers/   source-health.ts, publisher-dominance.ts, category-velocity.ts,
│  │                  pipeline-reliability.ts, latency.ts, dedup-rate.ts, keyword-graph.ts
│  ├─ three/          indonesia-points.json
│  ├─ types/          api.ts
│  └─ utils/          format.ts
├─ styles/globals.css
├─ tailwind.config.ts
├─ tsconfig.json
├─ next.config.mjs
├─ package.json                       # name: "indonesia-right-now"
└─ .env.example                       # BACKEND_URL=http://localhost:8000
```

---

## 8. Performance & Accessibility

- **RSC-first**: Dashboard & Analytics server-rendered with `fetch(url, { next: { revalidate: 60 } })`. Client Components only for Recharts wrappers, the form, and interactive filter state.
- **Font**: `next/font/google` (Plus Jakarta Sans + IBM Plex Mono), `display: 'swap'`, subsetting `['latin']`. No fallback chain beyond `system-ui` and `monospace` as last resort.
- **Image**: `next/image`; no thumbnails exist in the current data → skip the image slot entirely rather than render a generic placeholder illustration.
- **A11y**: all interactive elements have `aria-label`; focus ring `ring-2 ring-brand-red ring-offset-2 ring-offset-paper-100`; contrast ≥ AA on paper-100 (verify `brand.red` on `paper-100` for large text — it passes at 48px+); every chart has `<title>` + `<desc>`.
- **SEO**: per-page Indonesian `<title>` (`Beranda · indonesia-right-now`, `Dashboard · indonesia-right-now`, etc.), unique description, `opengraph-image.tsx` using Plus Jakarta Sans + paper bg + red rule.
- **Error boundary**: `app/error.tsx` + `app/not-found.tsx` styled consistently.

---

## 9. Deliverables

1. **Complete Next.js repo** (`"name": "indonesia-right-now"`) — `pnpm dev` runs directly.
2. **`README.md`** — title `indonesia-right-now`, run instructions, `BACKEND_URL` env var, folder structure, 7 insights listed, plus the 3-step design rationale from the preamble.
3. **`.env.example`** — only `BACKEND_URL`.
4. No Docker required — backend runs separately at port 8000.

---

## 10. Anti-Patterns (Recap — fail any of these and the build is invalid)

| ❌ | ✅ |
|---|---|
| Inter / Roboto / Arial / system sans as primary | Plus Jakarta Sans (only) |
| Blue-purple gradients | Warm paper + red accent + ochre |
| Centered hero + 2 buttons | Asymmetric 7/5 split, left-aligned CTA row |
| 3 rounded feature cards | Numbered editorial ledger |
| Card-in-card with heavy shadows | Hairlines + flat layers |
| Gray-on-colored text | Ink-on-paper, AA contrast |
| Floating UI mockups | Real rendered components or omit |
| Decorative blobs | One hairline motif ("The Thread") |
| Purple used in chrome | Purple is data-viz only |
| Emoji icons | Lucide, stroke 1.5 |
| Made-up stats, logos, testimonials | Only fields from `/news` & `/fetch`, or omit |
| "JAGA", "JAGA Newsroom", "Indonesia Right Now" in copy | Only exact `indonesia-right-now` |
| One 800-line component | Modular per §7 |

---

**Effort estimate:** ~5–7 senior dev days (or ~12–16 AI-agent iterations with review). Prioritize: fonts + tailwind tokens + TheThread → types → proxy handlers → transformers → dashboard → landing → analytics → three.js → polish.

**Execute.** If new ambiguity arises, hold the principle: *data first, type second, ornament never*. If a design decision isn't backed by real data or a rule above, delete it.

---

**Ready to hand off.** Two key deltas vs your last prompt: (1) typography locked to **Plus Jakarta Sans** (primary) + **IBM Plex Mono** (secondary, my recommendation — linear monospace with editorial character, unlike the developer-coded JetBrains Mono). (2) A full **Anti-Generic Design** section (§1) that explicitly bans the AI-default moves you listed, introduces the warm-paper palette, and locks in **"The Thread"** as the one memorable element.