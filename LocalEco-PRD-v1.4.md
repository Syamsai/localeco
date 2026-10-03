# LocalEco Product Requirements Document

## AI-Powered Sustainable Shopping Assistant

| Field | Value |
|---|---|
| Project | LocalEco |
| Target | SerpApi India Hackathon 2026 |
| Team | Solo developer |
| Stack | Next.js 14+, React, JavaScript, Tailwind CSS |
| Submission deadline | October 5, 2026 |
| Version | 1.4 |
| Status | Frozen MVP |
| Primary search engine | SerpApi Google Shopping Light |
| AI model | Gemini 3.5 Flash-Lite |

## 1. Executive Summary

LocalEco helps shoppers compare Google Shopping listings using sustainability
signals found in the listing data.

The product combines one SerpApi Google Shopping Light request with one Gemini
batch request to enrich up to 10 shopping results with:

- an AI-estimated Eco Evidence Score;
- a concise explanation;
- supported sustainability signals; and
- a clear indication when listing evidence is limited or analysis is
  unavailable.

LocalEco is an intelligence layer over Google Shopping. It is not a
marketplace, product-certification service, nearby-store finder, or scientific
life-cycle assessment tool.

## 2. Problem

Shopping listings usually emphasize title, price, merchant, rating, and
delivery. Sustainability details, when present, are inconsistent and difficult
to compare.

Users must inspect listings individually and may mistake vague marketing terms
for verified environmental claims. LocalEco reduces this effort by extracting
and explaining only the sustainability evidence contained in the available
listing data.

## 3. Product Goal

Enable a shopper to search for an everyday product and compare up to 10 real
Google Shopping listings by their listing-supported sustainability signals in
one clear workflow.

### 3.1 Success statement

LocalEco succeeds when a user can:

1. choose a location;
2. search for a product;
3. view normalized Google Shopping results;
4. understand the sustainability evidence available for each listing;
5. filter for stronger evidence; and
6. open the original product page.

### 3.2 Product principles

1. **Evidence before claims:** Never infer facts not present in supplied data.
2. **Explainability:** Every numeric score must include a reason.
3. **Honest uncertainty:** Missing evidence is disclosed, not filled in.
4. **Shopping remains useful:** Valid shopping results remain visible if AI
   analysis fails.
5. **Credit efficiency:** One search request and at most one AI request per
   uncached user search.
6. **Frozen scope:** Reliability and demonstration quality take priority over
   additional features.

## 4. Users

### 4.1 Primary persona: eco-conscious shopper

A shopper who wants to consider sustainability when comparing everyday
products such as personal-care items, clothing, kitchenware, and reusable
household products.

### 4.2 Secondary persona: location-aware shopper

A shopper who wants Google Shopping results associated with a manually selected
city or region.

### 4.3 Evaluation audience

Hackathon judges evaluating:

- meaningful SerpApi usage;
- practical usefulness;
- responsible AI behavior;
- technical execution;
- user experience; and
- originality.

## 5. Scope

### 5.1 Included

- Manual location selection, defaulting to Hyderabad, Telangana, India
- Product search through SerpApi Google Shopping Light
- Normalization of the first 10 usable results
- One Gemini batch analysis per uncached search
- Eco Evidence Score, reason, and supported signals
- Responsive product grid
- All Results and Eco 7+ filters
- Loading, empty, partial-failure, and error states
- Session-scoped client cache
- Shared server-side result cache and live-search request/credit guardrails
- Controlled development/demo mock mode

### 5.2 Excluded

- Browser GPS or reverse geocoding
- Google Maps, Local Search, or nearby physical stores
- Sustainable alternative recommendations
- User accounts, authentication, or saved products
- Cart, checkout, or payments
- Price history
- Carbon-footprint calculations
- A proprietary sustainability database
- Browser extensions or native mobile apps
- Additional search engines
- Advanced analytics

## 6. Primary User Journey

1. The landing page displays the location control and a search input prefilled
   with `bamboo toothbrush`. It does not search automatically.
