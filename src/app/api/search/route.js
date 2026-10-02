import { NextResponse } from "next/server";

import { mergeProductAnalyses } from "@/lib/analysis-validation";
import { createMockAnalyses } from "@/lib/mock-analysis";
import {
  DEFAULT_MOCK_SCENARIO,
  isMockScenario,
} from "@/lib/mock-scenarios";
import { createMockShoppingResponse } from "@/lib/mock-shopping-response";
import { normalizeShoppingResults } from "@/lib/normalize-shopping";
import {
  fetchShoppingLightResults,
  ShoppingProviderError,
} from "@/lib/serpapi";

export const runtime = "nodejs";

const MAX_INPUT_LENGTH = 120;
const MAX_MOCK_DELAY_MS = 2000;

function elapsedMilliseconds(startedAt) {
  return Math.round(performance.now() - startedAt);
}

function logRequest(requestId, event, details = {}) {
  console.info("LocalEco search", {
    requestId,
    event,
    ...details,
  });
}

function getMockDelay() {
  const configuredDelay = Number.parseInt(process.env.MOCK_DELAY_MS ?? "", 10);

  if (!Number.isFinite(configuredDelay)) {
    return 500;
  }

  return Math.min(Math.max(configuredDelay, 0), MAX_MOCK_DELAY_MS);
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function validateText(value, fieldName) {
  if (typeof value !== "string" || !value.trim()) {
    return `${fieldName} is required.`;
  }

  if (value.trim().length > MAX_INPUT_LENGTH) {
    return `${fieldName} must be ${MAX_INPUT_LENGTH} characters or fewer.`;
  }

  return null;
}

function jsonResponse(body, status, requestId) {
  return NextResponse.json(body, {
    status,
    headers: { "x-request-id": requestId },
  });
}

function errorResponse(code, message, status, requestId) {
  return jsonResponse({ error: { code, message } }, status, requestId);
}

function shouldUseMockData(body) {
  if (process.env.USE_MOCK_DATA === "true") {
    return true;
  }

  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ALLOW_REQUEST_MOCK === "true" &&
    body.useMock === true
  );
}

export async function POST(request) {
  const requestId = crypto.randomUUID();
  const startedAt = performance.now();
  let body;

  try {
    body = await request.json();
  } catch {
    return errorResponse(
      "INVALID_REQUEST",
      "Request body must be valid JSON.",
      400,
      requestId,
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return errorResponse(
      "INVALID_REQUEST",
      "Request body must be an object.",
      400,
      requestId,
    );
  }

  const queryError = validateText(body.query, "Search query");
  if (queryError) {
    return errorResponse("INVALID_QUERY", queryError, 400, requestId);
  }

  const locationError = validateText(body.location, "Location");
  if (locationError) {
    return errorResponse("INVALID_LOCATION", locationError, 400, requestId);
  }

  const query = body.query.trim();
  const location = body.location.trim();
  const useMock = shouldUseMockData(body);
  const mockScenario = useMock
    ? body.mockScenario ?? DEFAULT_MOCK_SCENARIO
    : DEFAULT_MOCK_SCENARIO;

  if (useMock && !isMockScenario(mockScenario)) {
    return errorResponse(
      "INVALID_MOCK_SCENARIO",
      "The selected demo scenario is not supported.",
      400,
      requestId,
    );
  }

  logRequest(requestId, "started", {
    mode: useMock ? "mock" : "real",
    mockScenario: useMock ? mockScenario : undefined,
  });

  let providerResponse;
  const providerStartedAt = performance.now();
  try {
    if (useMock) {
      await delay(getMockDelay());
    }

    if (useMock && mockScenario === "shopping_failure") {
      throw new ShoppingProviderError("Simulated shopping provider failure.");
    }

    providerResponse = useMock
      ? createMockShoppingResponse({
          query,
          location,
          origin: new URL(request.url).origin,
          scenario: mockScenario,
        })
      : await fetchShoppingLightResults({ query, location });

    logRequest(requestId, "provider-complete", {
      durationMs: elapsedMilliseconds(providerStartedAt),
      rawResultCount: Array.isArray(providerResponse.shopping_results)
        ? providerResponse.shopping_results.length
        : null,
    });
  } catch (error) {
    if (error instanceof ShoppingProviderError) {
      const isTimeout = error.code === "REQUEST_TIMEOUT";
      const status =
        error.code === "PROVIDER_NOT_CONFIGURED" ? 500 : isTimeout ? 504 : 502;
      const message =
        error.code === "PROVIDER_NOT_CONFIGURED"
          ? "Shopping search is not configured."
          : "Shopping search is temporarily unavailable.";

      console.error("Shopping provider request failed", {
        requestId,
        code: error.code,
        message: error.message,
        durationMs: elapsedMilliseconds(providerStartedAt),
      });
      return errorResponse(error.code, message, status, requestId);
    }

    console.error("Unexpected shopping provider failure", {
      requestId,
      error,
    });
    return errorResponse(
      "INTERNAL_ERROR",
      "Something went wrong. Please try again.",
      500,
      requestId,
    );
  }

  let products;
  try {
    products = normalizeShoppingResults(providerResponse);
  } catch (error) {
    console.error("Shopping response validation failed", {
      requestId,
      message:
        error instanceof Error ? error.message : "Unknown validation error",
    });
    return errorResponse(
      "SHOPPING_UNAVAILABLE",
      "Shopping search is temporarily unavailable.",
      502,
      requestId,
    );
  }

  if (products.length === 0) {
    logRequest(requestId, "completed", {
      outcome: "no_results",
      normalizedResultCount: 0,
      totalDurationMs: elapsedMilliseconds(startedAt),
    });
    return jsonResponse(
      {
        query,
        location,
        status: "no_results",
        analysisMessage: null,
        isMock: useMock,
        products: [],
      },
      200,
      requestId,
    );
  }

  const analysisStartedAt = performance.now();
  const analyses = useMock
    ? createMockAnalyses(products, mockScenario)
    : [];
  const enriched = mergeProductAnalyses(products, analyses);
  const analysisComplete = enriched.validCount === products.length;
  const analysisMessage = analysisComplete
    ? null
    : enriched.validCount === 0
      ? "We found products, but sustainability analysis is temporarily unavailable."
      : "Sustainability analysis was unavailable for some products.";

  logRequest(requestId, "completed", {
    outcome: analysisComplete ? "complete" : "partial",
    normalizedResultCount: products.length,
    validAnalysisCount: enriched.validCount,
    analysisDurationMs: elapsedMilliseconds(analysisStartedAt),
    totalDurationMs: elapsedMilliseconds(startedAt),
  });

  return jsonResponse(
    {
      query,
      location,
      status: analysisComplete ? "complete" : "partial",
      analysisMessage,
      isMock: useMock,
      products: enriched.products,
    },
    200,
    requestId,
  );
}
