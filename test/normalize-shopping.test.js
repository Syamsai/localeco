import { describe, expect, it } from "vitest";

import { normalizeShoppingResults } from "@/lib/normalize-shopping";

function providerProduct(index, overrides = {}) {
  return {
    product_id: String(index),
    title: `Product ${index}`,
    source: "Merchant",
    price: `₹${index * 10}`,
    product_link: `https://www.google.co.in/search?product=${index}`,
    rating: 4.2,
    reviews: index,
    delivery: "Free delivery",
    ...overrides,
  };
}

describe("normalizeShoppingResults", () => {
  it("normalizes only the first ten usable products", () => {
    const shoppingResults = Array.from({ length: 12 }, (_, index) =>
      providerProduct(index + 1),
    );

    const products = normalizeShoppingResults({
      shopping_results: shoppingResults,
    });

    expect(products).toHaveLength(10);
    expect(products[0]).toMatchObject({
      id: "1",
      title: "Product 1",
      source: "Merchant",
      price: "₹10",
      rating: 4.2,
      reviews: 1,
    });
    expect(products.at(-1).id).toBe("10");
  });

  it("keeps usable products when optional fields are missing", () => {
    const [product] = normalizeShoppingResults({
      shopping_results: [
        providerProduct(1, {
          source: undefined,
          price: undefined,
          rating: undefined,
          reviews: undefined,
          delivery: undefined,
          thumbnail: undefined,
        }),
      ],
    });

    expect(product).toMatchObject({
      source: null,
      price: null,
      rating: null,
      reviews: null,
      delivery: null,
      thumbnail: null,
    });
  });

  it("drops products without a title or safe outbound URL", () => {
    const products = normalizeShoppingResults({
      shopping_results: [
        providerProduct(1, { title: " " }),
        providerProduct(2, { product_link: "javascript:alert(1)" }),
        providerProduct(3),
      ],
    });

    expect(products).toHaveLength(1);
    expect(products[0].id).toBe("3");
  });

  it("rejects a malformed shopping_results field", () => {
    expect(() =>
      normalizeShoppingResults({ shopping_results: { invalid: true } }),
    ).toThrow("Shopping results must be an array.");
  });
});
