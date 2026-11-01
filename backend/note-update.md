# note-update.md — for the irn-fe frontend team

This release changes the backend's default news sources, adds non-breaking
request aliases, and retires AI news clustering and job processing. The
standalone feed collector, article cleaner, and general-purpose fetcher remain.

## 1. Sources changed — community-first default

`presets/indonesia_default.yaml` (default preset when no `sources` or
`preset` is passed) is now **Reddit/community-first**. Newly enabled:

- Reddit: r/indonesia, r/jakarta, r/bali, r/surabaya, r/bandung,
  r/yogyakarta, r/medan, r/aceh, r/IndonesiaTravel, r/IndoGamer,
  r/indotech, r/indonesianmusic, r/ASEAN (all `/new/.rss`)
- ANTARA EN: `explore-indonesia.xml`, `press-release.xml` (see preset)
- International: `news.ycombinator.com/rss`, `github.com/trending.atom`
- MOI Malang feeds `category-id/{3,8,9,24,33,12,67,29,26,39,84}` stay
  enabled — `local_organization`, not government.
- Legacy publishers (Antara terkini, CNN Indonesia, Kompas, Tempo, Detik,
  CNBC, Bisnis.com, Katadata, Tirto, Kumparan) are kept but
  `enabled: false`.

## 2. Government feeds disabled — DO NOT re-enable

The frontend **MUST NOT** re-enable any `.go.id` feed. All government
sources are retained in the preset with `enabled: false`:

- `https://kemkes.go.id/id/rss/article/rilis-berita`
- `https://kemkes.go.id/id/rss/article/kegiatan-kemenkes`
- `https://kemkes.go.id/id/rss/article/artikel-kesehatan`
- `https://kemkes.go.id/id/rss/article/tips-kesehatan`
- `https://kemkes.go.id/id/rss/media/infodatin`
- `https://kemkes.go.id/id/rss/media/infografis`
- `https://kemkes.go.id/id/rss/media/peraturan-dan-undang-undang`
- `https://kemkes.go.id/id/rss/media/profil-kesehatan`
- `https://kemkes.go.id/id/rss/media/warta-yankes`
- `https://kemenimipas.go.id/rss?view=feeds`
- `https://yogyakartakota.kemenag.go.id/category/berita/feed/`
- `https://yogyakartakota.kemenag.go.id/category/artikel/feed/`
- `https://yogyakartakota.kemenag.go.id/category/nasional/feed/`
- `https://yogyakartakota.kemenag.go.id/ppid/rss/posts`
- `https://upk.kemkes.go.id/new/feed/rss.php?cat=l`
- `https://upk.kemkes.go.id/new/feed/rss.php?cat=j`
- `https://upk.kemkes.go.id/new/feed/rss.php?cat=ht`
- `https://djpb.kemenkeu.go.id/portal/id/data-publikasi/...` (already
  disabled before this release; stays disabled)

**Policy reason:** journalism/corporate policy forbids government news
URLs here; re-enable only after formal clearance. The backend also emits
a startup warning listing every disabled feed URL so desyncs are visible.

## 3. Canonical item schema

Items returned by `/news` always have exactly this shape; missing fields
are `null`:

```json
{
  "id": "<stable hash>", "title": "<string>", "url": "<string>",
  "publisher": "<string>", "publisher_domain": "<string>",
  "author": null, "published_at": "<ISO-8601>",
  "date_confidence": "exact", "summary": null, "content": null,
  "categories": null, "language": null,
  "source_url": "<feed URL>", "fetched_at": "<ISO-8601>"
}
```

Notes: `author` keeps its `/u/` prefix for Reddit items (do not strip it
client-side); Reddit summaries may repeat the `submitted by /u/...`
trailer; Reddit feeds currently fail closed (`robots_disallowed`) under
Reddit's live robots.txt policy.

## 4. Query parameter aliases (plural vs singular)

The backend's canonical params are **singular**; the proxy currently
sends **plural**. Both spellings are accepted on `/news`:

| Deprecated (plural) | Canonical (singular) |
| ------------------- | -------------------- |
| `categories`        | `category`           |
| `publishers`        | `publisher`          |
| `keywords`          | `keyword`            |
| `excludes`          | `exclude`            |

No frontend change is required now; prefer the singular spellings going
forward (the plural aliases are the first candidates for removal).

## 5. What did NOT change

- Envelope (`{ok, data, error, meta}`), `x-request-id`, error codes and
  status mapping, auth and rate limits (production only).
- `/news`, `/news/detail/`, `/fetch`, `/meta`, and `/health` contracts.
- Article cleaning in `/news/detail/` and AI-assisted extraction in `/fetch`.

## 6. Migration checklist

- [ ] No action required to keep the news list working (plural params now
      resolve); stop displaying `.go.id`-sourced UI affordances if any.
- [ ] Update copy/UI if it assumed only major-publisher sources.
- [ ] Render item fields from the canonical schema above; handle `null`
      for `author`, `summary`, `content`, `language`.
- [ ] Prefer singular filter parameter names in new `/news` requests.