2. The user may edit the query and location.
3. The user submits with Enter or the Search button.
4. The page immediately displays product-card skeletons.
5. The server validates the request.
6. The server obtains Google Shopping results from SerpApi or the mock dataset.
7. The server normalizes and retains the first 10 usable products.
8. If products exist, the server submits all 10 in one Gemini request.
9. The UI renders enriched results. If AI analysis is unavailable, it renders
   the shopping results with a clear analysis-unavailable state.
10. The user may switch between All Results and Eco 7+ without another request.
11. The user may open a product link in a new tab.

## 7. Functional Requirements

### F-1: Location selection

- Default value: `Hyderabad, Telangana, India`.
- The user can enter or select another non-empty location.
- The MVP treats location as search context, not a distance or nearby-store
  constraint.
- No GPS, maps, or geocoding is performed.

**Acceptance criteria**

- The current location is visible and editable.
- Whitespace-only location values are rejected.
- A changed location is included in the next search request and cache key.
- Changing location alone does not issue a request until the user submits.

### F-2: Search input

- The user can submit through Enter or the Search button.
- Query input is trimmed and limited to 120 characters.
- Location input is trimmed and limited to 120 characters.
- A new submission supersedes any older in-flight result in the UI.

**Acceptance criteria**

- Empty or whitespace-only query: `Please enter a product to search.`
- Duplicate submissions while the same request is loading are ignored or the
  submit control is disabled.
- The submitted query and location remain visible while loading and after the
  response.

### F-3: SerpApi Google Shopping Light integration

When a live request misses the shared server cache, the server sends at most one
SerpApi request using:

- endpoint: `https://serpapi.com/search.json`;
- engine: `google_shopping_light`;
- `q`: the validated user query;
- `location`: the validated user location;
- `google_domain`: `google.co.in`;
- `gl`: `in`; and
- `hl`: `en-in`.

The server constructs the query with `URLSearchParams` rather than manually
concatenating or pre-encoding user input. The API key is added server-side.

The default LocalEco search does not set `sort_by`, `free_shipping`, or other
shopping filters because those filters are not part of the frozen MVP. The
sample response used to define this contract included `sort_by=1` and
`free_shipping=true`; these values must not be copied into the implementation.

The server uses only fields actually returned by SerpApi and does not expose
the raw provider response to the browser.

**Acceptance criteria**

- At most one SerpApi request is made per uncached search.
- The first 10 usable shopping results are retained.
- Missing optional fields do not remove an otherwise usable result.
- A result is usable when it has a non-empty title and a valid outbound product
  URL.
- When response search-parameter metadata is present, a different engine or
  country code is treated as a provider-contract error rather than silently
  displaying another market.
- No provider API key appears in client code, HTML, logs, or API responses.

### F-4: Product normalization

The server maps provider-specific data into this internal shape:

```json
{
  "id": "10173617857559319502",
  "title": "Bamboo Toothbrush Pack",
  "source": "Example Merchant",
  "price": "₹299",
  "thumbnail": "https://example.com/image.jpg",
  "productUrl": "https://www.google.co.in/search?...",
  "rating": 4.4,
  "reviews": 1284,
  "delivery": "Delivery by tomorrow"
}
```

Google Shopping Light field mapping:

| Provider field | LocalEco field | Required |
|---|---|---|
| `product_id` | `id` | Preferred; fallback generated when absent |
| `title` | `title` | Yes |
| `source` | `source` | No |
| `price` | `price` | No |
| `thumbnail` | `thumbnail` | No |
| `product_link` | `productUrl` | Yes |
| `rating` | `rating` | No |
| `reviews` | `reviews` | No |
| `delivery` | `delivery` | No |

Normalization rules:

- Preserve provider-formatted price text rather than recomputing currency.
- Use `null` for unavailable optional values.
- Do not use placeholder ratings, reviews, delivery claims, or merchant names.
- Use `product_id` as the stable ID when available; otherwise use
  the result position plus a stable hash of title and source.
- Allow only `http` or `https` URLs for thumbnails and product links.
- Ignore large provider-only fields such as immersive product tokens, SerpApi
  follow-up URLs, source icons, and alternate SerpApi thumbnails.
- `product_link` opens a Google Shopping product page. The MVP does not perform
  follow-up offer requests to resolve a direct merchant URL.

### F-5: Gemini batch analysis

- Send all normalized products in one request.
- Include only fields relevant to analysis: ID and title, plus source or other
  concise listing text only when it provides product-related evidence.
