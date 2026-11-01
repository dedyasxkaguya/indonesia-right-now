# Conversation-Locked Specs
# (Only exists in chat history — MUST be requested from user if missing)

## A. Phase 4 Inline Spec (F6–F14) — Authoritative

---BEGIN---

# Phase 4 — Authoritative Inline Spec (supersedes missing features-roadmap.md)

Your stop was correct. The referenced `features-roadmap.md` was never present in the workspace — that was a defect in my setup, not in your execution. You followed the anti-hallucination rule exactly as specified.

**This message is now the authoritative F6–F14 spec for Phase 4.** The missing file is superseded. Do not search for it again. Do not attempt to infer its contents. This inline spec is complete — if any detail below is still genuinely ambiguous, list numbered questions and stop. Otherwise proceed directly.

## Pre-flight check (run before writing any code)

1. Confirm existing state:
```bash
ls lib/transformers/ | head -20          # expect 7 baseline files
ls components/dashboard/ components/analytics/ 2>/dev/null
grep -r "explain" lib/ components/ 2>/dev/null | head -5   # expect 0 matches, F7 not yet built
grep -r "useKeyboardShortcuts\|useSearchParams" hooks/ components/ 2>/dev/null | head -5
```
Report what you find. Do NOT proceed if any baseline file is missing — that means Phase 2-3 regression and needs fixing first.

If all checks pass, proceed to §4.0.

§4.0 — Phase 4 Common Rules (apply to all F6–F14)
4.0.1 New transformers to create (Phase 4 only)
All in lib/transformers/, exported from lib/transformers/index.ts:

File	Function	Used by
trust-score.ts	computeTrustScore(publisherDomain, items, sources): TrustScore	F8
topic-clusters.ts	computeTopicClusters(items, threshold = 0.5): TopicClusterResult	F10
impact-score.ts	computeImpactScore(items, clusters): { id: string; score: number; components: { freshness: number; breadth: number; diversity: number; depth: number } }[]	F10
coverage-matrix.ts	computeCoverageMatrix(items): CoverageMatrix	F14
editors-picks.ts	computeEditorsPicks(items, n = 5): EditorsPick[]	F13
Phase 4 does NOT add the 14 derived metrics from Phase 6. Those come later. If you're tempted to build cross-source-echo, heuristic-velocity, source-freshness, etc. — do not. They are Phase 6 scope.

4.0.2 Explain registry contract
Create lib/explain/registry.ts. Every metric above + every Phase 4 KPI must have an ExplainConfig:

```ts
export type ExplainConfig = {
  id: string;                                    // 'trust-score', 'impact-score', etc.
  title: string;                                 // Bahasa Indonesia
  oneLiner: string;                              // Bahasa Indonesia, 1 sentence
  formula: string;                               // Human-readable, e.g. '0.4 * freshness + 0.3 * completeness + 0.3 * reliability'
  compute: (data: NewsData) => {
    value: string;
    steps: { label: string; value: string }[];
  };
  sourceFields: string[];                        // e.g. ['items[].published_at', 'items[].fetched_at']
  caveats: string[];                             // Bahasa Indonesia
  transformerFile: string;                       // e.g. 'lib/transformers/trust-score.ts'
};

export const EXPLAIN_REGISTRY: Record<string, ExplainConfig> = { /* ... */ };
```
Must register: trust-score, impact-score, coverage-matrix, editors-pick-reason, plus baseline metric IDs already wired in Phase 2 (source-health, items-kept, median-latency, dedup-rate, publisher-dominance, category-velocity, pipeline-reliability).

4.0.3 Wiring rules
All new transformers must be pure and deterministic (no Math.random, no Date.now() inside — pass now as param if needed). insufficient: true on empty input.
Every KPI, chart, or derived number rendered in UI must have `<ExplainTrigger metricId="...">` next to its label.
Every empty state uses `<StateCard variant="empty">` with Bahasa Indonesia copy.
Every new route respects Phase 1 tokens: paper-100 bg, paper-50 cards, brand-red accents only. No new colors.

---END---


## §E. Feature Specs F9–F16 (Authoritative)

> **Scope note**: F9–F14 = Phase 4. F15–F16 = Phase 5. All formulas, thresholds, and copy strings below are exact — do not paraphrase, do not improvise. Anti-hallucination rules apply: every rendered number traces to a fixture field or a deterministic transformer of fixture fields.

---

### F9 — Search + Filter Chips (Phase 4)

**Purpose**: Fuzzy-search across loaded feed + visual chips for active filters, synced to URL so shareable.

#### Files
- `components/features/search/SearchBar.tsx` — client, sticky at top of dashboard feed panel
- `components/features/search/FilterChips.tsx` — client
- `components/features/search/FilterPopover.tsx` — Radix Popover, uses `.liquid-glass` if Phase 2.6 branch merged; else opaque `bg-paper-50 border border-paper-300 rounded-card`
- `hooks/useFilterState.ts` — new hook, source of truth = URL query string

#### Search behavior
- `fuse.js` config (exact):
  ```ts
  {
    keys: [
      { name: 'title', weight: 2 },
      { name: 'summary', weight: 1 },
      { name: 'publisher', weight: 1.5 },
      { name: 'categories', weight: 1.5 },
    ],
    threshold: 0.4,
    includeMatches: true,
    ignoreLocation: true,
    minMatchCharLength: 3,
  }
  ```
- Debounce 250ms
- Matches highlighted with `<mark className="bg-brand-red/10 text-ink-900 rounded-sm px-0.5">`
- Input: `min-h-11`, `bg-paper-50 border border-paper-300 focus:border-brand-red`, `mono caption` placeholder `Cari berita…`

#### Filter chips
- One chip per active filter. Types:
  - `q` → `bg-paper-200 text-ink-700 mono caption`
  - `cat` → `bg-amber-500/15 text-ink-900` (amber pill)
  - `pub` → `bg-paper-200 text-ink-700`
  - `since` → `bg-brand-red/10 text-brand-red`
- Each chip: label + `×` button (`aria-label="Hapus filter {label}"`)
- `+ Filter` button opens popover with 3 sections:
  - **Kategori** — checkbox list from `unique items[].categories`
  - **Publisher** — checkbox list from `unique items[].publisher`
  - **Rentang waktu** — radio: 24h (default) / 7d / 30h (`since=24h|7d|30h`)
- Count display right-aligned: `Menampilkan X dari Y artikel` in `mono caption ink-400`

#### URL sync
- Format: `?q=karhutla&cat=economy,politics&pub=kompas.com&since=7d`
- `useFilterState` uses `router.replace({ scroll: false })` on every change (not push)
- On mount, parse from URL into state
- Empty params omitted from URL
- If all cleared, URL becomes clean `/dashboard` (no `?`)

#### Wiring into dashboard
- `<SearchBar>` + `<FilterChips>` render above `<NewsFeed>` inside the feed panel
- Feed uses filtered results (client-side filter after server fetch — server fetch always returns unfiltered `24h` set; filtering is client-side)
- Sidebar Phase 2.1 filters become **URL-synced wrappers** around same state — remove duplicate state, single source = URL
- Zero-match → `<StateCard variant="empty">` "Tidak ada hasil untuk filter ini." + `Reset filter` (red text button, clears URL)
- `aria-live="polite"` on count display for screen reader announcement on filter change

#### Regression check
- Phase 2.1 dashboard tests still pass (KPI strip, feed, publisher bars, velocity, pipeline)
- Sidebar and chips stay in sync bidirectionally (change sidebar → chip appears; remove chip → sidebar unchecks)

---

### F10 — Today's Front Page `/hari-ini` (Phase 4)

**Purpose**: Editorial "front page" — ranked by impact, laid out like a newspaper broadsheet.

#### Files
- `app/hari-ini/page.tsx` — RSC
- `components/features/frontpage/Masthead.tsx`
- `components/features/frontpage/BroadsheetGrid.tsx`
- `components/features/frontpage/BroadsheetItem.tsx`
- `lib/transformers/topic-clusters.ts` — **also reused by Phase 6 `story-clusters` metric with `threshold=0.4`; do not duplicate algorithm**
- `lib/transformers/impact-score.ts`

#### `computeTopicClusters(items, threshold = 0.5): TopicClusterResult`

**Algorithm** (exact):
1. Normalize each title: lowercase → strip `[^\p{L}\p{N}\s]` → split `\s+` → filter tokens with `length >= 3` and NOT in stopword set
2. Stopword set (exact — Indonesian + English combined):
   ```
   yang, dan, di, ke, dari, untuk, pada, dengan, dalam, ini, itu, akan, jadi, ada, oleh, atau, juga, tidak, bisa, dapat, sudah, belum, masih, saja, lebih, sangat, banyak,
   the, of, to, a, an, in, on, at, for, as, and, or, is, was, with, from, be, are, by, this, that
   ```
