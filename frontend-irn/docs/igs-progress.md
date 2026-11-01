# IGS Progress Snapshot

Updated 2026-10-31 12:42 +07:00. The initial snapshot below is retained as historical context; Sessions #2–#3 record the analytics, chart, and bundle work and their verification.

## 1. Current state

IGS foundation, data generation, maps, thematic visualizations, and Three.js scenes are present. Session #2 added the eight analytics views and four chart types; Session #3 reduced `/gov/analytics` First Load JS from 610 kB to 108 kB without removing charts. Typecheck, lint, tests, production build, and production route checks passed.

The status labels below describe evidence available now, not a guarantee of production behavior:

- **DONE**: supporting source/artifact exists and was directly inspected or counted.
- **PARTIAL**: an artifact exists but integration, completeness, or manual behavior remains unverified.
- **NOT_STARTED**: no supporting implementation/artifact was found.
- **BROKEN**: direct evidence shows the stated requirement is not met.

## 2. Worktree snapshot

Raw `git status --short` output captured before these progress files were created:

```text
 M README.md
 D app/__halaman-gelap/page.tsx
 D app/__halaman-gelap/truth/page.tsx
 M app/api/news/route.ts
 M app/globals.css
 M app/layout.tsx
 M components/dashboard/DashboardView.tsx
 M components/features/article/ArtikelView.tsx
 M components/features/frontpage/BroadsheetItem.tsx
 M components/features/secret/AltZIPortal.tsx
 M components/features/secret/CRTOverlay.tsx
 M components/features/secret/GlitchText.tsx
 M components/features/secret/GrungeShell.tsx
 M components/features/secret/KonamiLayer.tsx
 M components/features/secret/SecretSafeView.tsx
 M components/features/secret/SecretTruthView.tsx
 M components/igs/EChartPanel.tsx
 M components/igs/GovAnalyticsView.tsx
 M components/igs/GovOverview.tsx
 M components/igs/MetricChart.tsx
 M components/layout/EasterEggProvider.tsx
 M components/layout/Footer.tsx
 M components/layout/MobileSidebar.tsx
 M components/layout/Navbar.tsx
 M components/layout/Sidebar.tsx
 M components/layout/SidebarItem.tsx
 M components/layout/TheThread.tsx
 M context/SESSION-STATE.md
 M docs/igs-qa.md
 M lib/api/server.ts
 M lib/data/index.json
 M tailwind.config.ts
?? components/layout/ModeToggle.tsx
?? components/layout/RootShell.tsx
?? content/common.json
?? content/irn/
?? lib/mode.ts
?? lib/site-config.ts
?? public/
```

Those pre-existing changes include IRN paths. They were not changed or staged. The list is the original snapshot; `dirty_files` in the JSON is updated to the worktree at the end of Session #2. Branch: `fix`.

Recent commits from `git log --oneline -10`:

```text
50ef42e feat(igs): three.js temporal scenes
fd62a0b feat(igs): maps + full chart inventory
e0a9a38 feat(config): add high-priority RSS sources
f37b63d fix(three): keep reduced-motion scene static
21b8dd0 fix(theme): define RGB tokens for opacity modifiers
5e5d4c6 fix(theme): preserve opacity utilities for palette colors
823e252 feat(landing): use full feed for latest and trending
d756e58 feat(landing): split latest and trending sections
c467c8f feat(three): add scroll and pointer reactivity
31d0594 feat(theme): prevent dark mode flash on load
```