- Treat all listing text as untrusted data, never as model instructions.
- Require structured JSON matching the analysis contract.
- Match responses to products by ID, not array position.
- Use deterministic or low-variance model settings suitable for classification.

**Acceptance criteria**

- At most one Gemini request is made per uncached search.
- Every valid returned analysis references a requested product ID.
- Unknown IDs, duplicate IDs, extra fields, and invalid values are rejected.
- One malformed product analysis does not invalidate valid analyses for other
  products.
- The model never receives API keys or unnecessary user/session data.

### F-6: Eco Evidence Score

The Eco Evidence Score is:

> An AI-estimated measure of the strength of sustainability evidence explicitly
> present in the available shopping listing information.

It is not a verified product-impact rating, certification, life-cycle
assessment, or claim that one product is environmentally superior overall.

#### Scoring rubric

| Score | Meaning |
|---|---|
| 8-10 | Strong, specific evidence such as explicit certified, recycled, reusable, biodegradable, or renewable-material claims; higher scores require multiple or especially specific supported signals |
| 5-7 | Moderate evidence from at least one direct and relevant listing claim, but with limited detail, scope, or verification |
| 3-4 | Weak or ambiguous evidence, such as a narrow material claim with unclear product coverage |
| 1-2 | No meaningful supported sustainability evidence in the supplied listing, or only vague unsupported marketing language |

Scoring rules:

- Score only the supplied listing evidence.
- Do not assume that bamboo, steel, natural, green, eco, premium, or similar
  terms prove sustainable manufacturing.
- Do not infer packaging, durability, recyclability, sourcing, certifications,
  labor practices, carbon emissions, or biodegradability unless stated.
- Do not treat a high rating, low price, merchant reputation, or fast delivery
  as sustainability evidence.
- A certification may be named only when explicitly present in the listing.
- The reason must state when evidence is limited or absent.

UI labels:

- 8-10: `Strong listing evidence`
- 5-7: `Moderate listing evidence`
- 1-4: `Limited listing evidence`

The UI must not label these bands as scientifically measured "eco impact."

### F-7: Analysis response contract

For each successfully analyzed product:

```json
{
  "id": "stable-result-id",
  "ecoScore": 8,
  "ecoReason": "The listing explicitly identifies a bamboo handle and plastic-free packaging.",
  "signals": [
    "bamboo handle",
    "plastic-free packaging"
  ]
}
```

Validation rules:

- `ecoScore` is an integer from 1 through 10.
- `ecoReason` is plain text from 1 through 240 characters.
- `signals` contains zero to four unique plain-text items.
- Each signal is 2 through 60 characters and supported by supplied data.
- Model output is rendered as text, never interpreted as HTML.

If analysis is unavailable for a product:

```json
{
  "ecoScore": null,
  "ecoReason": null,
  "signals": [],
  "analysisStatus": "unavailable"
}
```

The server, not the model, adds `analysisStatus`.

### F-8: Product cards

Each card displays:

- image, or a neutral image-unavailable placeholder;
- title;
- formatted price when available;
- merchant/source when available;
- rating and review count when available;
- delivery information when available;
- Eco Evidence Score and category when analysis succeeds;
- eco reason;
- sustainability-signal chips when present; and
- View on Google Shopping link.

**Acceptance criteria**

- Optional-field labels are omitted when values are missing.
- Missing data is never shown as `undefined`, `null`, zero, or a fabricated
  placeholder value.
- Product titles and explanations wrap without breaking the layout.
- View on Google Shopping opens the validated `product_link` URL in a new tab
  using safe link attributes.

### F-9: Eco filter

Two states:

- `All Results`: all returned shopping products.
- `Eco 7+`: products with a valid `ecoScore >= 7`.

**Acceptance criteria**

- Filtering is client-side and makes no network request.
- Filter state resets to All Results after a successful new search.
- Products with unavailable analysis do not appear in Eco 7+.
- If no product qualifies, show `No products in this search have an Eco
  Evidence Score of 7 or higher.`
- If all analysis is unavailable, disable Eco 7+ and explain why.

### F-10: Loading experience

