const CACHE_VERSION = "v1";

function normalizeCachePart(value) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildSearchCacheKey(query, location, mode, scenario = "live") {
  return [
    CACHE_VERSION,
    normalizeCachePart(location),
    normalizeCachePart(query),
    mode,
    scenario,
  ].join(":");
}

export function readCachedSearch(cacheKey) {
  try {
    const cached = window.sessionStorage.getItem(cacheKey);
    return cached ? JSON.parse(cached) : null;
  } catch (error) {
    console.warn("Cached search results were invalid or unavailable.", error);
    try {
      window.sessionStorage.removeItem(cacheKey);
    } catch (cleanupError) {
      console.warn("Invalid cached results could not be removed.", cleanupError);
    }
    return null;
  }
}

export function writeCachedSearch(cacheKey, response) {
  if (!response?.products?.length) {
    return;
  }

  try {
    window.sessionStorage.setItem(cacheKey, JSON.stringify(response));
  } catch (error) {
    console.warn("Search results could not be cached for this session.", error);
  }
}