## 3. Foundation and routes

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Path-based IRN ↔ IGS mode switch | DONE | `lib/mode.ts`, `components/layout/ModeToggle.tsx`, `components/layout/Sidebar.tsx`, `components/layout/MobileSidebar.tsx` | Mode is selected from pathname in source. |
| Dynamic favicon and fallback | PARTIAL | `components/layout/RootShell.tsx`, `public/favicon-irn.svg`, `public/favicon-igs.svg` | Source has an `onerror` fallback to `/favicon.ico`; browser switching/fallback was not tested this session. |
| Mode-aware sidebar | DONE | `components/layout/Sidebar.tsx`, `lib/site-config.ts` | A shared sidebar selects sections by mode. |
| RootShell with `mode` prop | PARTIAL | `components/layout/RootShell.tsx` | RootShell exists, but computes mode from pathname; it does not accept a `mode` prop. |
| IRN copy extracted to `content/*.json` | PARTIAL | `content/irn/site.json`, `content/irn/insight.json` | Files exist; complete extraction of IRN copy was not audited. |
| IGS copy extracted to `content/igs/*.json` | DONE | `content/igs/site.json`, `content/igs/provinsi.json`, `content/igs/insight.json`, `content/igs/bidang.json` | IGS views import the content files. |
| `/gov` | DONE | `app/gov/page.tsx` | Production curl returned HTTP 200 in Session #2. |
| `/gov/dashboard` | DONE | `app/gov/dashboard/page.tsx` | Production curl returned HTTP 200 in Session #2. |
| `/gov/analytics` | DONE | `app/gov/analytics/page.tsx` | Production curl returned HTTP 200 in Session #2. |
| `/gov/pemerintahan` | DONE | `app/gov/pemerintahan/page.tsx` | Production curl returned HTTP 200 in Session #2. |
| `/gov/ekonomi` | DONE | `app/gov/ekonomi/page.tsx` | Production curl returned HTTP 200 in Session #2. |
| `/gov/pendidikan` | DONE | `app/gov/pendidikan/page.tsx` | Production curl returned HTTP 200 in Session #2. |
| `/gov/sosial-publik` | DONE | `app/gov/sosial-publik/page.tsx` | Production curl returned HTTP 200 in Session #2. |
| `/gov/daerah` | DONE | `app/gov/daerah/page.tsx` | Production curl returned HTTP 200 in Session #2. |
| `/gov/perbandingan` | DONE | `app/gov/perbandingan/page.tsx` | Production curl returned HTTP 200 in Session #2. |
| `/gov/pencarian` | DONE | `app/gov/pencarian/page.tsx` | Production curl returned HTTP 200 in Session #2. |
| `/gov/provinsi/[kode]` and static params | DONE | `app/gov/provinsi/[kode]/page.tsx` | `generateStaticParams()` builds; `/gov/provinsi/11` returned HTTP 200. |
| `/gov/kabkota/[kode]` and static params | DONE | `app/gov/kabkota/[kode]/page.tsx` | `generateStaticParams()` builds; `/gov/kabkota/11.71` returned HTTP 200. |

## 4. Data status

The data build script and generated outputs exist. `lib/data/schemas.ts` defines Zod schemas, and `lib/data/index.ts` parses the generated data at import. `lib/data/DICTIONARY.md` documents source units, null behavior, and known coverage limits; no independent CSV spot-check was run.

| Data item | Status | Evidence | Notes |
|---|---|---|---|
| CSV → JSON build script | DONE | `scripts/build-data.mjs`, `lib/data/index.json`, `lib/data/derived/` | Script is wired as `prebuild`; not run separately this session. |
| Zod schemas | DONE | `lib/data/schemas.ts`, `lib/data/index.ts`; `pnpm test` passed | Dataset rows use generic scalar records, not field-by-field strict schemas. |
| Honest data dictionary | PARTIAL | `lib/data/DICTIONARY.md` | Coverage/null/source caveats are documented; the requested manual ten-row CSV cross-check remains pending. |
| Timeline series file | PARTIAL | `lib/data/timeseries.json`, `scripts/build-data.mjs`, `components/igs/YearSlider.tsx` | Verified 14 metric series for 2020–2025. The slider reads/writes `?tahun=` through the provider; no direct `timeseries.json` consumer was found. Categorical quadrant is excluded from numeric timeseries. |

### Derived metrics

The current `context/masterprompt-v1.md` does **not** contain the referenced IGS §6.1 metric list. The 15 IDs below are present in `docs/igs-metrics.md`, `lib/data/derived/metrics.json`, and the generated per-metric outputs; they are not validated against the cited masterprompt section.