- Show immediate skeleton feedback after a valid uncached submission.
- Skeletons remain until the full server response is available.
- Preserve the previous results only if the UI clearly indicates they belong to
  the previous search; the preferred MVP behavior is to replace them with
  skeletons.
- Use an accessible live status such as `Searching and analyzing products...`.

### F-11: Error and partial-success behavior

| Condition | HTTP behavior | User message | Results shown |
|---|---|---|---|
| Invalid query/location | 400 | Specific validation message | No |
| No shopping results | 200 | `No shopping results found for this search.` | No |
| SerpApi failure | 502/504 | `Shopping search is temporarily unavailable.` | No |
| Gemini total failure | 200 partial response | `We found products, but sustainability analysis is temporarily unavailable.` | Yes |
| Some invalid AI items | 200 partial response | `Sustainability analysis was unavailable for some products.` | Yes |
| Unexpected server failure | 500 | `Something went wrong. Please try again.` | No |
| Client/network failure | N/A | `Unable to connect. Check your connection and try again.` | No |

Errors must be explicit and must not be represented as successful empty results.
Provider error details and keys must not be sent to the browser.

### F-12: Mock mode

Mock mode supports frontend development, reliable demos, and state testing
without consuming external credits.

- Controlled by a server-side environment setting.
- A request-level `useMock` flag may be honored only outside production.
- Production must ignore or reject client attempts to enable mock mode unless
  the deployment is explicitly configured as a demo.
- The successful provider fixture resembles a sanitized raw
  `google_shopping_light` response and passes through the same normalizer as a
  real response.
- Raw fixtures retain only fields needed to exercise normalization and must not
  contain search-history URLs, opaque page tokens, API keys, or other
  unnecessary provider metadata.
- Mock and real pipelines produce the same normalized LocalEco API contract.
- Fixtures cover success, empty results, shopping failure, total AI failure,
  and partial AI failure.
- The UI visibly identifies mock data in development/demo mode.

### F-13: Session cache

- Cache successful responses in client memory or `sessionStorage`.
- Cache key:
  `v1:<normalized-location>:<normalized-query>:<mode>:<scenario>`.
- Normalize by trimming, converting to lowercase, and collapsing repeated
  whitespace.
- Cache only complete and partial-success responses that contain products.
- Do not cache validation, provider, network, or unexpected errors.
- Cache lifetime is the browser tab session.
- A cache hit skips the API request and therefore makes no SerpApi or Gemini
  request.
- Loading feedback for a cache hit may be skipped.

### F-14: Shared live-search cache and protection

The browser session cache and server-side cache have distinct purposes. The
browser cache avoids a repeat API request in the same tab. Upstash Redis
provides a shared cache across visitors and server instances, and enforces
provider-use guardrails for live requests.

- For a live API request, enforce per-visitor limits before checking the shared
  result cache: two requests per minute and ten per day.
- On a shared-cache hit, return the cached result without calling SerpApi or
  Gemini.
- On a miss, use a per-search lock to coalesce concurrent identical searches.
- Before provider work on a miss, enforce global limits of four live search
  executions per minute and twenty per day.
- Reserve from a hard lifetime SerpApi budget of fifty attempts before
  executing provider work. A timeout conservatively consumes the reservation.
- Cache complete responses for 24 hours; cache partial and no-result responses
  for one hour.
- Fail closed if live search is disabled or the protection/cache service is
  unavailable; do not bypass guardrails and call providers directly.
- Hash visitor identifiers and normalized search keys before storing them in
  Redis. Never log provider keys, raw IP addresses, or product payloads.

## 8. API Contract

### 8.1 Request

`POST /api/search`

```json
{
  "query": "bamboo toothbrush",
  "location": "Hyderabad, Telangana, India"
}
```

Development-only optional field:

```json
{
  "useMock": true
}
```

### 8.2 Successful response

```json
{
  "query": "bamboo toothbrush",
  "location": "Hyderabad, Telangana, India",
  "status": "complete",
  "analysisMessage": null,
  "isMock": false,
  "products": [
    {
      "id": "product-1",
      "title": "Bamboo Toothbrush Pack",
      "source": "Example Merchant",
      "price": "INR 299",
      "thumbnail": "https://example.com/image.jpg",
      "productUrl": "https://example.com/product",
      "rating": 4.4,
      "reviews": 1284,
      "delivery": "Delivery by tomorrow",
      "ecoScore": 8,
      "ecoReason": "The listing explicitly identifies a bamboo handle and plastic-free packaging.",
      "signals": ["bamboo handle", "plastic-free packaging"],
      "analysisStatus": "complete"
    }
  ]
}
```

