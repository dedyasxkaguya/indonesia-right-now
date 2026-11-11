# Trending API

## Endpoint

`GET /news/trending` returns SuperArticles from normalized news published in the last seven days. Undated articles are excluded. It uses the configured Groq extractor model to group related coverage; articles without a matching story are included as standalone SuperArticles.

The API uses the standard envelope:

```json
{
  "ok": true,
  "data": {
    "generated_at": "2026-11-10T00:00:00+00:00",
    "window": "7d",
    "super_articles": [
      {
        "id": "sha256-derived-hash",
        "topic_title": "Judul netral tentang peristiwa",
        "summary": "Ringkasan singkat yang merangkum perkembangan yang dilaporkan.",
        "article_count": 1,
        "sources": [
          {
            "publisher": "Publisher One",
            "title": "Original article title",
            "url": "https://publisher-one.example/news/story",
            "published_at": "2026-11-09T12:00:00+00:00",
            "categories": ["ekonomi", "pemerintahan"],
            "igs_context": [
              {
                "label": "Data Ekonomi IGS",
                "url": "/gov/ekonomi"
              }
            ]
          }
        ],
        "categories": ["ekonomi", "pemerintahan"],
        "igs_context": [
          {
            "label": "Data Ekonomi IGS",
            "url": "/gov/ekonomi"
          }
        ]
      }
    ]
  },
  "error": null,
  "meta": {
    "request_id": "request-id",
    "duration_ms": 12.34,
    "service": "indonesia-right-now",
    "version": "0.1.0"
  }
}
```

The `sources` array contains canonical publisher, title, URL, and publication time values from the raw feed records. It can contain one article when that story did not match another, or multiple articles when they cover a related event. `article_count` is always the number of source articles in that cluster and is at least one. `topic_title` and `summary` are taken from the lead source article. `published_at` can be `null` when the source feed did not provide a usable publication time. `generated_at` and the response metadata are refreshed when the cache is regenerated.

## Frontend consumption

1. Request `GET /news/trending` from the backend and include `X-API-Key` if the deployment configures `API_KEY`.
2. Check both the HTTP status and `ok`. On success, consume `data.super_articles`; preserve each article's `sources` list so users can open and compare the underlying reports. A single-source SuperArticle is standalone coverage, not an error or missing data.
3. Use `categories` as a list of 2–3 normalized Indonesian tags on both each SuperArticle and each source article. Treat them as filter/display labels, not as exclusive classification.
4. Use each article's `igs_context` array to render links to related IGS views. Each entry is `{ "label": string, "url": string }`; `url` is a frontend-relative route. The array is empty when no tag has a configured IGS mapping. SuperArticles and source articles may have different contexts.
5. Use `data.generated_at` to indicate when the clusters were generated. `data.window` identifies the covered period.
6. On errors, branch on `error.code`; AI/provider failures return an error response instead of a success-shaped empty result.

The same `categories` and `igs_context` fields are included on every item in `GET /news` under `data.items`. The frontend can use the same tag and link rendering for both endpoints.

Do not call Groq from the frontend. The backend clusters articles in batches of at most 10 per cache refresh to keep model requests bounded, then includes any ungrouped or omitted article as a standalone cluster. Successful results are cached for the configured cache lifetime.

## Public JSON schema

```typescript
interface IGSContext {
  label: string;
  url: string;
}

interface TrendingSource {
  publisher: string;
  title: string;
  url: string;
  published_at: string | null;
  categories: string[];
  igs_context: IGSContext[];
}

interface SuperArticle {
  id: string;
  topic_title: string;
  summary: string;
  article_count: number;
  sources: [TrendingSource, ...TrendingSource[]];
  categories: string[];
  igs_context: IGSContext[];
}

interface TrendingResponse {
  generated_at: string;
  window: "7d";
  super_articles: SuperArticle[];
}
```

Every SuperArticle has at least one source; `article_count` equals the source count. A single source indicates that the story did not match another article in the seven-day input. Every `categories` array contains 2–3 distinct tags. Tagging uses the feed's existing category and deterministic Indonesian/English keyword matching; it does not make an additional Groq request. The supported IGS mappings are:

| Category | Label | Route |
|---|---|---|
| `ekonomi` | Data Ekonomi IGS | `/gov/ekonomi` |
| `kesehatan`, `sosial` | Data Sosial IGS | `/gov/sosial-publik` |
| `infrastruktur` | Data Infrastruktur IGS | `/gov/infrastruktur` |

Other categories remain available as tags and have an empty `igs_context` unless a mapping is added by the backend.

## Configuration

- `GROQ_API_KEY`: existing Groq credential; required when AI is enabled.
- `AI_ENABLED`: existing setting; must be `true` to serve trending results.
- `AI_EXTRACTOR_MODEL`: existing Groq model setting used for clustering.
- `TRENDING_CACHE_TTL`: in-memory cache lifetime in seconds; defaults to `3600` (one hour).
- `TRENDING_BATCH_CONCURRENCY`: parallel Groq clustering batches; defaults to `1`. Raise it only within your account's requests-per-minute limit, otherwise batches exhaust their retries and the endpoint returns `TRENDING_GENERATION_FAILED`.

No new package dependencies are required. The in-memory cache is process-local; the service is configured to run with one worker.