| Metric ID | Status | Evidence |
|---|---|---|
| `fiscal_autonomy` | DONE | `docs/igs-metrics.md`; `lib/data/derived/fiscal-autonomy.json` |
| `fiscal_absorption` | DONE | `docs/igs-metrics.md`; `lib/data/derived/fiscal-absorption.json` |
| `capital_share` | DONE | `docs/igs-metrics.md`; `lib/data/derived/capital-share.json` |
| `social_share` | DONE | `docs/igs-metrics.md`; `lib/data/derived/social-share.json` |
| `service_access_index` | DONE | `docs/igs-metrics.md`; `lib/data/derived/service-access-index.json` |
| `education_quality` | DONE | `docs/igs-metrics.md`; `lib/data/derived/education-quality.json` |
| `welfare_composite` | DONE | `docs/igs-metrics.md`; `lib/data/derived/welfare-composite.json` |
| `economic_resilience` | DONE | `docs/igs-metrics.md`; `lib/data/derived/economic-resilience.json` |
| `governance_digital` | DONE | `docs/igs-metrics.md`; `lib/data/derived/governance-digital.json` |
| `procurement_efficiency` | DONE | `docs/igs-metrics.md`; `lib/data/derived/procurement-efficiency.json` |
| `fiscal_welfare_quadrant` | DONE | `docs/igs-metrics.md`; `lib/data/derived/fiscal-welfare-quadrant.json` |
| `budget_stress` | DONE | `docs/igs-metrics.md`; `lib/data/derived/budget-stress.json` |
| `productivity_per_capita` | DONE | `docs/igs-metrics.md`; `lib/data/derived/productivity-per-capita.json` |
| `dependency_ratio` | DONE | `docs/igs-metrics.md`; `lib/data/derived/dependency-ratio.json` |
| `composite_development_score` | DONE | `docs/igs-metrics.md`; `lib/data/derived/composite-development-score.json` |

### Cross-dataset views

All eight are present in `lib/data/derived/cross-dataset.json`, exported by `lib/data/index.ts`, and their count is asserted by `lib/data/data.test.ts`. A source search found no UI consumer beyond generation, export, and test, so their view/UI integration is **PARTIAL**, not complete.

| View ID | Status | Evidence |
|---|---|---|
| `fiscal-welfare` | DONE | `components/igs/CrossDatasetViews.tsx`; `/gov/analytics` |
| `budget-service` | DONE | `components/igs/CrossDatasetViews.tsx`; `/gov/analytics` |
| `procurement-resilience` | DONE | `components/igs/CrossDatasetViews.tsx`; `/gov/analytics` |
| `governance-poverty` | DONE | `components/igs/CrossDatasetViews.tsx`; `/gov/analytics` |
| `education-unemployment` | DONE | `components/igs/CrossDatasetViews.tsx`; `/gov/analytics` |
| `budget-outcome-gap` | DONE | `components/igs/CrossDatasetViews.tsx`; `/gov/analytics` |
| `regional-trends` | DONE | `components/igs/CrossDatasetViews.tsx`; `/gov/analytics` |
| `quadrant-timeline` | DONE | `components/igs/CrossDatasetViews.tsx`; `/gov/analytics` |

## 5. Maps and visualization inventory

The local `context/masterprompt-v1.md` is an IRN specification: its §6.1 is `<IndonesiaFlowScene />`, §6.2 is `<PublisherNetworkScene />`, and §8 is “Performance & Accessibility.” It does not contain the referenced IGS 15-metric list, eight-view list, or chart inventory. Chart presence below is therefore assessed against the explicit chart-type list in the task and actual IGS source, not attributed to those masterprompt sections.

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| GeoJSON download/simplify pipeline | DONE | `scripts/build-geo.mjs`; `lib/data/geo/manifest.json` | Script pins both source commits and calls `mapshaper -simplify 5% keep-shapes`. |
| Province/kabkota GeoJSON artifacts | DONE | `lib/data/geo/provinces.geojson`, `lib/data/geo/kabkota.geojson` | JSON parse/count command: 34 province and 84 kab/kota features. |
| ECharts `registerMap()` | DONE | `components/igs/GeoMapBoot.tsx` | Client effect loads local province GeoJSON and registers before rendering the map. |
| Choropleth `/gov/sosial-publik` | DONE | `components/igs/GovTopicView.tsx`, `components/igs/GovChoropleth.tsx`, `components/igs/GeoMapBoot.tsx` | IPM map path and table fallback found. |
| Choropleth `/gov/daerah` | DONE | `components/igs/GovTopicView.tsx`, `components/igs/GovChoropleth.tsx`, `components/igs/GeoMapBoot.tsx` | Procurement-efficiency map path and table fallback found. |
| Choropleth `/gov/provinsi/[kode]` | DONE | `components/igs/GovEntityPage.tsx`, `components/igs/GeoMapBoot.tsx` | Selected province is highlighted among peers; table fallback provided. |
| Chart inventory | PARTIAL | `components/igs/MetricChart.tsx`, `components/igs/EChartPanel.tsx`, `components/igs/GovTopicInventory.tsx`, `components/igs/GovCorrelationHeatmap.tsx`, `components/igs/FetchQualityGauges.tsx` | 21 of 25 requested types found; four gaps remain: grouped bar, stacked bar, horizontal bar, sparkline. |

