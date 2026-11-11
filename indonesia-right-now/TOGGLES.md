# Runtime toggles

## Feed source tiers

`NEWSID_ACTIVE_TIERS` controls which preset and inline source tiers `/news` and
the `newsid` CLI may load. The default is `legal`.

| Value | Behavior |
|---|---|
| `legal` | Loads enabled legal-tier entries. |
| `legal,gray` | Also opts into gray-tier entries. |
| `legal,gray,blacklist` | Blacklist entries remain excluded even when named. |

Set the value in `.env` for the API, or in the process environment when running
the standalone CLI:

```dotenv
NEWSID_ACTIVE_TIERS=legal,gray
```

In PowerShell for one CLI invocation:

```powershell
$env:NEWSID_ACTIVE_TIERS = "legal,gray"
newsid --preset indonesia-default --dry-run
```

Each preset entry has `tier`, `enabled`, and (for disabled entries)
`disabled_reason` metadata. Ordinary disabled legal sources stay disabled.
Gray sources are stored as `enabled: false` and are eligible only when `gray`
is explicitly selected; this is the opt-in meaning of that tier. Blacklist
sources are never loaded. An unknown tier or empty tier list is a configuration
error. The loader logs active tier counts and a warning with the suppressed
source counts and URLs.

The default preset is in
[`presets/indonesia_default.yaml`](./presets/indonesia_default.yaml). Several
recently proposed endpoints could not be verified as working feeds; their
`notes` fields record the observed failure. Enabling `gray` may therefore
produce per-source fetch errors until those publishers provide a working
RSS/Atom endpoint.

The tier setting is a backend policy control, not a way for frontend callers to
override the server's active tiers. Inline `/news` source objects may specify
their tier, but the same active-tier and blacklist filtering applies.

## AI

`AI_ENABLED` controls AI-backed workflows. Set it to `false` when using feed
collection only; `/news/trending`, `/fetch`, and `/news/detail/` require AI to
complete. `/news` remains available and its deterministic category tagging and
IGS context mapping do not use Groq. Provider credentials and model options are
documented in `.env.example`.

The `/news/trending` successful-response cache lifetime is controlled by
`TRENDING_CACHE_TTL` (seconds; default `3600`). `/news` responses are cached per
resolved query for `NEWS_CACHE_TTL` seconds (default `300`). Both are in-memory
caches and the application must run with one worker.

`TRENDING_BATCH_CONCURRENCY` (default `1`) sets how many Groq clustering batches
run in parallel. Keep it at `1` unless the account's requests-per-minute limit
allows more; too many parallel batches cause 429 retries to be exhausted and the
endpoint to return `TRENDING_GENERATION_FAILED`.
