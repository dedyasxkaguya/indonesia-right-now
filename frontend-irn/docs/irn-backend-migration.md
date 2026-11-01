# IRN backend news contract migration

Updated 2026-10-31.

## Changes

- News list requests now use the backend's configured default preset when no source list is supplied. The frontend no longer overrides that community-first default with its own RSS whitelist.
- `/api/news` maps canonical `category`, `publisher`, `keyword`, and `exclude` parameters through unchanged, and translates the deprecated plural aliases to those canonical names. Explicit source requests are preserved, but hosts under `.go.id` are rejected for both GET and POST requests.
- Removed the duplicate frontend RSS source registry and sequential source-fetch merger. Government feed URLs are no longer configured in the frontend.
- Server-rendered article, home, today, and publisher pages no longer submit a hard-coded source list.
- News item nullable fields remain required nullable values in TypeScript/Zod; `date_confidence` accepts new backend values beyond the previously enumerated set.
- Feed metadata displays the returned source name/domain, author, and language only when present. Author text is preserved verbatim (including Reddit `/u/` prefixes), summaries use a shortened content fallback when available, and missing summary/content is omitted.
- Filter URLs now write `category` and `publisher`; older `cat`, `pub`, `categories`, and `publishers` links are still readable.

## AI endpoint audit

The frontend contains no caller for `/news/ai`, `/news/ai/detail`, or `/news/ai/jobs/{job_id}`. `/analisis-url` uses the separate `/api/fetch` endpoint and its existing `FetchResponse` schema, so no unrelated AI response shape was introduced. If a `/news/ai/*` caller is added later, it must gate rendering on `verification.passed`.

## Verification

- `pnpm typecheck`
- `pnpm lint`
- `pnpm test`
- `pnpm build`