| Chart type | Present | Status | Evidence / notes |
|---|---:|---|---|
| bar | YES | DONE | `components/igs/MetricChart.tsx` |
| grouped bar | NO | NOT_STARTED | No dedicated grouped-bar implementation found. |
| stacked bar | NO | NOT_STARTED | Waterfall internally stacks its steps, but no dedicated stacked-bar chart was found. |
| horizontal bar | NO | NOT_STARTED | No horizontal-bar implementation found. |
| line | YES | DONE | `components/igs/MetricChart.tsx` |
| multi-line | YES | DONE | `components/igs/GovTopicInventory.tsx` ridgeline uses multiple line series. |
| area | YES | DONE | `components/igs/MetricChart.tsx` |
| sparkline | NO | NOT_STARTED | No sparkline implementation found. |
| scatter | YES | DONE | `components/igs/MetricChart.tsx` |
| bubble | YES | DONE | `components/igs/TemporalArchipelagoScene.tsx` province bubbles. |
| treemap | YES | DONE | `components/igs/GovTopicInventory.tsx` |
| sunburst | YES | DONE | `components/igs/GovTopicInventory.tsx`; rendered in browser with 190 table observations. |
| radar | YES | DONE | `components/igs/GovTopicInventory.tsx` |
| heatmap | YES | DONE | `components/igs/GovTopicInventory.tsx`, `components/igs/GovCorrelationHeatmap.tsx` |
| parallel coordinates | YES | DONE | `components/igs/GovTopicInventory.tsx` |
| boxplot | YES | DONE | `components/igs/GovTopicInventory.tsx` |
| violin | YES | DONE | `components/igs/GovTopicInventory.tsx`; density shape and 38 source observations across six island groups. |
| Sankey | YES | DONE | `components/igs/GovTopicInventory.tsx` |
| chord | YES | DONE | `components/igs/GovTopicInventory.tsx`; circular ECharts graph of provinces and top contractors. |
| network | YES | DONE | `components/igs/GovTopicInventory.tsx` ECharts graph. |
| choropleth | YES | DONE | `components/igs/GeoMapBoot.tsx` |
| waterfall | YES | DONE | `components/igs/GovTopicInventory.tsx` |
| gauge | YES | DONE | `components/igs/FetchQualityGauges.tsx`; three gauges and table. No `/fetch` snapshot was present during browser verification, so no sample numbers were displayed. |
| ridge/stream | YES | DONE | `components/igs/GovTopicInventory.tsx` KDE ridgeline. |
| Venn | YES | DONE | `components/igs/GovTopicInventory.tsx` custom SVG; `@visx/venn` is not installed. |

## 6. Three.js and accessibility

