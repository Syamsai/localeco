const ALLOWED_FIELDS = new Set(["id", "ecoScore", "ecoReason", "signals"]);

function isValidAnalysis(analysis, requestedIds) {
  if (!analysis || typeof analysis !== "object" || Array.isArray(analysis)) {
    return false;
  }

  if (Object.keys(analysis).some((field) => !ALLOWED_FIELDS.has(field))) {
    return false;
  }

  if (
    typeof analysis.id !== "string" ||
    !requestedIds.has(analysis.id) ||
    !Number.isInteger(analysis.ecoScore) ||
    analysis.ecoScore < 1 ||
    analysis.ecoScore > 10 ||
    typeof analysis.ecoReason !== "string"
  ) {
    return false;
  }

  const reason = analysis.ecoReason.trim();
  if (!reason || reason.length > 240 || !Array.isArray(analysis.signals)) {
    return false;
  }

  if (analysis.signals.length > 4) {
    return false;
  }

  const normalizedSignals = analysis.signals.map((signal) =>
    typeof signal === "string" ? signal.trim().toLowerCase() : "",
  );

  return (
    normalizedSignals.every(
      (signal) => signal.length >= 2 && signal.length <= 60,
    ) && new Set(normalizedSignals).size === normalizedSignals.length
  );
}

export function mergeProductAnalyses(products, analyses) {
  const requestedIds = new Set(products.map((product) => product.id));
  const duplicateIds = new Set();
  const candidates = new Map();

  for (const analysis of Array.isArray(analyses) ? analyses : []) {
    if (!isValidAnalysis(analysis, requestedIds)) {
      continue;
    }

    if (candidates.has(analysis.id)) {
      candidates.delete(analysis.id);
      duplicateIds.add(analysis.id);
      continue;
    }

    if (!duplicateIds.has(analysis.id)) {
      candidates.set(analysis.id, analysis);
    }
  }

  let validCount = 0;
  const enrichedProducts = products.map((product) => {
    const analysis = candidates.get(product.id);

    if (!analysis) {
      return {
        ...product,
        ecoScore: null,
        ecoReason: null,
        signals: [],
        analysisStatus: "unavailable",
      };
    }

    validCount += 1;
    return {
      ...product,
      ecoScore: analysis.ecoScore,
      ecoReason: analysis.ecoReason.trim(),
      signals: analysis.signals.map((signal) => signal.trim()),
      analysisStatus: "complete",
    };
  });

  return { products: enrichedProducts, validCount };
}
