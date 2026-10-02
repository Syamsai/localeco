import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchShoppingLightResults,
  ShoppingProviderError,
} from "@/lib/serpapi";

function providerResponse(overrides = {}) {
  return {
    search_parameters: {
      engine: "google_shopping_light",
      gl: "in",
    },
    shopping_results: [],
    ...overrides,
  };
}

function responseWith(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(payload),
  };
}

describe("fetchShoppingLightResults", () => {
  beforeEach(() => {
    process.env.SERPAPI_KEY = "test-serpapi-key";
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
    delete process.env.SERPAPI_KEY;
  });

  it("requests Google Shopping Light for the Indian market without extra filters", async () => {
    const payload = providerResponse();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(responseWith(payload));

    await expect(
      fetchShoppingLightResults({
        query: "bamboo toothbrush",
        location: "Hyderabad, Telangana, India",
      }),
    ).resolves.toEqual(payload);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [requestUrl, options] = fetchMock.mock.calls[0];
    const url = new URL(requestUrl);
    expect(url.origin + url.pathname).toBe(
      "https://serpapi.com/search.json",
    );
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      engine: "google_shopping_light",
      q: "bamboo toothbrush",
      location: "Hyderabad, Telangana, India",
      google_domain: "google.co.in",
      gl: "in",
      hl: "en-in",
      api_key: "test-serpapi-key",
    });
    expect(url.searchParams.has("sort_by")).toBe(false);
    expect(url.searchParams.has("free_shipping")).toBe(false);
    expect(options.cache).toBe("no-store");
  });

  it("surfaces provider HTTP and payload errors", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(responseWith({}, 403))
      .mockResolvedValueOnce(
        responseWith({ error: "Account search quota exhausted." }),
      );

    await expect(
      fetchShoppingLightResults({
        query: "one",
        location: "Hyderabad, Telangana, India",
      }),
    ).rejects.toBeInstanceOf(ShoppingProviderError);
    await expect(
      fetchShoppingLightResults({
        query: "two",
        location: "Hyderabad, Telangana, India",
      }),
    ).rejects.toThrow("Account search quota exhausted.");
  });

  it("rejects results from an unexpected engine or market", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      responseWith(
        providerResponse({
          search_parameters: {
            engine: "google_shopping",
            gl: "us",
          },
        }),
      ),
    );

    await expect(
      fetchShoppingLightResults({
        query: "bamboo toothbrush",
        location: "Hyderabad, Telangana, India",
      }),
    ).rejects.toThrow("unexpected market");
  });

  it("aborts a provider request after the configured timeout", async () => {
    vi.useFakeTimers();
    vi.spyOn(globalThis, "fetch").mockImplementation(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener("abort", () => {
            const error = new Error("Aborted");
            error.name = "AbortError";
            reject(error);
          });
        }),
    );

    const request = fetchShoppingLightResults({
      query: "bamboo toothbrush",
      location: "Hyderabad, Telangana, India",
    });
    const assertion = expect(request).rejects.toMatchObject({
      code: "REQUEST_TIMEOUT",
    });
    await vi.advanceTimersByTimeAsync(15000);
    await assertion;
  });
});
