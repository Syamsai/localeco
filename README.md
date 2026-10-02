# LocalEco

LocalEco is an AI-powered sustainable shopping assistant. It enriches Google
Shopping Light results with listing-supported Eco Evidence Scores,
explanations, and sustainability signals.

The current milestone runs in mock mode, using a sanitized provider-shaped
fixture that passes through the same normalization layer intended for live
SerpApi responses.

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
SERPAPI_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash
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

The test suite covers request validation, provider normalization, analysis
validation, all mock API outcomes, session caching, stale-response protection,
loading feedback, and explicit client errors.

## Before Enabling Live Mode

Keep `USE_MOCK_DATA=true` until both provider integrations are ready. API keys
must be added only to `.env.local`, which is excluded by `.gitignore`.

See `LocalEco-PRD-v1.3.md` for the frozen MVP requirements.