| Feature | Status | Evidence | Notes |
|---|---|---|---|
| Temporal archipelago on `/gov` | DONE | `components/igs/GovOverview.tsx`, `components/igs/TemporalArchipelagoScene.tsx` | Dynamically imported with `ssr: false`; source loads local province GeoJSON. |
| Temporal archipelago on `/gov/dashboard` | DONE | `components/igs/GovDashboardView.tsx`, `components/igs/TemporalArchipelagoScene.tsx` | Dynamically imported with `ssr: false`. |
| Trajectory scene on `/gov/analytics` | DONE | `components/igs/GovAnalyticsView.tsx`, `components/igs/TrajectoryFlowScene.tsx` | Dynamically imported with `ssr: false`. |
| Persistent `<YearSlider>` | DONE | `components/igs/GovLayoutProviders.tsx`, `components/igs/YearSlider.tsx`, `components/igs/GovYearProvider.tsx` | Source uses six ticks, `?tahun=`, and `requestAnimationFrame`. |
| Reduced-motion / low-memory fallback | DONE | `components/igs/useSceneRuntime.ts`, `components/igs/TemporalArchipelagoScene.tsx`, `components/igs/TrajectoryFlowScene.tsx` | Source checks reduced motion, `deviceMemory < 4`, and WebGL; browser behavior not checked this session. |
| Chart title, description, accessible label, table fallback | PARTIAL | `components/igs/EChartPanel.tsx`, `components/igs/MetricChart.tsx`, `components/igs/GovTopicInventory.tsx`, `components/igs/CrossDatasetViews.tsx`, `components/igs/FetchQualityGauges.tsx` | Browser confirmed chart headings and table fallbacks for new charts; full screen-reader/order audit remains pending. |
| Reduced-motion manual test | PARTIAL | `components/igs/useSceneRuntime.ts` | Implementation exists; not exercised in this verification session. |
| Mobile drawer / hidden TheThread | PARTIAL | `components/layout/MobileSidebar.tsx`, `components/layout/TheThread.tsx` | Source includes drawer and `hidden lg:block`; no viewport/browser check this session. |

## 7. Verification results

| Command | Result | Exact evidence |
|---|---|---|
| `pnpm typecheck` | PASS | `tsc --noEmit`, exit code 0 after both implementation tasks, run 2026-10-31. |
| `pnpm lint` | PASS | `next lint`; “No ESLint warnings or errors”, exit code 0, run 2026-10-31. |
| `pnpm test` | PASS | 2 test files, 9 tests passed, run 2026-10-31. |
| `pnpm build` | PASS | Optimized Next.js build completed; after bundle optimization `/gov/analytics` route chunk is 6.04 kB and First Load JS is 108 kB. |
| Production route HTTP checks | PASS | `pnpm start` + `curl.exe`: all 12 requested `/gov` routes and `/` returned HTTP 200; server stopped afterward. |
| Lighthouse / manual CSV spot-check / screen-reader UAT | NOT RUN | Pending manual verification. |

## 8. Next actions and blockers

1. Run Lighthouse to measure real-world performance after the `/gov/analytics` bundle reduction.
2. Complete manual accessibility/screen-reader review and ten-row CSV spot-check; verify gauge values with a real `/fetch` snapshot.
3. Resolve the spec mismatch: the checked-in `context/masterprompt-v1.md` is legacy IRN material and does not define the referenced IGS §§6.1, 6.2, or chart inventory.

The four functional variants (grouped bar, stacked bar, horizontal bar, sparkline) are intentionally not separate chart implementations; the decision is documented in `docs/igs-qa.md`. Lighthouse, manual CSV validation, and human accessibility UAT remain pending. The current dirty worktree contains unrelated IRN changes, which remain untouched and uncommitted.

## Session #2 — Cross-dataset views and chart gaps (2026-10-31)

- Added all eight generated cross-dataset views to `/gov/analytics` with chart-appropriate displays, neutral narratives, thematic links, and `<details>` tables.
- Added the requested sunburst, circular province–contractor graph, three AI-quality gauges, and violin density chart. All use ECharts and `EChartPanel` accessibility/table patterns.
- The gauge reads the browser's last valid `/fetch` snapshot. No snapshot was present during browser verification, so the fallback shows unavailable values rather than fabricated sample numbers.
- Verification: `pnpm typecheck`, `pnpm lint`, `pnpm test` (9 passed), `pnpm build` (pass); browser verified the new chart headings/tables; all 12 requested Gov routes and `/` returned HTTP 200 from `pnpm start`, then the server was stopped.
- No commit was created. No IRN path or content-extraction work was changed.

## Session #3 — Analytics bundle optimization (2026-10-31)

