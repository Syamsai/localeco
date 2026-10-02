const ANALYSIS_BY_ID = {
  "10173617857559319502": {
    ecoScore: 6,
    ecoReason:
      "The listing identifies a bamboo handle and plant-based bristles, but gives no certification details.",
    signals: ["bamboo handle", "plant-based bristles"],
  },
  "14984630762724932705": {
    ecoScore: 6,
    ecoReason:
      "The bamboo handle and replaceable head are direct listing signals, though their wider impact is not documented.",
    signals: ["bamboo handle", "replaceable head"],
  },
  "7834651209762143871": {
    ecoScore: 4,
    ecoReason:
      "The listing names bamboo, but provides little detail about sourcing, packaging, or the full product.",
    signals: ["bamboo material"],
  },
  "4438257910645332119": {
    ecoScore: 7,
    ecoReason:
      "The listing explicitly states that the toothbrush is made with 90% recycled plastic.",
    signals: ["90% recycled plastic"],
  },
  "6307827463749163197": {
    ecoScore: 9,
    ecoReason:
      "The listing provides specific FSC certification and plastic-free packaging claims alongside bamboo material.",
    signals: ["FSC-certified bamboo", "plastic-free packaging"],
  },
  "8250173496201573144": {
    ecoScore: 6,
    ecoReason:
      "The listing explicitly describes a reusable stainless steel bottle, but gives no sourcing or durability evidence.",
    signals: ["reusable design", "stainless steel"],
  },
  "2564980137546998312": {
    ecoScore: 8,
    ecoReason:
      "The listing gives a specific recycled-content claim: the tote is made from 80% recycled cotton.",
    signals: ["80% recycled cotton", "reusable bag"],
  },
  "3901847625508136942": {
    ecoScore: 7,
    ecoReason:
      "The listing explicitly identifies cellulose material and home-compostable disposal.",
    signals: ["home compostable", "cellulose material"],
  },
  "6751348890246157330": {
    ecoScore: 1,
    ecoReason:
      "The listing does not provide any specific sustainability material, certification, or reuse information.",
    signals: [],
  },
  "9913472056318247601": {
    ecoScore: 7,
    ecoReason:
      "The listing explicitly describes a refillable glass bottle, supporting repeated use.",
    signals: ["refillable design", "glass bottle"],
  },
};

export function createMockAnalyses(products, scenario = "success") {
  if (scenario === "analysis_failure") {
    return [];
  }

  const analyses = products.map((product) => ({
    id: product.id,
    ...(ANALYSIS_BY_ID[product.id] ?? {
      ecoScore: 2,
      ecoReason:
        "The available listing provides too little information to identify meaningful sustainability evidence.",
      signals: [],
    }),
  }));

  return scenario === "partial_analysis" ? analyses.slice(0, 7) : analyses;
}
