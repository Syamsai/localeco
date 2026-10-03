# LocalEco

LocalEco is an AI-powered sustainable shopping assistant. It enriches Google
Shopping Light results with listing-supported Eco Evidence Scores,
explanations, and sustainability signals.

LocalEco defaults to mock mode. A live search that misses the shared Upstash
cache uses at most one SerpApi Google Shopping Light request and, when products
are found, one Gemini structured batch request. A browser session-cache hit
does not call the API.

## Getting Started

1. Install dependencies:

```powershell
npm install
```

2. Copy `.env.example` to `.env.local`. Mock mode requires no API keys.

3. Start the development server:

```powershell
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000).

## Environment

```text
USE_MOCK_DATA=true
NEXT_PUBLIC_USE_MOCK_DATA=true
MOCK_DELAY_MS=500
ALLOW_REQUEST_MOCK=false
LIVE_SEARCH_ENABLED=false
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
LIVE_SEARCH_HASH_SECRET=
LIVE_SEARCH_PER_IP_MINUTE=2
LIVE_SEARCH_PER_IP_DAILY=10
LIVE_SEARCH_GLOBAL_MINUTE=4
LIVE_SEARCH_DAILY_BUDGET=20
LIVE_SEARCH_LIFETIME_BUDGET=50
LIVE_SEARCH_CACHE_TTL_SECONDS=86400
SERPAPI_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
```

API keys are server-only. Never prefix either key with `NEXT_PUBLIC_`.

## Commands

```powershell
npm run dev
npm run lint
npm test
npm run build
```

## Architecture

```text
Browser
  ├─ Check tab-scoped sessionStorage cache
  │    ├─ Hit: render cached response; do not call /api/search
  │    └─ Miss: POST /api/search
  │         ├─ Validate query and location
  │         ├─ Mock mode: local Shopping Light-shaped fixture
  │         └─ Live mode
  │              ├─ Enforce Upstash visitor limits
  │              ├─ Check Upstash shared result cache
  │              │    └─ Hit: return result; skip both providers
  │              └─ Miss: acquire per-search lock
  │                   ├─ Enforce global limits; reserve lifetime budget(serpApi credit limit)
  │                   ├─ SerpApi Google Shopping Light
  │                   ├─ Normalize up to 10 usable products
  │                   ├─ One Gemini batch analysis (when products exist)
  │                   ├─ Validate and merge by product ID
  │                   └─ Cache response in Upstash
  │
  └─ On API response with products, cache in sessionStorage