- Diagnosis: `/gov/analytics` built at 388 kB route / 610 kB First Load JS, against a 260 kB budget. `echarts-for-react` default entry imports the full `echarts` package; `CrossDatasetViews` and `FetchQualityGauges` were static imports, and `MetricChart` statically brought in Recharts. The geo map's wildcard ECharts import is behind the topic-page dynamic import and not the analytics entry. Three.js was already `next/dynamic` with `ssr: false`; no visx/d3 imports were found.
- Fixes: registered only used ECharts chart/component/renderer modules via `echarts/core` and `echarts-for-react/lib/core`; moved cross-dataset views, gauges, and Recharts scatter to async imports. The trajectory scene and heatmap remain async. This preserves charts while removing full ECharts/Recharts from the initial analytics route chunk.
- Result: `/gov/analytics` route chunk 388 kB → 6.04 kB; First Load JS 610 kB → 108 kB (502 kB / about 82% reduction), below both the 260 kB budget and 300 kB target. Shared First Load JS remains 87.8 kB.
- Verification: `pnpm typecheck`, `pnpm lint`, and `pnpm build` passed; production browser showed all eight cross-dataset cards, gauges, scatter, and 12 details tables; `/gov/analytics`, `/gov/pemerintahan`, `/gov/daerah`, and `/gov/pendidikan` returned HTTP 200. No charts were removed or behavior intentionally changed.
- Chart inventory decision: grouped bar, stacked bar, horizontal bar, and sparkline remain documented functional variants, not separate chart implementations.
- No commit was created.

## Session #4 — Responsive UI and visualization polish (2026-10-31)

### Mobile Responsive

| Requirement | Status | Implementation / verification |
|---|---|---|
| Remove the overlapping thread from the shared layout | **DONE** | Removed the `<TheThread>` mount from `app/layout.tsx`. |
| Replace the mobile sidebar with a touch-friendly drawer | **DONE** | `components/layout/MobileSidebar.tsx` provides the slide-out navigation; shared mobile buttons and selects meet the 44px minimum target. |
| Animate the IRN/IGS mode switch and compact the year selector | **DONE** | `components/layout/ModeToggle.tsx` uses an animated sliding thumb; the navbar uses a compact year dropdown. |
| Improve dark-mode contrast and sidebar icons | **DONE** | IGS colors now use slate/warm CSS-variable tokens, and each Bidang has a distinct icon. |
| Normalize KPI descriptions and remove dashboard title clutter | **DONE** | KPI descriptions are one line; the redundant “Indonesia Gov Stats” dashboard header text was removed. |
| Humanize labels and make tables/charts understandable | **DONE** | `lib/igs-labels.ts` translates field names and relative-score terminology; table headers use human labels, with explanatory text and mobile overflow containers. |
| Make ECharts resize and dense visualizations usable on mobile | **DONE** | `components/igs/EChartPanel.tsx` observes container size and orientation changes; dense charts and the labeled correlation heatmap can scroll horizontally. |
| Improve IPM and budget visualizations | **DONE** | The IPM trend uses a gradient area treatment; budget bars use distinct Bidang colors. |
| Expand the daerah map responsively | **DONE** | The map uses the full content width with a 400px mobile minimum and 600px height from `md`. |
| Polish the `/gov` landing content | **DONE** | The editorial insight, three live previews, monochrome Bidang imagery, and accent colors are retained and responsive. |
| Enable touch and idle behavior in Three.js scenes | **DONE** | `IdleOrbitControls` enables drag rotation and wheel/pinch zoom, then resumes auto-rotation after three seconds idle. Scene canvases use a mobile 40–50dvh height and pause when the page is inactive. |

### Responsive and build verification

- `pnpm typecheck`, `pnpm lint`, `pnpm test` (9/9), and `pnpm build`: **PASS**.
- Production browser checks at 375px, 768px, and 1440px: **PASS** for `/`, `/gov`, `/gov/daerah`, and `/gov/analytics`; representative document widths matched their layout widths with no horizontal page overflow.
- `/gov/analytics` renders 23 chart surfaces at both 375px and 1440px. A mobile overflow in the correlation-axis selectors was found during the first check and fixed by constraining the controls to the available width.
- The daerah map measured 360×513px at 375px and 661×600px at 768px. The landing Three.js canvas rendered at 511×403px on desktop; the mobile drawer opened correctly and sampled mobile buttons were at least 44px.
- No commit was created. Real-device touch testing, Lighthouse, and screen-reader UAT remain pending.
