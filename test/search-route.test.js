import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "@/app/api/search/route";

const originalEnvironment = {
  useMockData: process.env.USE_MOCK_DATA,
  mockDelay: process.env.MOCK_DELAY_MS,
};

function searchRequest(body) {
  return new Request("http://localhost:3000/api/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function callSearch(body) {
  const response = await POST(searchRequest(body));
  return {
    response,
    payload: await response.json(),
  };
}

describe("POST /api/search", () => {
  beforeAll(() => {
    vi.spyOn(console, "info").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  beforeEach(() => {
    process.env.USE_MOCK_DATA = "true";
    process.env.MOCK_DELAY_MS = "0";
  });

  afterAll(() => {
    vi.restoreAllMocks();
    process.env.USE_MOCK_DATA = originalEnvironment.useMockData;
    process.env.MOCK_DELAY_MS = originalEnvironment.mockDelay;
  });

  it("returns ten normalized and analyzed products", async () => {
    const { response, payload } = await callSearch({
      query: "bamboo toothbrush",
      location: "Hyderabad, Telangana, India",
      mockScenario: "success",
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("x-request-id")).toBeTruthy();
    expect(payload).toMatchObject({
      status: "complete",
      isMock: true,
      analysisMessage: null,
    });
    expect(payload.products).toHaveLength(10);
    expect(payload.products.every((product) => product.analysisStatus === "complete")).toBe(
      true,
    );
  });

  it("returns the no-results contract", async () => {
    const { response, payload } = await callSearch({
      query: "unavailable product",
      location: "Hyderabad, Telangana, India",
      mockScenario: "no_results",
    });

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      status: "no_results",
      products: [],
    });
  });

  it("preserves products when all analysis is unavailable", async () => {
    const { response, payload } = await callSearch({
      query: "bamboo toothbrush",
      location: "Hyderabad, Telangana, India",
      mockScenario: "analysis_failure",
    });

    expect(response.status).toBe(200);
    expect(payload.status).toBe("partial");
    expect(payload.products).toHaveLength(10);
    expect(payload.products.every((product) => product.ecoScore === null)).toBe(
      true,
    );
    expect(payload.analysisMessage).toContain(
      "sustainability analysis is temporarily unavailable",
    );
  });

  it("isolates products missing partial analysis", async () => {
    const { payload } = await callSearch({
      query: "bamboo toothbrush",
      location: "Hyderabad, Telangana, India",
      mockScenario: "partial_analysis",
    });

    expect(payload.status).toBe("partial");
    expect(
      payload.products.filter(
        (product) => product.analysisStatus === "complete",
      ),
    ).toHaveLength(7);
    expect(payload.analysisMessage).toBe(
      "Sustainability analysis was unavailable for some products.",
    );
  });

  it.each([
    ["shopping_failure", 502],
    ["malformed_provider", 502],
  ])("surfaces %s as a provider error", async (mockScenario, expectedStatus) => {
    const { response, payload } = await callSearch({
      query: "bamboo toothbrush",
      location: "Hyderabad, Telangana, India",
      mockScenario,
    });

    expect(response.status).toBe(expectedStatus);
    expect(payload.error.message).toBe(
      "Shopping search is temporarily unavailable.",
    );
  });

  it.each([
    [{ query: " ", location: "Hyderabad, Telangana, India" }, "INVALID_QUERY"],
    [{ query: "toothbrush", location: " " }, "INVALID_LOCATION"],
    [
      {
        query: "toothbrush",
        location: "Hyderabad, Telangana, India",
        mockScenario: "unknown",
      },
      "INVALID_MOCK_SCENARIO",
    ],
  ])("rejects invalid request data", async (body, expectedCode) => {
    const { response, payload } = await callSearch(body);

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe(expectedCode);
  });
});
