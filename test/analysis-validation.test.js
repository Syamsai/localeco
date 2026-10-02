import { describe, expect, it } from "vitest";

import { mergeProductAnalyses } from "@/lib/analysis-validation";

const products = [
  { id: "one", title: "One" },
  { id: "two", title: "Two" },
];

function validAnalysis(id) {
  return {
    id,
    ecoScore: 7,
    ecoReason: "The listing provides a specific recycled-content claim.",
    signals: ["recycled content"],
  };
}

describe("mergeProductAnalyses", () => {
  it("matches valid analyses by product ID rather than array position", () => {
    const result = mergeProductAnalyses(products, [
      validAnalysis("two"),
      validAnalysis("one"),
    ]);

    expect(result.validCount).toBe(2);
    expect(result.products.map((product) => product.analysisStatus)).toEqual([
      "complete",
      "complete",
    ]);
  });

  it("isolates unknown, malformed, and missing analyses", () => {
    const result = mergeProductAnalyses(products, [
      validAnalysis("one"),
      validAnalysis("unknown"),
      { ...validAnalysis("two"), ecoScore: 11 },
    ]);

    expect(result.validCount).toBe(1);
    expect(result.products[0].analysisStatus).toBe("complete");
    expect(result.products[1]).toMatchObject({
      ecoScore: null,
      ecoReason: null,
      signals: [],
      analysisStatus: "unavailable",
    });
  });

  it("rejects duplicate IDs instead of selecting an arbitrary analysis", () => {
    const result = mergeProductAnalyses(products, [
      validAnalysis("one"),
      { ...validAnalysis("one"), ecoScore: 8 },
    ]);

    expect(result.validCount).toBe(0);
    expect(result.products[0].analysisStatus).toBe("unavailable");
  });

  it("rejects duplicate signals and extra fields", () => {
    const result = mergeProductAnalyses(products, [
      {
        ...validAnalysis("one"),
        signals: ["Recycled content", "recycled content"],
      },
      { ...validAnalysis("two"), unsupported: true },
    ]);

    expect(result.validCount).toBe(0);
  });
});
