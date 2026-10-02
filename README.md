# LocalEco

LocalEco is an AI-powered sustainable shopping assistant. It enriches Google
Shopping Light results with listing-supported Eco Evidence Scores,
explanations, and sustainability signals.

LocalEco defaults to mock mode. Live mode uses one SerpApi Google Shopping
Light request and one Gemini structured batch request per uncached search,
protected by durable Upstash Redis caching and request budgets.

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
GEMINI_MODEL=gemini-3.8-flash
```

API keys are server-only. Never prefix either key with `NEXT_PUBLIC_`.

## Commands

```powershell
npm run dev
npm run lint
npm test
npm run build
```

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
- four uncached provider calls per minute, below Gemini's five RPM free limit;
- twenty uncached provider calls per day;
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

Gemini 2.5 Flash is unavailable to new API projects. LocalEco uses the
replacement model explicitly recommended by the API: `gemini-3.8-flash`.

See `LocalEco-PRD-v1.4.md` for the frozen MVP requirements.
