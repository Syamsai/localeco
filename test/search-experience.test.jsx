import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import SearchExperience from "@/components/SearchExperience";

function product(id, title = `Product ${id}`) {
  return {
    id,
    title,
    source: "Merchant",
    price: "₹199",
    thumbnail: null,
    productUrl: `https://www.google.co.in/search?product=${id}`,
    rating: 4.2,
    reviews: 10,
    delivery: "Free delivery",
    ecoScore: 7,
    ecoReason: "The listing provides a direct recycled-content claim.",
    signals: ["recycled content"],
    analysisStatus: "complete",
  };
}

function searchResponse(query = "bamboo toothbrush") {
  return {
    query,
    location: "Hyderabad, Telangana, India",
    status: "complete",
    analysisMessage: null,
    isMock: true,
    products: [product("one")],
  };
}

function responseWith(payload, options = {}) {
  return {
    ok: options.ok ?? true,
    json: vi.fn().mockResolvedValue(payload),
  };
}

describe("SearchExperience", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("validates empty query and location before making a request", () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    render(<SearchExperience />);

    fireEvent.change(screen.getByRole("textbox", { name: /looking for/i }), {
      target: { value: " " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(
      screen.getAllByText("Please enter a product to search."),
    ).toHaveLength(2);

    fireEvent.change(screen.getByRole("textbox", { name: /looking for/i }), {
      target: { value: "toothbrush" },
    });
    fireEvent.change(screen.getByRole("combobox", { name: /shopping location/i }), {
      target: { value: " " },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(
      screen.getAllByText("Please enter a shopping location."),
    ).toHaveLength(2);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows loading feedback and reuses a cached response", async () => {
    let resolveResponse;
    const pendingResponse = new Promise((resolve) => {
      resolveResponse = resolve;
    });
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockReturnValueOnce(pendingResponse);
    render(<SearchExperience />);

    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(
      screen.getAllByText("Searching and analyzing products..."),
    ).toHaveLength(2);

    resolveResponse(responseWith(searchResponse()));
    await screen.findByRole("heading", { name: "Shopping results" });

    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("includes the selected mock scenario in the request", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(responseWith(searchResponse()));
    render(<SearchExperience />);

    fireEvent.change(screen.getByLabelText("Scenario"), {
      target: { value: "partial_analysis" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    await screen.findByRole("heading", { name: "Shopping results" });
    const request = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(request.mockScenario).toBe("partial_analysis");
  });

  it("does not let a stale response overwrite a newer search", async () => {
    const resolvers = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvers.push(resolve);
        }),
    );
    render(<SearchExperience />);
    const form = screen.getByRole("button", { name: "Search" }).closest("form");
    const queryInput = screen.getByRole("textbox", { name: /looking for/i });

    fireEvent.submit(form);
    fireEvent.change(queryInput, { target: { value: "recycled notebook" } });
    fireEvent.submit(form);

    resolvers[1](responseWith(searchResponse("recycled notebook")));
    await screen.findByText(/products for “recycled notebook”/i);

    resolvers[0](responseWith(searchResponse("bamboo toothbrush")));
    await waitFor(() => {
      expect(
        screen.getByText(/products for “recycled notebook”/i),
      ).toBeDefined();
    });
    expect(
      screen.queryByText(/products for “bamboo toothbrush”/i),
    ).toBeNull();
  });

  it("renders a server error explicitly", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      responseWith(
        {
          error: {
            message: "Shopping search is temporarily unavailable.",
          },
        },
        { ok: false },
      ),
    );
    render(<SearchExperience />);

    fireEvent.click(screen.getByRole("button", { name: "Search" }));

    expect(
      await screen.findAllByText(
        "Shopping search is temporarily unavailable.",
      ),
    ).toHaveLength(2);
    expect(
      screen.getByRole("heading", {
        name: "We could not complete that search",
      }),
    ).toBeDefined();
  });
});