`status` is one of:

- `complete`: all returned products have valid analysis;
- `partial`: one or more products lack valid analysis; or
- `no_results`: shopping search succeeded with no usable products.

### 8.3 Error response

```json
{
  "error": {
    "code": "SHOPPING_UNAVAILABLE",
    "message": "Shopping search is temporarily unavailable."
  }
}
```

Known codes:

- `INVALID_QUERY`
- `INVALID_LOCATION`
- `SHOPPING_UNAVAILABLE`
- `REQUEST_TIMEOUT`
- `INTERNAL_ERROR`

## 9. UX and Visual Requirements

### 9.1 Design direction

The interface should communicate sustainability, trust, simplicity, and modern
shopping without implying scientific certification.

Suggested palette:

- background: `#f8faf7`;
- deep teal: `#164e63`;
- green: `#15803d`; and
- sage: `#dcfce7`.

Use restrained cards, borders, spacing, and typography rather than heavy visual
effects.

### 9.2 Responsive behavior

- Mobile: one-column cards and full-width controls.
- Tablet: two-column cards when space permits.
- Desktop: three-column cards when space permits.
- No horizontal scrolling at a 320px viewport.

### 9.3 Accessibility

- Meet WCAG 2.1 AA contrast for text and interactive controls.
- Every control is keyboard accessible with a visible focus state.
- Inputs have persistent labels, not placeholder-only labels.
- Product images have meaningful alt text; decorative placeholders have empty
  alt text.
- Loading and error updates are announced through an appropriate live region.
- Color is not the only indication of score category or state.
- Respect reduced-motion preferences.

## 10. Non-Functional Requirements

### 10.1 Performance

- Render loading feedback within 200ms of a valid uncached submission.
- Avoid layout shift by reserving image and skeleton dimensions.
- Optimize remote images using the framework where provider hosts permit it,
  with a safe fallback for unconfigured hosts.
- The external API pipeline should complete within the deployment platform's
  route limit; provider calls must use explicit timeouts.

### 10.2 Reliability

- A Gemini failure must not discard valid shopping products.
- Abort obsolete client requests when a newer search is submitted where
  supported.
- Validate provider and AI payloads before use.
- Do not retry requests in a way that can unexpectedly multiply API costs.
  Any retry policy must be bounded to one retry for transient failures and
  documented; the MVP default is no automatic retry.

### 10.3 Security and privacy

- `SERPAPI_KEY` and `GEMINI_API_KEY` exist only in server environment variables.
- No secrets use the `NEXT_PUBLIC_` prefix.
- Validate input type, length, and content server-side.
- Treat listing text and model output as untrusted text.
- Do not render provider or model HTML.
- Permit only `http` and `https` outbound product/image URLs.
- Avoid logging full provider responses or unnecessary user queries in
  production.
- Do not collect personal data, location coordinates, or persistent user
  identifiers.

### 10.4 Observability

Log server-side, without secrets:

- generated request/correlation ID;
- mock versus real mode;
- provider duration and outcome;
- number of raw and normalized results;
- AI duration and valid/invalid analysis count; and
- total route duration and error code.

Logs must not include API keys or raw authorization headers.

## 11. Configuration

Required for real mode:

```text
SERPAPI_KEY=
GEMINI_API_KEY=
```

Recommended server-side settings:

```text
USE_MOCK_DATA=false
ALLOW_REQUEST_MOCK=false
```

The repository includes an `.env.example` with names and descriptions only.
Real secrets are excluded from version control.

## 12. Test and Acceptance Strategy

### 12.1 Unit coverage

- Request validation and normalization
- SerpApi product normalization with missing optional fields
- URL scheme validation
- AI response validation, including unknown and duplicate IDs
- Score range and signal limits
- Cache-key normalization
- Eco 7+ filter

### 12.2 API integration coverage