```

## Request & Credit Optimization Flow
Browser cache → Shared cache → SerpApi → ≤10 products → 1 Gemini batch → Cached result

### Request flow

The browser first checks its tab-scoped `sessionStorage` cache using normalized
query, location, mode, and mock scenario. A hit renders the saved response
without calling the API. On a miss, it submits the query and location to the
Next.js Route Handler, which validates both values and chooses mock or live
mode from server-side configuration. Mock mode uses local fixtures and never
contacts SerpApi, Gemini, or Upstash.

For live requests that reach the server, Upstash enforces per-visitor limits
before checking its shared cache. A shared-cache hit returns the saved result
without calling either provider. On a miss, a per-query lock prevents
concurrent duplicate work; global search limits and the lifetime SerpApi
budget are checked before provider work. The server calls SerpApi Google
Shopping Light once, normalizes at most 10 products, and, when products exist,
sends their IDs and titles in one Gemini structured-output request.

Gemini analyses are validated and matched by product ID. Invalid or missing
analyses are isolated to their products; a Gemini outage does not discard valid
shopping results. Complete results are cached for 24 hours; partial and
no-result responses are cached for one hour. Redis/protection failures block
live provider calls rather than bypassing the limits.

### Components

| Component | Responsibility |
|---|---|
| Next.js browser UI | Search, loading and error feedback, product cards, accessibility, client-side Eco 7+ filtering, and tab-scoped `sessionStorage` response cache |
| `/api/search` Route Handler | Input validation, mock/live selection, provider orchestration, response shaping, and request-ID logging |
| Browser session cache | Reuses successful responses with products in the current tab; avoids another API request until the tab session ends |
| SerpApi adapter | At most one India-configured Google Shopping Light request per shared-cache miss |
| Normalizer | Validate provider shape, sanitize fields and URLs, and retain up to 10 usable products |
| Gemini adapter and validator | One structured batch analysis; enforce score, reason, signal, and product-ID contracts |
| Upstash Redis | Shared cache, duplicate-request locks, rate limits, daily limits, and lifetime SerpApi budget |
| Vercel | Hosts the Next.js UI and server-side Route Handler; production function runs in Mumbai (`bom1`) |

### Live-search safeguards

The configured limits are two API requests per visitor per minute and ten per
visitor per day, including requests that hit the shared cache. On shared-cache
misses, the server allows four live search executions per minute and twenty
per day, plus a hard lifetime budget of fifty SerpApi attempts. The
four-per-minute cap stays below the configured Gemini free-tier request rate.
A lifetime-budget reservation is counted before provider execution, so a
provider timeout conservatively uses a budget slot.

Provider keys are read only by server-side code and must never use the
`NEXT_PUBLIC_` prefix. Visitor identifiers and normalized cache keys are
HMAC-hashed before being stored in Redis. Provider keys, raw IP addresses, and
product payloads are not logged.

## Mock Scenario Testing

When mock mode is enabled, open **Demo scenario controls** below the search form
and choose one of these deterministic states:

- Successful search
- No shopping results
- Shopping service failure
- Analysis unavailable
- Partial analysis
- Malformed provider response

All shopping scenarios use a Google Shopping Light-shaped fixture and the same
normalization function as live responses. `MOCK_DELAY_MS` keeps the loading
skeleton visible during local demonstrations and is capped at two seconds.

The test suite covers request validation, provider normalization, Gemini
structured requests, analysis validation, durable caching, rate and credit
budgets, all mock API outcomes, session caching, stale-response protection,
loading feedback, and explicit client errors.

## Live Search Protection

Live mode fails closed unless `LIVE_SEARCH_ENABLED=true` and Upstash Redis is
configured. Protection includes:

- two searches per visitor per minute;
- ten searches per visitor per day;
- four uncached live search executions per minute, below Gemini's five RPM free limit;
- twenty uncached live search executions per day;
- a hard lifetime budget of fifty SerpApi calls;
- a 24-hour shared cache for complete results;
- a one-hour shared cache for partial and no-result responses; and
- a per-query lock that prevents concurrent duplicate provider calls.

IP addresses and normalized search keys are HMAC-SHA-256 hashed before use in
Redis keys. `LIVE_SEARCH_HASH_SECRET` may provide a dedicated HMAC secret; when
empty, the Redis REST token is used. Provider keys, listing payloads, and raw IP
addresses are not logged.

The lifetime budget counter is stored at
`localeco:v1:provider:lifetime`. Reset it only intentionally from the Upstash
console.

## Enabling Live Mode

Keep both mock flags set to `true` until the live adapters and Upstash
connection have been validated. API keys belong only in `.env.local` locally
or encrypted Vercel environment variables.

For live mode, set:

```text
USE_MOCK_DATA=false
NEXT_PUBLIC_USE_MOCK_DATA=false
LIVE_SEARCH_ENABLED=true
```

Changing `NEXT_PUBLIC_USE_MOCK_DATA` requires a new build and deployment.

Gemini 2.5 Flash is unavailable to new API projects. LocalEco uses
`gemini-3.5-flash-lite`, which was verified with the free-tier project and the
structured analysis contract while avoiding higher-demand model capacity
errors.

See `LocalEco-PRD-v1.4.md` for the frozen MVP requirements.