3. Tokenize to `Set<string>` per item
4. Jaccard similarity: `|A ∩ B| / |A ∪ B|`; if `|A ∪ B| === 0` → 0
5. Union-Find: union items where `jaccard >= threshold`
6. Group by root, produce clusters

**Output**:
```ts
type TopicClusterResult = {
  clusters: { ids: string[]; representativeTitle: string; size: number }[];
  insufficient: boolean;  // true if items.length === 0
};
```

Clusters sorted by `size` desc, then `representativeTitle` asc (deterministic tiebreak). Representative = first item in `ids` order (which is input order).

#### `computeImpactScore(items, clusters): ImpactScoreResult[]`

**4 components** (each clamped `[0, 1]`):

| Component | Formula |
|---|---|
| `freshness` | `1 - min(hoursSincePublished / 24, 1)` where `hoursSince = (now - published_at) / 3_600_000` |
| `breadth` | `min(distinctPublishersInItemCluster / 5, 1)` — singleton items = `1/5 = 0.2` |
| `diversity` | `min(item.categories.length / 3, 1)` |
| `depth` | `min((item.summary?.length ?? 0) / 400, 1)` |

**Final score** = `0.35 * freshness + 0.25 * breadth + 0.20 * diversity + 0.20 * depth`

**Output**:
```ts
type ImpactScoreResult = {
  id: string;
  score: number;
  components: {
    freshness: number;
    breadth: number;
    diversity: number;
    depth: number;
  };
};
```

Sorted desc by score. Tiebreak: `published_at` desc, then `title` asc.

Function accepts `now: number` param (default `Date.now()` at call site — **do NOT call Date.now() inside transformer**).

#### Page layout

**Masthead** (span 12):
- `mono eyebrow uppercase tracking-[0.14em] ink-400`: day name in Indonesian + full date. `formatDateID(new Date(), 'EEEE, d MMMM yyyy')`
- Below: `2px brand-red` horizontal rule spanning 12 cols
- Below: `mono caption ink-500`: `Edisi 24 jam terakhir · {items.length} artikel dari {uniquePublishers} publisher`
- No nav, no logo (this page is deliberately its own thing — the navbar above still exists but Masthead is the visual authority)