- Mock success with 10 products and one batch analysis
- Empty shopping results
- SerpApi failure
- Gemini total failure returning partial success
- One malformed AI item preserving other analyses
- Invalid request bodies
- Client `useMock` rejected or ignored in production

### 12.3 UI coverage

- Search by Enter and button
- Loading skeletons
- Complete, empty, error, and partial-success states
- Missing optional product data
- Filter behavior and empty filtered state
- Cache hit avoids a second request
- Keyboard navigation and live-status behavior
- Mobile layout at 320px

### 12.4 Demo acceptance

The final demo must show:

1. the default Hyderabad location;
2. a product search;
3. real or clearly identified mock shopping results;
4. AI score explanations and signals;
5. the evidence disclaimer;
6. Eco 7+ filtering;
7. a location change;
8. one graceful failure or limited-evidence example; and
9. a working View on Google Shopping link.

## 13. Analytics-Free Product Success Metrics

The MVP does not add a persistent analytics system. Success is assessed during
testing and demonstration:

- 100% of displayed scores have a reason.
- 0 unsupported claims in the curated demo dataset.
- 0 secrets in client bundles or responses.
- On a shared server-cache miss, at most one SerpApi request and one Gemini
  request when products exist; client- and server-cache hits make no provider
  requests.
- Repeating a cached search in the same tab produces no API or provider calls.
- Valid shopping products remain usable during Gemini failure.
- All required states are demonstrable in mock mode.

## 14. Delivery Plan

| Phase | Dates | Exit criteria |
|---|---|---|
| Foundation | Sep 17-18 | Next.js app, Tailwind, environment template, contracts, fixtures |
| Shopping pipeline | Sep 19-22 | One SerpApi request, normalization, location handling, errors |
| AI pipeline | Sep 23-25 | One structured batch request, rubric, validation, partial success |
| Frontend | Sep 26-29 | Search, location, cards, scores, filter, skeletons, responsive UI |
| Reliability | Sep 30-Oct 1 | Cache, mock scenarios, accessibility, edge cases, integration tests |
| Feature complete | Oct 2 | Required acceptance criteria pass; no new features |
| Submission | Oct 3-5 | README, screenshots, demo video, final test and public submission |

## 15. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Listing evidence is incomplete | Scores may be misunderstood | Evidence-based naming, disclaimer, explicit limited-evidence reasons |
| Model fabricates a claim | Loss of trust | Strict prompt, structured output, validation, curated adversarial tests |
| Provider schema varies | Broken cards | Normalization layer and fixtures with missing/alternate fields |
| AI output does not match products | Incorrect score association | Stable IDs and ID-based response matching |
| Gemini fails after shopping succeeds | Entire search appears broken | Partial-success contract and shopping-only cards |
| Public demo consumes credits | Cost or quota exhaustion | Browser session cache, shared server cache, request locking, live-search budgets, mock mode, one-plus-one request architecture |
| Mock data is mistaken for live data | Misleading demo | Visible mock indicator |
| External latency is high | Poor demo experience | Skeletons, explicit timeouts, prepared mock fallback |
| Sustainability wording overclaims impact | Reputational risk | Use Eco Evidence Score, not verified impact language |

## 16. Definition of Done

The MVP is complete only when:

- all in-scope functional acceptance criteria pass;
- one user action causes no more than one SerpApi and one Gemini request;
- API keys are verified absent from browser assets and responses;
- mock scenarios cover success and required failure states;
- Gemini failure preserves valid shopping results;
- scores and signals pass schema validation;
- the UI includes the evidence disclaimer;
- keyboard, mobile, loading, empty, and error experiences are verified;
- the README documents setup, environment variables, mock mode, limitations,
  architecture, and run commands;
- the demo flow can be completed reliably in 2-3 minutes; and
- no out-of-scope feature was added before stabilization.

## 17. Required Disclaimer

Display near the results heading or score explanation:

> Eco Evidence Scores are AI estimates based only on information in each
> shopping listing. They are not verified environmental-impact ratings or
> product certifications.

## 18. Frozen Scope Rule

This document is the source of truth for MVP implementation.

Add a feature only when it is listed here or required to make an existing
requirement work correctly. After feature complete, prioritize:

> Finish, stabilize, polish, demonstrate, submit.
