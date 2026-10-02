const SERPAPI_ENDPOINT = "https://serpapi.com/search.json";
const REQUEST_TIMEOUT_MS = 15000;

export class ShoppingProviderError extends Error {
  constructor(message, code = "SHOPPING_UNAVAILABLE") {
    super(message);
    this.name = "ShoppingProviderError";
    this.code = code;
  }
}

export async function fetchShoppingLightResults({ query, location }) {
  const apiKey = process.env.SERPAPI_KEY;

  if (!apiKey) {
    throw new ShoppingProviderError(
      "SERPAPI_KEY is not configured.",
      "PROVIDER_NOT_CONFIGURED",
    );
  }

  const parameters = new URLSearchParams({
    engine: "google_shopping_light",
    q: query,
    location,
    google_domain: "google.co.in",
    gl: "in",
    hl: "en-in",
    api_key: apiKey,
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${SERPAPI_ENDPOINT}?${parameters.toString()}`, {
      signal: controller.signal,
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ShoppingProviderError(
        "SerpApi request timed out.",
        "REQUEST_TIMEOUT",
      );
    }

    throw new ShoppingProviderError("Unable to connect to SerpApi.");
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    throw new ShoppingProviderError(
      `SerpApi returned HTTP ${response.status}.`,
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new ShoppingProviderError("SerpApi returned invalid JSON.");
  }

  if (typeof payload?.error === "string" && payload.error.trim()) {
    throw new ShoppingProviderError(payload.error.trim());
  }

  const parametersUsed = payload?.search_parameters;
  if (
    parametersUsed &&
    (parametersUsed.engine !== "google_shopping_light" ||
      parametersUsed.gl !== "in")
  ) {
    throw new ShoppingProviderError(
      "SerpApi returned results for an unexpected market.",
    );
  }

  return payload;
}