**BroadsheetGrid** (12-col grid, exact spans):
- **Row 1**: item #1 `col-span-6` (display 68px, `letter-spacing: -0.035em`), item #2 `col-span-3` (h1 48px), item #3 `col-span-3` (h1 48px)
- **Row 2**: items #4–#9 in `col-span-2` each (h3 20px), hairline vertical rules between columns (`border-l border-paper-300` on columns 2+, `pl-4`)
- **Row 3**: `col-span-8` = "Berita Lainnya" list (items #10–#20, reuse Phase 2 `<NewsRow>`); `col-span-4` = sidebar:
  - **Ringkasan** — 3 figures in `mono-num 44px` (items_kept, sources_ok, median latency in min)
  - **Sumber Aktif top 5** — publisher name + item count, `mono caption`
  - **Link** `Lihat analitik lengkap →` (red text-link) to `/analitik`

**BroadsheetItem**:
- Semantic `<article>` tag
- Item title in `h1`/`display`/`h3` per position (Row 1 = display, Row 2 = h3, Row 3 = NewsRow h3)
- Publisher + relative time below in `caption ink-500`
- Category pill (amber) if item.categories.length > 0
- No box, no border, no shadow — the grid hairlines provide structure
- Whole item is `<a>` to `/publisher/{domain}` OR opens Reader drawer on click (choose Reader — more consistent with Phase 3.5)

**Skip link** at top of page:
```tsx
<a href="#berita-lainnya" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-brand-red focus:text-paper-50 focus:px-4 focus:py-2 focus:rounded-btn">
  Langsung ke Berita Lainnya
</a>
```

**Print mode** (`?mode=print`):
- Hide Navbar, Footer, TheThread via `<PrintGuard>` client component that adds `data-print="true"` to `<html>` when query param present
- CSS in `globals.css`:
  ```css
  html[data-print="true"] nav, html[data-print="true"] footer, html[data-print="true"] aside { display: none !important; }
  html[data-print="true"] body { background: #FFFFFF; font-size: 14pt; }
  @media print {
    @page { margin: 2cm; }
    .no-print { display: none !important; }
  }
  ```
- Grid preserved, no hover states, links styled as plain text

**Empty state**: 0 items → `<StateCard variant="empty">` "Belum ada berita dalam 24 jam terakhir." + `Coba lagi` (red button, calls `router.refresh()`)

**Navbar wiring**:
- Add "Hari Ini" between "Beranda" and "Dashboard"
- CommandPalette Navigasi section includes "Hari Ini"
- Shortcut `g` `i` navigates here (F6)

**Data integrity note**: if `computeTopicClusters` returns `insufficient: true`, still render front page — use `breadth = 0.2` for all items (singletons). Do NOT show "no clusters" banner; clustering is internal ranking signal, not user-facing.

---

### F11 — Research Notebook `/notebook` (Phase 4)

**Purpose**: Persistent, sortable log of every `/analisis-url` fetch. Client-side Dexie storage.

#### Files
- `app/notebook/page.tsx` — client component (`'use client'`)
- `components/features/notebook/NotebookList.tsx`
- `components/features/notebook/NotebookCard.tsx`
- `components/features/notebook/NotebookDetailDrawer.tsx` — `vaul`, `width="lg"`
- `components/features/notebook/NotebookQuota.tsx`
- Extend `lib/storage/index.ts`:
  - `notebook.list(): Promise<NotebookEntry[]>`
  - `notebook.save(entry: NotebookEntry): Promise<void>`
  - `notebook.delete(id: string): Promise<void>`
  - `notebook.exportJSONL(): Promise<Blob>`
  - `notebook.clear(): Promise<void>`

#### Auto-save toggle (in `/analisis-url`)
- Below result section, `<label>` with checkbox: `Simpan otomatis ke Notebook` (default **checked**)
- Toggle state persisted: `localStorage['irn:notebookAutoSave:v1']` = `'true' | 'false'`
- On successful `/api/fetch` when toggle on:
  ```ts
  await storage.notebook.save({
    id: crypto.randomUUID(),
    url: fetchData.data.url,
    finalUrl: fetchData.data.final_url,
    title: fetchData.data.title,
    analyzedAt: Date.now(),
    result: fetchData.data,
  });
  toast.success('Disimpan ke Notebook');
  ```
- BroadcastChannel `irn:notebook` posts `{ type: 'save', id }` → any open `/notebook` tab invalidates list

#### `/notebook` layout

**Header**:
- `h1` "Notebook" (48px)
- `mono caption ink-500`: `{entries.length} entri tersimpan · {size} MB`
- Sort dropdown (Radix `<DropdownMenu>`, `.liquid-glass` if 2.6 merged, else `bg-paper-50 border-paper-300`):
  - **Terbaru dianalisis** (default) — `analyzedAt` desc
  - **Judul A–Z** — `title` asc
  - **Jumlah item terbanyak** — `result.news_items.length` desc

**Search input**:
- `fuse.js` across `title`, `url`, `result.final_url`
- threshold 0.4, debounce 200ms

**List** (each card):
- Container: `border-t border-paper-300 pt-4 pb-6` (hairline top, no box)
- **Title** (h3 20px): `entry.title || new URL(entry.url).hostname`
- **URL** (mono caption, truncated 60ch + `…`, external link icon):
  ```tsx
  <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-ink-400 hover:text-brand-red">
    {truncate(entry.url, 60)}
  </a>
  ```
- **Pills row**: item count (amber), guard status (green if `pass`, red if `blocked`/`error`), chunks ratio (`3/5` mono)
- **Analyzed at**: `formatRelativeID(entry.analyzedAt)` (e.g., "2 jam lalu")
- **Actions** (`gap-2`, right-aligned):
  - `Buka` (primary ghost) → opens `NotebookDetailDrawer`
  - `Analisis ulang` (quiet ghost) → refetch `/api/fetch` with same URL, diff against old
  - `Hapus` (text-danger) → confirmation dialog before `storage.notebook.delete(id)`

**Analisis ulang diff logic**:
```ts
const oldItemIds = new Set(entry.result.news_items.map(i => i.id));
const newItemIds = new Set(newResult.data.news_items.map(i => i.id));
const added = [...newItemIds].filter(id => !oldItemIds.has(id)).length;
const removed = [...oldItemIds].filter(id => !newItemIds.has(id)).length;
// Show badge: `+{added} baru, -{removed} hilang` in mono caption
```

On re-analyze success → replace entry with same `id`, `analyzedAt` = now, show diff badge + `toast.info('Analisis diperbarui')`

**NotebookDetailDrawer** (`vaul`, width `lg`):
- Header: `Dianalisis {formatRelativeID(analyzedAt)} · ` + `<a href={finalUrl} target="_blank">Buka asli ↗</a>`
- Body: **same as `/analisis-url` result view** — reuse `<PipelineReport>` and `<AnalysisResult>` components
- Footer:
  - `Analisis ulang (fetch baru)` — same refetch logic
  - `Ekspor JSON` — download `{ id, url, analyzedAt, result }` as file `notebook-entry-{id}.json`
  - `Ekspor semua (JSONL)` — download all entries, one JSON per line
  - `Hapus entri` — same delete flow

**NotebookQuota** (bottom of list):
- Uses `navigator.storage.estimate()`:
  ```tsx
  const { usage = 0, quota = 0 } = await navigator.storage.estimate();
  const usedMB = (usage / 1_048_576).toFixed(1);
  const quotaMB = (quota / 1_048_576).toFixed(0);
  ```
- Display: `{entries.length} entri · {usedMB} MB dari ~{quotaMB} MB`
- Warning banner (amber) if `entries.length > 40 || usage > 40 * 1_048_576`:
  - `Pertimbangkan hapus entri lama untuk performa optimal.`
  - Dismissible (localStorage `irn:notebookQuotaWarned:v1`)

**Cross-tab sync**:
```ts
const channel = new BroadcastChannel('irn:notebook');
channel.onmessage = () => refresh();
// on save/delete: channel.postMessage({ type: 'update' });
```

**Empty state**:
- `<StateCard variant="empty">` "Belum ada analisis tersimpan." + description "Coba analisis URL dan aktifkan simpan otomatis." + red button `Analisis URL →` → `/analisis-url`

**Wiring**:
- Navbar: add "Notebook" after "Tersimpan"
- CommandPalette Navigasi section: add "Notebook"
- Shortcut `g` `n` (F6)

---

### F12 — Comparison Mode `/bandingkan` (Phase 4)

**Purpose**: Side-by-side comparison of 2 publishers across 7 metrics.

#### Files
- `app/bandingkan/page.tsx` — client component (needs `useSearchParams` + SWR)
- `components/features/compare/CompareHeader.tsx`
- `components/features/compare/CompareTable.tsx`
- `components/features/compare/ComparePicker.tsx`

#### Route contract
- Query: `?a=<domain>&b=<domain>` (both required)
- Resolution: find publisher in `items.filter(i => i.publisher_domain === domain)`. If either not found → picker empty state.

#### Layout

**Desktop** (`md:` and up):
- 3-col grid: `grid-cols-12`
  - A panel: `col-span-4`
  - Metric labels: `col-span-4` (centered)
  - B panel: `col-span-4`
- Row per metric, hairline `border-t border-paper-300` between rows

**Mobile** (`< md`):
- Stack per metric: label on top, A above B, gap-2

#### Metrics (7 rows, exact order)

| # | Label (Bahasa Indonesia) | Computation |
|---|---|---|
| 1 | `Total artikel (24 jam)` | `items.filter(i => i.publisher_domain === X).length`. Below each value: `▲` or `▼` + `%` diff vs other side. Diff color **always `ink-500`** (never green/red — no value judgment) |
| 2 | `Median latensi` | `computeLatency(pubItems).median` minutes, format `Xm` or `Xj Ym` |
| 3 | `P95 latensi` | `computeLatency(pubItems).p95` minutes |
| 4 | `Status sumber` | Source status pill from `sources[]`. If 1 source: `Sehat` (green) or `Gagal` (red) + error code mono. If multiple: `X dari Y sehat` |
| 5 | `Kategori teratas` | Top 3 categories by count as pills (amber), no diff |
| 6 | `Kata kunci teratas` | Top 3 from `computeKeywordGraph(pubItems, { topN: 3 })`, mono, no diff |
| 7 | `3 judul terbaru` | 3 titles by `published_at` desc, click → opens Reader (Phase 3.5), no diff |

**Do NOT include**: error rate %, sentiment, engagement — fixtures don't support these reliably.

#### CompareHeader
- `h1` each side (32px) = publisher name from `items[0].publisher`
- `mono caption` below each = domain + external link icon
- Center: `Bandingkan` (h2 20px, `ink-500`), NOT "VS" (avoid gamified feel)
- Top-right: `Bagikan` button (Share icon + text), copies `window.location.href`, `toast.success('URL disalin')`

#### ComparePicker (empty state)
If params missing or publisher not found:
- `<StateCard variant="empty">` "Pilih 2 publisher untuk dibandingkan."
- Two `<select>` dropdowns (native, styled with `bg-paper-50 border-paper-300`):
  - Source: `unique items[].publisher_domain` with `publisher` name as label
  - Validate: a ≠ b
- `Bandingkan` button (primary red), disabled until both selected
- On click: `router.push(`/bandingkan?a=${a}&b=${b}`)`

#### Wiring
- `/analitik` `<SourceTable>`: add checkbox column. Select exactly 2 → floating action bar appears at `fixed bottom-6 left-1/2 -translate-x-1/2 z-30` with `bg-paper-50 border border-paper-300 rounded-pill px-4 py-2 shadow-lg`:
  - Text: `2 publisher dipilih`
  - Primary button: `Bandingkan →` → navigates
  - `×` dismiss
- `/publisher/[domain]` header: `Bandingkan dengan...` dropdown (native select of other publishers) → navigates
- CommandPalette: no entry (needs 2 params, awkward from palette)
- Shortcut `g` `b` navigates to `/bandingkan` (picker state)

---

### F13 — Editor's Picks (Phase 4)

**Purpose**: Deterministic "editor's picks" strip at top of dashboard feed — surfaces high-importance, high-quality items.

#### Files
- `lib/transformers/editors-picks.ts`
- `components/features/editors-picks/EditorsPicksStrip.tsx`

#### `computeEditorsPicks(items, n = 5): EditorsPick[]`

**Formula** (exact — 4 components multiplied, not averaged):

```ts
function computeEditorsPicks(items: NewsItem[], n = 5): EditorsPick[] {
  if (items.length === 0) return [];

  // Pre-compute publisher and category aggregates
  const publisherItemCount = new Map<string, number>();
  const publisherCategories = new Map<string, Set<string>>();
  const categoryPublisherSet = new Map<string, Set<string>>();
  const totalCategories = new Set<string>();

  for (const item of items) {
    publisherItemCount.set(item.publisher, (publisherItemCount.get(item.publisher) ?? 0) + 1);
    const pCats = publisherCategories.get(item.publisher) ?? new Set<string>();
    for (const cat of item.categories) {
      pCats.add(cat);
      totalCategories.add(cat);
      const catPubs = categoryPublisherSet.get(cat) ?? new Set<string>();
      catPubs.add(item.publisher);
      categoryPublisherSet.set(cat, catPubs);
    }
    publisherCategories.set(item.publisher, pCats);
  }

  const totalPublishers = publisherItemCount.size;
  const totalCategoryCount = totalCategories.size;

  const scored = items.map(item => {
    // Component 1: category importance — how many publishers cover this item's top category
    const topCat = item.categories[0] ?? '';
    const catPubs = categoryPublisherSet.get(topCat);
    const categoryImportance = catPubs && totalPublishers > 0
      ? catPubs.size / totalPublishers
      : 0;

    // Component 2: publisher breadth — how many distinct categories this publisher covers
    const pubCats = publisherCategories.get(item.publisher);
    const publisherBreadth = pubCats && totalCategoryCount > 0
      ? pubCats.size / totalCategoryCount
      : 0;

    // Component 3: recency
    const hoursSince = (Date.now() - Date.parse(item.published_at)) / 3_600_000;
    const recency = Number.isFinite(hoursSince)
      ? Math.max(0, 1 - Math.min(hoursSince / 24, 1))
      : 0;

    // Component 4: summary depth
    const summaryLen = item.summary?.length ?? 0;
    const summaryFactor = Math.min(summaryLen / 200, 1);

    const score = categoryImportance * publisherBreadth * recency * summaryFactor;

    return {
      item,
      score,
      components: { categoryImportance, publisherBreadth, recency, summaryFactor },
    };
  });

  return scored
    .filter(s => s.score > 0 && s.item.summary !== null)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const ta = Date.parse(a.item.published_at);
      const tb = Date.parse(b.item.published_at);
      if (tb !== ta) return tb - ta;
      return a.item.title.localeCompare(b.item.title);
    })
    .slice(0, n)
    .map(s => ({
      itemId: s.item.id,
      title: s.item.title,
      publisher: s.item.publisher,
      summary: s.item.summary,
      publishedAt: s.item.published_at,
      score: s.score,
      components: s.components,
    }));
}
```

**Requires `summary !== null`** — items with null summary are filtered out entirely. If all items have null summary → return `[]`.

**Deterministic**: no `Math.random`, tiebreak by `published_at` desc then `title` asc.

#### UI (dashboard integration)

**Position**: top of feed section in `/dashboard`, above `<SearchBar>` + `<FilterChips>` + `<NewsFeed>`

**Layout**:
- Label row:
  - Left: `<div className="border-l-2 border-brand-red pl-3">` containing `mono eyebrow uppercase tracking-[0.14em] text-brand-red` "PILIHAN EDITOR"
  - Right: `<ExplainTrigger metricId="editors-pick-reason" />`
- Below label: horizontal list of picks:
  - Desktop: `grid grid-cols-5 gap-4`
  - Mobile: `flex overflow-x-auto gap-4 snap-x snap-mandatory pb-2`
- Each pick card:
  - Container: `border-t border-paper-300 pt-3 snap-start min-w-[240px]` (hairline top, no box)
  - Title (h3 16px, `line-clamp-2`): clickable → opens Explain panel scoped to this pick
  - Publisher (caption mono) + relative time (`caption ink-500`)
  - No summary shown (saves vertical space)
- Click → opens `<ExplainPanel metricId="editors-pick-reason" itemId={pick.itemId}>` showing:
  - Formula (aggregate)
  - **Current pick's 4 components as values** (not just aggregate) — `categoryImportance: 0.72`, `publisherBreadth: 0.55`, `recency: 0.91`, `summaryFactor: 0.65`
  - Final score

**Empty behavior**:
- If `computeEditorsPicks` returns `[]` (no items OR all summaries null) → **hide the strip entirely**
- Do NOT render `<StateCard variant="empty">` — clean absence is better than "no picks today"

**ExplainConfig registration** (`editors-pick-reason`):
```ts
{
  id: 'editors-pick-reason',
  title: 'Pilihan Editor',
  oneLiner: 'Menyeimbangkan kepentingan kategori, keluasan publisher, kesegaran, dan kedalaman ringkasan.',
  formula: 'categoryImportance × publisherBreadth × recency × summaryFactor',
  sourceFields: ['items[].categories', 'items[].publisher', 'items[].published_at', 'items[].summary'],
  caveats: [
    'Hanya artikel dengan ringkasan non-kosong yang dipertimbangkan.',
    'Skor bersifat multiplikatif — salah satu komponen nol berarti tidak masuk pilihan.',
  ],
  transformerFile: 'lib/transformers/editors-picks.ts',
}
```

---

### F14 — Coverage Heatmap (Phase 4)

**Purpose**: 10 publishers × 8 categories matrix, cell color = item count, clickable for drill-down.

#### Files
- `lib/transformers/coverage-matrix.ts`
- `components/features/heatmap/CoverageMatrix.tsx`
- `components/features/heatmap/CoverageLegend.tsx`
- Dashboard integration: expandable panel below Row 2 (dominance section), collapsed by default

#### `computeCoverageMatrix(items): CoverageMatrix`

```ts
function computeCoverageMatrix(items: NewsItem[]): CoverageMatrix {
  if (items.length === 0) {
    return { rows: [], cols: [], cells: [], max: 0, insufficient: true };
  }

  // Top 10 publishers by item count
  const pubCounts = new Map<string, number>();
  for (const item of items) {
    pubCounts.set(item.publisher, (pubCounts.get(item.publisher) ?? 0) + 1);
  }
  const rows = [...pubCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([pub]) => pub);

  // Top 8 categories by item count
  const catCounts = new Map<string, number>();
  for (const item of items) {
    for (const cat of item.categories) {
      catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
    }
  }
  const cols = [...catCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 8)
    .map(([cat]) => cat);

  // Cells: items from row publisher in column category
  const cells: number[][] = rows.map(pub =>
    cols.map(cat =>
      items.filter(i => i.publisher === pub && i.categories.includes(cat)).length
    )
  );

  const max = Math.max(...cells.flat(), 1);
  return { rows, cols, cells, max, insufficient: false };
}
```

#### Rendering

**Grid**:
- CSS: `gridTemplateColumns: 'minmax(140px, 1.4fr) repeat(8, minmax(0, 1fr))'`, gap 1px, `bg-paper-300` on grid container (creates hairline separators)
- **Header row**:
  - Top-left cell: `bg-paper-100`
  - Column headers: `bg-paper-100 mono caption`, category name truncated with `title` attr for full name, `aria-label` on each
- **Row labels**:
  - `bg-paper-100 mono caption`, publisher name truncated to 20ch with `…`, full name in `title`
  - Clickable → `/publisher/{domain}` (lookup domain from `items` where `publisher === row`)
- **Cell**:
  - `<div role="gridcell" aria-label="{publisher} · {category} · {count} artikel">`
  - Background: `color-mix(in oklch, ${paper50}, ${brandRed} ${(count/max)*100}%)` — **native CSS, do NOT install culori**
  - Text: `ink-900` if `t < 0.5`, `ink-100` if `t >= 0.5` (`t = count/max`)
  - Count in `mono caption`, centered
  - Empty cell (`count === 0`): `bg-paper-100`, no text, no click
  - Hover (when `count > 0`): Radix Tooltip with `{publisher} · {category}` + `{count} artikel`
  - Click (when `count > 0`): `router.push(`/dashboard?pub=${publisher}&cat=${category}`)`
- **Row/column click**:
  - Row label → `/publisher/{domain}`
  - Column header → `/dashboard?cat={category}`

**Legend**:
- Horizontal gradient bar: `linear-gradient(to right, ${paper50}, ${brandRed})`, height 8px, `rounded-pill`
- Below: `0` and `{max}` in `mono caption ink-500`, right-aligned
- Caption: `Data 24 jam terakhir · {rows.length} publisher · {cols.length} kategori` in `mono caption ink-400`

**Export CSV**:
- Button: `Ekspor CSV` (quiet variant), top-right of panel header
- Uses `papaparse`:
  ```ts
  const csv = Papa.unparse([
    ['Publisher', ...cols],
    ...rows.map((pub, i) => [pub, ...cells[i]]),
  ]);
  const bom = '\uFEFF';  // UTF-8 BOM
  download(`${bom}${csv}`, `coverage_${formatDateID(new Date(), 'yyyy-MM-dd')}.csv`);
  ```

**Panel wrapper** (in dashboard):
- `<SurfaceCard>` containing:
  - Header row: `<SectionHeader>04 — Cakupan Kategori</SectionHeader>` + `<ExplainTrigger metricId="coverage-matrix" />` + toggle button
  - Toggle button: `Tampilkan Heatmap` / `Sembunyikan` (ghost variant)
  - Below: matrix + legend when expanded
- Toggle state: `localStorage['irn:heatmapOpen:v1']` = `'true' | 'false'` (default collapsed)
- If `insufficient: true` → `<StateCard variant="empty">` "Data tidak cukup untuk heatmap."

**ExplainConfig registration** (`coverage-matrix`):
```ts
{
  id: 'coverage-matrix',
  title: 'Cakupan Kategori × Publisher',
  oneLiner: 'Jumlah artikel per publisher dalam setiap kategori.',
  formula: 'count(items[publisher=P][category=C])',
  sourceFields: ['items[].publisher', 'items[].categories'],
  caveats: [
    'Satu artikel dapat masuk ke beberapa kategori.',
    'Warna sel relatif terhadap nilai maksimum dalam matriks.',
    'Tidak menampilkan kategori di luar top 8 atau publisher di luar top 10.',
  ],
  transformerFile: 'lib/transformers/coverage-matrix.ts',
}
```

---

### F15 — Export CSV / PNG (Phase 5)

**Purpose**: Let users export dashboard data as CSV (raw) or PNG (visual snapshot).

#### Files
- `components/features/export/ExportMenu.tsx` — dropdown button in dashboard header
- `lib/utils/export.ts` — helpers `exportCSV`, `exportPNG`

---

### F16 — Watchlist (Phase 5)

**Purpose**: Persist queries (keyword/publisher/category) and notify when new matching items appear.

#### Files
- `components/features/watchlist/WatchlistBell.tsx` — Navbar bell icon
- `components/features/watchlist/WatchlistDropdown.tsx` — bell dropdown
- `components/features/watchlist/WatchlistManager.tsx` — modal to CRUD entries
- `hooks/useWatchlist.ts` — polling + diff logic
- Storage key: `irn:watchlist:v1` (`localStorage`, JSON array of `WatchEntry`)

---

## §F. Feature Specs F6–F8 (Authoritative)

> **Scope note**: F6, F7, F8 are Phase 4. F9–F14 are also Phase 4 (see §E). F6 must be implemented first — F7 depends on it (via `?` cheatsheet and `Esc` close chain). F7 must be implemented second — every later KPI must mount `<ExplainTrigger>`. F8 can be deferred to v1.1 if context pressure emerges, but F6 and F7 are non-negotiable.

---

### F6 — Keyboard Shortcuts (Phase 4)

**Purpose**: Keyboard-first navigation + power-user actions. Global hotkeys, scope-aware, no external library.

#### Files
- `hooks/useKeyboardShortcuts.ts` — the only hook needed
- `components/layout/ShortcutsCheatsheet.tsx` — Radix Dialog with kbd pills
- `components/layout/KeyboardShortcutProvider.tsx` — client, wraps `<main>` in `app/layout.tsx`

**No external library.** Do not install `react-hotkeys-hook` or `mousetrap`. Implement from scratch using `keydown` listener + refs.

#### Key map (exhaustive — do not add more)

| Key | Action | Scope |
|---|---|---|
| `⌘K` / `Ctrl+K` | Toggle CommandPalette | Global (already Phase 3) |
| `?` (Shift+/) | Open cheatsheet | Global |
| `Esc` | Close topmost (drawer → palette → cheatsheet → dialog) | Global |
| `g` then `h` | Navigate `/` | Not in input |
| `g` then `d` | Navigate `/dashboard` | Not in input |
| `g` then `a` | Navigate `/analitik` | Not in input |
| `g` then `u` | Navigate `/analisis-url` | Not in input |
| `g` then `t` | Navigate `/tersimpan` | Not in input |
| `g` then `i` | Navigate `/hari-ini` (only if F10 built) | Not in input |
| `g` then `n` | Navigate `/notebook` (only if F11 built) | Not in input |
| `g` then `b` | Navigate `/bandingkan` (only if F12 built) | Not in input |
| `j` | Focus next feed item | Only `/dashboard` or `/hari-ini` |
| `k` | Focus prev feed item | Only `/dashboard` or `/hari-ini` |
| `Enter` | Open focused item's Reader | When item focused |
| `b` | Bookmark focused item | When item focused |
| `/` | Focus search input | Only `/dashboard` |

#### `g`-sequence handling (exact)

- When `g` pressed (not in input), set internal state `pendingG = true` + start 800ms timer
- Show subtle mono chip bottom-right: `g …` (bg-paper-200, mono caption, `rounded-pill px-2 py-1`, `fixed bottom-6 right-6 z-40`)
- On next keypress within 800ms:
  - If matches one of `h d a u t i n b` → navigate + clear state
  - If no match → clear state, ignore
- On 800ms timeout → clear state, chip disappears with fade (200ms)
- If another `g` pressed while pending → restart timer (do not double-navigate)

#### Input exclusion (mandatory)

Skip all shortcuts when `document.activeElement` matches:
```ts
function isEditableElement(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}
```
**Exception**: `Esc` and `⌘K` always fire, even in inputs (users expect these to work everywhere).

#### Focus management for `j`/`k`

- Feed items rendered as `<article data-feed-item tabIndex={-1} role="article">`
- `j`/`k` maintain an internal `focusedIndex` ref, initially `-1`
- On keypress: `focusedIndex = clamp(focusedIndex ± 1, 0, itemCount - 1)`
- Focus the element: `document.querySelectorAll('[data-feed-item]')[focusedIndex].focus()`
- Apply visual focus ring via `.focus-visible` class — Tailwind already styles `focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-paper-100`
- Scroll into view: `element.scrollIntoView({ block: 'nearest', behavior: 'smooth' })`
- When `focusedIndex` changes due to feed re-filter, reset to `-1`

#### `Enter` and `b` on focused item

- Attach to feed container: on `keydown`, if focused element has `data-feed-item` and key is `Enter` → read `data-feed-url` and open Reader drawer
- If key is `b` → read `data-feed-id`, call bookmark toggle (Phase 3.3), `toast.success('Tersimpan')` or `'Dihapus dari tersimpan'`

#### ShortcutsCheatsheet

**Trigger**: `?` from anywhere (not in input)
**Component**: Radix `<Dialog>`, `width: min(720px, 92vw)`
**Content** (English — this is technical reference, not user-facing copy):
- Title: "Keyboard Shortcuts" (`h2`)
- 2-column grid (`grid-cols-2 gap-6`)
- Sections: **Navigation** / **Feed Actions** / **Search**
- Each row: `<kbd>` on left, description on right
- `<kbd>` styling: `inline-flex items-center justify-center min-w-[28px] h-7 px-2 bg-paper-200 border border-paper-300 rounded-btn font-mono text-caption ink-900`
- For sequences (`g d`): render as two kbd pills with `→` between them
- Footer: `Tekan ? kapan saja untuk membuka` in `mono caption ink-400`
- Close on `Esc` or backdrop click

#### `prefers-reduced-motion`

- No scale/slide animations on cheatsheet open — fade only (150ms)
- `g …` chip uses opacity fade, no translateY

#### Report-only hint in Footer

- In `<Footer>`, add subtle mono text under nav: `Tekan ? untuk pintasan`
- Only visible if `localStorage['irn:shortcutsSeen:v1'] !== 'true'`
- After first `?` open → set flag → hint disappears
- Style: `mono caption ink-400`, link-style hover underline

---

### F7 — Explainability Panel (Phase 4)

**Purpose**: Every derived number in the UI is traceable. Clicking an info icon opens a drawer showing formula, current value, compute steps, source fields, and caveats.

#### Files
- `lib/explain/registry.ts` — source of truth for all `ExplainConfig`
- `components/features/explain/ExplainTrigger.tsx` — 16px Lucide `Info` icon button
- `components/features/explain/ExplainPanel.tsx` — `vaul` drawer, `width="md"`
- `components/features/explain/ExplainProvider.tsx` — client context, mounts in `app/layout.tsx` around `<main>`

#### `ExplainConfig` type (exact)

```ts
// lib/explain/registry.ts
import type { NewsData } from '@/lib/types/api';

export type ExplainStep = { label: string; value: string };

export type ExplainComputeResult = {
  value: string;               // formatted, e.g. '60.0%', '8 menit', '434 artikel'
  steps: ExplainStep[];        // ordered steps
};

export type ExplainConfig = {
  id: string;                          // 'source-health', 'trust-score', etc.
  title: string;                       // Bahasa Indonesia
  oneLiner: string;                    // Bahasa Indonesia, 1 sentence
  formula: string;                     // Human-readable, e.g. '0.4 * freshness + 0.3 * completeness + 0.3 * reliability'
  compute: (data: NewsData) => ExplainComputeResult;
  sourceFields: string[];              // e.g. ['items[].published_at', 'items[].fetched_at']
  caveats: string[];                   // Bahasa Indonesia
  transformerFile: string;             // e.g. 'lib/transformers/trust-score.ts'
};

export const EXPLAIN_REGISTRY: Record<string, ExplainConfig> = {
  'source-health': { /* Phase 2, must exist by end of Phase 4 */ },
  'items-kept': { /* Phase 2 */ },
  'median-latency': { /* Phase 2 */ },
  'dedup-rate': { /* Phase 2 */ },
  'publisher-dominance': { /* Phase 2 */ },
  'category-velocity': { /* Phase 2 */ },
  'pipeline-reliability': { /* Phase 2 */ },
  'trust-score': { /* F8 */ },
  'impact-score': { /* F10 */ },
  'coverage-matrix': { /* F14 */ },
  'editors-pick-reason': { /* F13 */ },
};
```

**No `compute` may call `Date.now()`** — if timing is needed, capture at page render and pass via a closure or context. Determinism is required for regression testing.

#### ExplainTrigger

```tsx
// components/features/explain/ExplainTrigger.tsx
'use client';
import { Info } from 'lucide-react';
import { useExplain } from './ExplainProvider';

export function ExplainTrigger({ metricId, itemId }: { metricId: string; itemId?: string }) {
  const { open } = useExplain();
  return (
    <button
      type="button"
      onClick={() => open(metricId, itemId)}
      aria-label="Penjelasan metrik"
      className="inline-flex items-center justify-center h-5 w-5 rounded-full text-ink-400 hover:text-brand-red transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-brand-red focus-visible:ring-offset-2 focus-visible:ring-offset-paper-100"
    >
      <Info size={16} strokeWidth={1.5} />
    </button>
  );
}
```

**Placement rules**:
- Next to every KPI label (right side, 4px gap)
- Next to every chart title (right of title)
- Next to every sub-score in F8
- In F13 strip label (after `PILIHAN EDITOR`)
- In F14 panel header (after `SectionHeader`)

#### ExplainPanel (drawer)

`vaul` drawer, `width="md"`, `.liquid-glass` if Phase 2.6 merged (else opaque `bg-paper-50`).

**Sections in exact order**:
1. Header
2. Formula block
3. Current value
4. Compute steps
5. Source fields
6. Caveats
7. Footer

#### ExplainProvider (context)
Provides deep-link behavior: `/dashboard?explain=source-health` on load → drawer auto-opens.

---

### F8 — Publisher Profile (Phase 4, deferrable to v1.1)

**Purpose**: Dedicated page per publisher showing trust score, coverage, latency, and article list.

#### Files
- `app/publisher/[domain]/page.tsx` — RSC
- `components/features/publisher/TrustScorePanel.tsx`
- `components/features/publisher/CoverageDonut.tsx`
- `components/features/publisher/RelatedPublishers.tsx`
- `components/features/publisher/PublisherArticleList.tsx` — client component (pagination state)
- `lib/transformers/trust-score.ts`

#### `computeTrustScore(publisherDomain, items, sources): TrustScore`

**Exact implementation**:

```ts
// lib/transformers/trust-score.ts
import type { NewsItem, NewsSource } from '@/lib/types/api';

export type TrustScore = {
  score: number;                   // 0-100
  subScores: {
    freshness: number;             // 0-100
    completeness: number;          // 0-100
    reliability: number;           // 0-100
  };
  insufficient: boolean;
};

function quantile(arr: number[], q: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(sorted.length * q) - 1)];
}

export function computeTrustScore(
  publisherDomain: string,
  items: NewsItem[],
  sources: NewsSource[],
): TrustScore {
  const publisherItems = items.filter(i => i.publisher_domain === publisherDomain);
  if (publisherItems.length === 0) {
    return {
      score: 0,
      subScores: { freshness: 0, completeness: 0, reliability: 0 },
      insufficient: true,
    };
  }

  // Component 1: freshness
  const latencies = publisherItems
    .map(i => (Date.parse(i.fetched_at) - Date.parse(i.published_at)) / 60_000)
    .filter(m => Number.isFinite(m) && m >= 0);
  const medianLatency = latencies.length > 0 ? quantile(latencies, 0.5) : 999;
  const freshness = Math.max(0, 1 - Math.min(medianLatency / 120, 1));

  // Component 2: completeness
  const complete = publisherItems.filter(i =>
    i.summary !== null && Number.isFinite(Date.parse(i.published_at))
  ).length;
  const completeness = complete / publisherItems.length;

  // Component 3: reliability
  const pubSources = sources.filter(s =>
    s.url.includes(publisherDomain) || s.publisher === publisherDomain
  );
  const reliability = pubSources.length === 0
    ? 0.5
    : pubSources.filter(s => s.status === 'ok').length / pubSources.length;

  // Weighted combination (exact)
  const score = Math.round(
    (0.4 * freshness + 0.3 * completeness + 0.3 * reliability) * 100
  );

  return {
    score,
    subScores: {
      freshness: Math.round(freshness * 100),
      completeness: Math.round(completeness * 100),
      reliability: Math.round(reliability * 100),
    },
    insufficient: false,
  };
}
```

---

## §B. Phase 2.6 (Branch Only)
- Liquid Glass + Dynamic Island are deferred to separate branch.

## C. 5 Locked Decisions
1. **Historical trends**: client-side Dexie only. No `/history` endpoint. Empty state honest.
2. **Secret pages**: TWO pages under hidden zone:
   - `/__halaman-gelap` = abstract/symbolic (aggregate counts only, no named individuals)
   - `/__halaman-gelap/truth` = real cases from current `/news` fixture (verbatim headlines, neutral framing)
3. **A11y on secret pages**: default aesthetic + `?calm=1` + `prefers-reduced-motion` honored
4. **Discovery hint**: README colophon only (poetic line + HTML comment). No hint in source.
5. **14 derived metrics locked in §6.1** — no additions, no omissions. Wait for Phase 6.

## D. Deferred to v1.1
- F8 (Publisher Profile) [Note: already implemented in Phase 4]
- F10 (Front Page) [Note: already implemented in Phase 4]
- F11 (Notebook) [Note: already implemented in Phase 4]
- F12 (Compare) [Note: already implemented in Phase 4]
- F15 (Export CSV/PNG)
- F16 (Watchlist)
- F18 (A11y Panel)
- Phase 2.6 (Liquid Glass + Dynamic Island)

## §H. New Features F22-F24 — Navigation, Article Reader, RSS Expansion

> **Scope**: This section extends the app beyond Phase 6. Three new features, one locked-decision override. Execute in order F22 → F23 → F24.

---

### §H.0 — Locked Decision Override: Groq via Next.js Route Handler

**This is the ONLY override of the original "no Groq on frontend" rule.**

**What changed**: Frontend will own a Groq call, but ONLY inside `app/api/summarize/route.ts` (server-side route handler). The `GROQ_API_KEY` is read from `.env.local` via `process.env.GROQ_API_KEY` — **never** via `NEXT_PUBLIC_*`, never passed to any client component.

**Hard rules**:
- `GROQ_API_KEY` appears only in `app/api/summarize/route.ts` and nowhere else. Grep verification: `Select-String -Path app,components,lib -Recurse -Pattern "GROQ_API_KEY"` must match exactly 1 file.
- No `groq` SDK, no `openai` SDK on frontend. Use `fetch` directly to `https://api.groq.com/openai/v1/chat/completions` from the route handler.
- Rate limit: 5 requests/min per IP, 3 concurrent max, reuse F17 pattern.
- Cache: in-memory LRU (5-min TTL, 100 entries) keyed by `hash(url + content.slice(0, 2000))`. Server-side only.
- Timeout: 20s abort.
- If `GROQ_API_KEY` missing: route returns 503 `{ ok: false, error: { code: 'AI_UNAVAILABLE', message: 'Layanan ringkasan belum dikonfigurasi.' } }`. Client must handle gracefully (show `Ringkasan tidak tersedia` + "Buka sumber asli" link).

**What is NOT allowed**: Calling Groq from any Client Component. Calling Groq from `/api/fetch`. Exposing the key in any response. Reusing F17's deleted files (`lib/ai/news-cleansing.ts`, etc.) — build fresh for summarize.

---

### §H.1 — F22: Sidebar Navigation with Page Families

**Goal**: Replace top navigation links with modern left sidebar. Navbar becomes minimal (brand + search + a11y + user menu).

#### Files
- `components/layout/Sidebar.tsx` — main sidebar
- `components/layout/SidebarProvider.tsx` — collapse state, active route tracking
- `components/layout/MobileSidebar.tsx` — drawer for `< 1024px`
- `components/layout/SidebarGroup.tsx` — collapsible group wrapper
- `components/layout/SidebarItem.tsx` — individual nav item
- Modify `components/layout/Navbar.tsx` — strip nav links, keep brand + search + CTA + a11y trigger
- Modify `app/layout.tsx` — wrap with `<SidebarProvider>` and render `<Sidebar>` + `<Navbar>` in flex layout

#### Page families (exhaustive — no additions)
BERITA
01 Beranda / (existing)
02 Hari Ini /hari-ini (existing)
03 Artikel /artikel (NEW — see §H.1.1)

ANALITIK
04 Dashboard /dashboard (existing)
05 Analitik /analitik (existing)
06 Publisher /publisher (NEW — index, see §H.1.2)
07 Bandingkan /bandingkan (existing)

TOOLS
08 Analisis URL /analisis-url (existing)
09 Notebook /notebook (existing)

PERSONAL
10 Tersimpan /tersimpan (existing)

[Footer of sidebar — no group label]
Aksesibilitas button → opens A11yPanel (existing F18, not a route)

text

**Hidden**: `/__halaman-gelap*` NOT in sidebar. No change to secret page discovery rules (§G.5).

#### Sidebar layout

- **Position**: `fixed left-0 top-0 bottom-0 z-30`
- **Width**: `260px` expanded, `72px` collapsed (icon-only)
- **Background**: `bg-paper-50 border-r border-paper-300`
- **Typography**: group labels in `mono eyebrow ink-400`, items in `body ink-700 font-medium`
- **Numerals**: mono `caption ink-300` prefix (`01`, `02`, …) — matches TheThread motif
- **Active item**: `bg-paper-100 border-l-2 border-brand-red text-ink-900 font-semibold` (red left rule, not full red bg)
- **Hover**: `bg-paper-100 text-ink-900`, 150ms
- **Collapse toggle**: chevron button at top-right of sidebar. Persist in `localStorage['irn:sidebarCollapsed:v1']`.
- **Groups collapsible**: click group label to toggle. Persist in `localStorage['irn:sidebarGroups:v1']` = `{ berita: true, analitik: true, tools: true, personal: true }`.

#### Mobile (`< 1024px`)

- Sidebar hidden by default, slides in from left as overlay drawer (vaul, `width: min(300px, 85vw)`)
- Trigger: hamburger button in Navbar left side
- Backdrop: `bg-ink-900/40 backdrop-blur-sm`
- Auto-close on nav item click
- Same page structure, no collapse toggle

#### Navbar (minimal — modified)

Current navbar links removed. Navbar now contains:
- Left: hamburger icon (mobile only) + brand wordmark `indonesia-right-now` (with `right` in red)
- Center: search input trigger (⌘K opens CommandPalette, already exists)
- Right: a11y trigger (existing) + primary CTA "Analisis URL" (existing)

Navbar height stays 76px. On desktop, brand aligns with sidebar width offset (`ml-[260px]` or `ml-[72px]` when collapsed).

#### Main content

- Wrapped in `<main>` with `ml-[260px]` on desktop (`ml-[72px]` when collapsed), `ml-0` on mobile
- Max-width container: `max-w-[1400px] mx-auto px-6 lg:px-8`
- TheThread (`components/layout/TheThread.tsx`) — reposition to `left-[280px]` when sidebar expanded, `left-[92px]` when collapsed. On mobile, hide (existing rule `< 1024px`).

#### §H.1.1 — New route `/artikel`

- **File**: `app/artikel/page.tsx` (RSC)
- **Purpose**: Browse ALL articles from current feed. Feed rendered as dense list. Click any article → opens Reader drawer with `?drawer=reader&url=<item.url>` (deep-link, no page nav).
- **Content**: Reuse `<NewsFeed>` + `<SearchBar>` + `<FilterChips>` from dashboard. Header: `h1` "Artikel", mono caption `{count} artikel dari {publishers} publisher`.
- **Note**: This is different from `/hari-ini` (ranked by impact score) and `/dashboard` (operational feed with KPIs). `/artikel` = pure browse.

#### §H.1.2 — New route `/publisher` (index)

- **File**: `app/publisher/page.tsx` (RSC)
- **Purpose**: List all publishers with stats. Click any → navigates to existing `/publisher/[domain]`.
- **Content**: Grid of publisher cards (hairline top, no box). Each: publisher name (h3), domain (mono), item count, trust score (from F8 `computeTrustScore`), 1 top category pill. Sorted by item count desc.
- **Empty**: `<StateCard variant="empty">` "Belum ada publisher dalam 24 jam terakhir."

---

### §H.2 — F23: Article Reader with 5W1H Summary

**Goal**: Extend the existing F5 Reader drawer to include a 5W1H natural-prose summary, plus image/metadata enrichment. This is the primary "read article" experience.

#### Modified files
- `components/features/reader/ReaderDrawer.tsx` — add 5W1H section, image slot, category tag
- `lib/storage/dexie-schema.ts` — add `summaryCache` table (keyPath `url`, index `cachedAt`, 24h TTL)
- `lib/storage/index.ts` — add `storage.dexie.getSummaryCache(url)` / `setSummaryCache(url, data)`
- `hooks/useArticleSummary.ts` — new hook: fetch summary with caching
- `hooks/useArticleFetch.ts` — new hook: wraps `/api/fetch` + `readerCache`

#### New files
- `app/api/summarize/route.ts` — the Next.js route handler (see §H.0)
- `lib/ai/summarize.ts` — server-only module: Groq call + validation
- `lib/ai/summarize-cache.ts` — in-memory LRU
- `lib/ai/summarize-prompt.ts` — system prompt (see §H.2.2)
- `lib/ai/summarize-rate-limit.ts` — rate limiter (reuse F17 pattern)
- `lib/ai/summarize-types.ts` — shared types
- `components/features/reader/ReaderSummary.tsx` — summary section component
- `components/features/reader/ReaderProgress.tsx` — progress indicator

#### Flow
User clicks article (from NewsRow, CommandPalette, /artikel, /hari-ini)
↓
Open Reader drawer with ?drawer=reader&url=<url>
↓
Immediate render: title, publisher, published_at, category (from current /news item — already in SWR cache)
Show skeleton for: image, 5W1H summary, full article content
↓
STEP 1: Fetch article content
Check Dexie readerCache[url] (24h)
Hit → render markdown content
Miss → call /api/fetch {url, mode: 'markdown'} (10-25s) → save to cache → render
Show progress: "Mengambil artikel..."
↓
STEP 2: Fetch 5W1H summary
Check Dexie summaryCache[url] (24h)
Hit → render summary
Miss → call /api/summarize {url, content, title} (3-5s) → save to cache → render
Show progress: "Merangkum..."
↓
DONE — full drawer rendered

text

**Parallelization note**: Steps 1 and 2 are sequential (summary needs fetched content). But Step 1 (fetch) can prefetch on hover (see §H.2.4). Step 2 fires immediately after Step 1 completes.

#### §H.2.1 — Reader drawer layout (updated)
┌─────────────────────────────────────────────────────┐
│ [×] [Buka asli ↗]│
├─────────────────────────────────────────────────────┤
│ [image — optional, if extras.image_url exists] │
│ │
│ [CATEGORY PILL] [PUBLISHER] [RELATIVE TIME] │
│ │
│ Headline │
│ 44px, Plus Jakarta Sans 700, tracking-tight │
│ │
│ ───────────────────────────────────── │
│ │
│ RINGKASAN (mono eyebrow ink-400) │
│ Natural paragraph, 100-150 kata, body 16px leading-7│
│ │
│ ───────────────────────────────────── │
│ │
│ ARTIKEL LENGKAP (mono eyebrow ink-400) │
│ Markdown content (react-markdown + rehype-sanitize) │
│ prose max-w-[65ch] mx-auto │
│ │
│ ───────────────────────────────────── │
│ [Bookmark] [Copy] [Save to Notebook] │
└─────────────────────────────────────────────────────┘

text

**If image missing** (`extras.image_url` is null/undefined): omit image block entirely, do NOT show placeholder illustration.

**If summary fails** (backend offline, AI unavailable): show mono caption `Ringkasan tidak tersedia` + `Buka sumber asli ↗` text link. Do NOT block the article content — summary is additive.

**If article fetch fails**: show `<StateCard variant="error">` with exact Indonesian message from `/api/fetch` error mapping (§A error table) + `Coba Ulang` button + `Buka sumber asli ↗`. Summary section is omitted (no content to summarize).

#### §H.2.2 — `/api/summarize` contract

**Request**:
```typescript
POST /api/summarize
Content-Type: application/json
Body: {
  url: string;         // article URL (for cache key + validation)
  title: string;       // article title (context for AI)
  content: string;     // fetched article content, 100-8000 chars (truncated if longer)
}
Response (success):

typescript
{ ok: true, data: { summary: string, categories: string[] }, error: null }
Response (error):

typescript
{ ok: false, data: null, error: { code: string, message: string } }
Error codes:

VALIDATION_ERROR (400) — missing/invalid body fields

AI_UNAVAILABLE (503) — GROQ_API_KEY missing or Groq unreachable

AI_TIMEOUT (504) — Groq call exceeded 20s

AI_INVALID_OUTPUT (502) — Groq returned malformed JSON

RATE_LIMITED (429) — 5/min exceeded, includes Retry-After header

AI_BUSY (503) — 3 concurrent exceeded, includes Retry-After: 5

Validation (Zod):

url: valid http(s), ≤ 2048 chars

title: 1-500 chars, non-empty after trim

content: 100-8000 chars, non-empty after trim. If > 8000, truncate to 8000 (first part; content begins with article body).

Rate limiting: reuse F17 pattern (5/min per IP, 3 concurrent).

Caching: in-memory LRU, key sha256(url + content.slice(0, 2000)), TTL 5 min, max 100. Not Dexie — server-side only, prevents duplicate Groq calls within a burst.

No persistence: this endpoint does not save to disk. Client caches in Dexie summaryCache.

§H.2.3 — Groq system prompt (exact, locked)
text
Anda adalah peringkas berita profesional yang menulis dalam Bahasa Indonesia.

TUGAS: Buat ringkasan 5W1H dari konten berita yang diberikan.

ATURAN KETAT:
1. Ringkasan adalah narasi paragraf alami 100-150 kata, mengalir sebagai satu paragraf.
2. Paragraf HARUS secara implisit mencakup:
   - Apa yang terjadi (peristiwa utama)
   - Siapa yang terlibat (nama, jabatan, atau pihak relevan)
   - Di mana (lokasi atau wilayah)
   - Kapan (waktu kejadian, jika tersedia)
   - Mengapa (latar belakang, penyebab, atau motif, jika diketahui)
   - Bagaimana prosesnya (rangkaian kejadian, jika diketahui)
3. DILARANG menggunakan label eksplisit seperti "Siapa:", "Apa:", "Kapan:", "Mengapa:", "Bagaimana:". Semua aspek menyatu dalam prosa.
4. NADA NETRAL. Tidak berspekulasi, tidak beropini, tidak menambahkan interpretasi.
5. HANYA gunakan fakta yang tertulis eksplisit di sumber. Jika salah satu aspek 5W1H tidak tersedia di sumber, HILANGKAN dari paragraf — JANGAN mengarang, JANGAN menyimpulkan, JANGAN menambahkan konteks dari pengetahuan umum.
6. DILARANG menyebut nama, tanggal, lokasi, atau fakta yang tidak ada di sumber.
7. Kategori: pilih 1-3 dari daftar berikut SAJA:
   politics, economy, health, education, environment, government, technology, culture, regional, community, sports, other

OUTPUT: JSON valid saja, tanpa markdown, tanpa penjelasan tambahan.
Format:
{"summary": "paragraf 5W1H 100-150 kata", "categories": ["kategori1", "kategori2"]}
Groq call (server-side, app/api/summarize/route.ts → lib/ai/summarize.ts):

typescript
const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    model: process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b',
    temperature: 0,
    max_completion_tokens: 1024,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: JSON.stringify({ title, url, content: content.slice(0, 8000) }) },
    ],
  }),
  signal: controller.signal,
  cache: 'no-store',
});
Validation after Groq:

Parse JSON. If fail → AI_INVALID_OUTPUT.

summary: string, 80-250 words (word count via .split(/\s+/).length). If < 80 or > 250 → AI_INVALID_OUTPUT.

categories: array of 1-3 strings, all from fixed taxonomy. If any invalid → drop invalid, keep valid. If all invalid → ["other"].

Return { summary, categories }.

§H.2.4 — Prefetch on hover
To reduce perceived latency for /fetch (10-25s per call):

On <NewsRow> hover, after 500ms delay, fire fetch('/api/fetch', { method: 'POST', body: JSON.stringify({ url, mode: 'markdown' }) }) in the background.

Store result in Dexie readerCache on success (reuse Phase 3 F5 logic).

On click, drawer checks cache first — if prefetch completed, render instantly.

Do NOT prefetch on mobile (data usage + battery). Detect via window.matchMedia('(pointer: fine)').

Do NOT prefetch more than 2 items concurrently (queue or skip if busy).

Cancel prefetch if hover ends before 500ms delay completes.

Existing F5 logic already caches on click. Prefetch just fills the cache earlier.

§H.3 — F24: RSS Sources Expansion
Goal: Enable richer default news sources via inline /news POST body. Currently /api/news uses GET without sources — backend falls back to its preset. Now we control the source list from frontend config.

Files
config/rss-sources.ts — new, contains all RSS sources with metadata

lib/api/news-sources.ts — new, helper getDefaultActiveSources()

Modify app/api/news/route.ts — support POST with sources body

Modify lib/api/server.ts — add postNews({ sources, since, ... }) helper

Modify app/page.tsx, app/hari-ini/page.tsx — use sources in fetch

config/rss-sources.ts structure
typescript
export type RssSource = {
  name: string;
  url: string;
  category: string;
  priority: 'high' | 'medium' | 'low';
  type: string;
  enabled: boolean;
  notes?: string;
};

// Full list from user input (all 40+ sources, verbatim)
export const RSS_SOURCES: RssSource[] = [ /* ... full list ... */ ];

// Default active = priority high + enabled
export const DEFAULT_ACTIVE_SOURCES: RssSource[] = RSS_SOURCES.filter(
  s => s.priority === 'high' && s.enabled
);
Note: Include ALL sources from user input in RSS_SOURCES for future flexibility. Only DEFAULT_ACTIVE_SOURCES (high+enabled) is passed to backend by default. This gives ~11 sources (8 Reddit high + 3 Kemenkes high + 1 Peraturan = 12 total, count during implementation).

app/api/news/route.ts modification
Support both GET and POST:

GET (existing behavior): proxy to BACKEND_URL/news?${qs} — unchanged.

POST (new): accept body { sources?: RssSource[], since?, max_items?, categories?, publishers? }. If sources present, proxy to BACKEND_URL/news with POST body { sources, since, max_items, dry_run: false }. Else proxy as GET.

Both return same envelope shape (newsResponseSchema).

RSC pages use POST with sources
typescript
// lib/api/server.ts
export async function postNews(options: {
  sources?: RssSource[];
  since?: string;
  max_items?: number;
}): Promise<NewsData | null> {
  const response = await fetch(`${BACKEND_URL}/news`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      sources: options.sources ?? DEFAULT_ACTIVE_SOURCES,
      since: options.since ?? '24h',
      max_items: options.max_items ?? 100,
      dry_run: false,
    }),
    next: { revalidate: 60 },
  });
  // ... parse and validate ...
}
Pages that use postNews with default sources: /, /hari-ini, /artikel, /dashboard, /analitik, /publisher/[domain]. Or better: keep getNews for pages that just need any data, use postNews for landing/hari-ini/artikel where source diversity matters.

Landing headline ranking (reuse, no new logic)
Landing hero headline = top 1 item by computeImpactScore (from Phase 4 F10). Sub-headlines = items 2-7. Implemented in Phase 5 F19 already? — verify during implementation. If F19 ticker uses raw latest, upgrade to impact-ranked. Same for /hari-ini which already uses impact-score.

Verification
powershell
Test-Path config/rss-sources.ts                             # True
(Select-String -Path config/rss-sources.ts -Pattern "priority: 'high'").Count    # >= 10
Invoke-WebRequest http://localhost:3000/api/news -Method POST -Body '{"since":"24h","max_items":5}' -ContentType 'application/json' | Select-Object -ExpandProperty StatusCode    # 200
§H.4 — F25: Page Transition Smoothing
Goal: Fix slow/unsmooth page navigation. No new features — just optimize existing.

Changes
All internal links use Next.js <Link prefetch={true}> — verify with Select-String -Path app,components -Recurse -Pattern "<a href=\"/" → 0 results (except external links in a new tab).

Add app/loading.tsx per route family — warm-paper skeleton matching final layout. Each RSC page gets app/{route}/loading.tsx if not present. Skeletons use existing bg-paper-200 animate-pulse pattern.

Lazy-load heavy components — Three.js scenes (already dynamic in Phase 5), Recharts wrappers, html-to-image. Verify dynamic(() => import(...), { ssr: false }) for all heavy imports.

Subtle page transition animation — add components/layout/PageTransition.tsx wrapping <main>. Use framer-motion AnimatePresence with key={pathname}, opacity fade 150ms + 4px translateY. Respects prefers-reduced-motion (disable translation).

Prefetch on hover for nav items — sidebar items already use <Link prefetch> (auto). No extra work.

First-paint optimization — verify RSC pages don't accidentally import client-only code at module level.

Verification
powershell
(Select-String -Path app,components -Recurse -Pattern "<a href=\"/" -Include *.tsx).Count   # 0 (except external links with target="_blank")
Get-ChildItem app -Recurse -Filter loading.tsx | Measure-Object | Select-Object -ExpandProperty Count   # >= 5
Manual: navigate between / → /dashboard → /analitik → back. Transitions should feel instant (data already prefetched) or show skeleton (2px paper-200 pulse).

§H.5 — Sequencing for F22-F25
Order:

Stage H0: Verify Phase 6 audit complete (build/lint/typecheck green). If Phase 6 not done, STOP — do not proceed.

Stage H1: F24 (RSS sources — smallest, unblocks richer landing headline for H3)

Stage H2: F22 (Sidebar + page families + /artikel + /publisher)

Stage H3: F23 (Article reader 5W1H + /api/summarize)

Stage H4: F25 (Page transitions + loading states)

Stage H5: Full verification (all 25 features, all routes, Lighthouse)

Each stage: build + typecheck + lint must pass before next. STOP after each stage for user review.

§H.6 — Updated feature count
After F22-F25: F1-F25 complete (21 original + F22, F23, F24, F25). F17 remains deleted. Feature count in final report: 24 active features.

§H.7 — What NOT to do
Do NOT add a 26th feature — this is the last expansion

Do NOT put GROQ_API_KEY in any file other than app/api/summarize/route.ts

Do NOT call Groq from any Client Component

Do NOT modify secret pages (§G.4) — F22-F25 do not touch them

Do NOT add features to sidebar beyond the 10 items in §H.1

Do NOT prefetch /fetch on mobile

Do NOT show placeholder images — if extras.image_url missing, omit block

Do NOT summarize without explicit source — if /api/fetch returns insufficient content, skip summary

Do NOT add a new package — locked list stands
