const MAX_PRODUCTS = 10;

function cleanText(value, maxLength = 500) {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned ? cleaned.slice(0, maxLength) : null;
}

function cleanUrl(value) {
  const text = cleanText(value, 2048);

  if (!text) {
    return null;
  }

  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function cleanNumber(value, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
    ? value
    : null;
}

function createFallbackId(result, index) {
  const value = `${result.title ?? ""}:${result.source ?? ""}:${index}`;
  let hash = 0;

  for (let characterIndex = 0; characterIndex < value.length; characterIndex += 1) {
    hash = (hash * 31 + value.charCodeAt(characterIndex)) >>> 0;
  }

  return `result-${index + 1}-${hash.toString(36)}`;
}

function normalizeProduct(result, index) {
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return null;
  }

  const title = cleanText(result.title, 300);
  const productUrl = cleanUrl(result.product_link);

  if (!title || !productUrl) {
    return null;
  }

  return {
    id:
      cleanText(String(result.product_id ?? ""), 100) ??
      createFallbackId(result, index),
    title,
    source: cleanText(result.source, 120),
    price: cleanText(result.price, 80),
    thumbnail: cleanUrl(result.thumbnail),
    productUrl,
    rating: cleanNumber(result.rating, { min: 0, max: 5 }),
    reviews: cleanNumber(result.reviews, { min: 0 }),
    delivery: cleanText(result.delivery, 180),
  };
}

export function normalizeShoppingResults(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new TypeError("Shopping provider returned an invalid response.");
  }

  if (
    payload.shopping_results !== undefined &&
    !Array.isArray(payload.shopping_results)
  ) {
    throw new TypeError("Shopping results must be an array.");
  }

  return (payload.shopping_results ?? [])
    .map(normalizeProduct)
    .filter(Boolean)
    .slice(0, MAX_PRODUCTS);
}
