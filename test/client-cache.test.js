import { describe, expect, it, vi } from "vitest";

import {
  buildSearchCacheKey,
  readCachedSearch,
  writeCachedSearch,
} from "@/lib/client-cache";

describe("client search cache", () => {
  it("normalizes query and location and isolates mock scenarios", () => {
    expect(
      buildSearchCacheKey(
        "  Bamboo   Toothbrush ",
        " Hyderabad,  Telangana, India ",
        "mock",
        "partial_analysis",
      ),
    ).toBe(
      "v1:hyderabad, telangana, india:bamboo toothbrush:mock:partial_analysis",
    );
  });

  it("stores product responses and does not store empty results", () => {
    const key = "search-key";
    const response = { products: [{ id: "one" }] };

    writeCachedSearch(key, response);
    expect(readCachedSearch(key)).toEqual(response);

    writeCachedSearch("empty-key", { products: [] });
    expect(readCachedSearch("empty-key")).toBeNull();
  });

  it("removes invalid cached JSON explicitly", () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    window.sessionStorage.setItem("invalid-key", "{");

    expect(readCachedSearch("invalid-key")).toBeNull();
    expect(window.sessionStorage.getItem("invalid-key")).toBeNull();
    expect(warning).toHaveBeenCalled();

    warning.mockRestore();
  });
});
