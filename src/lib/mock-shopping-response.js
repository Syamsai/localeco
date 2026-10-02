const googleShoppingUrl = (productId, query = "bamboo toothbrush") => {
  const params = new URLSearchParams({
    ibp: "oshop",
    q: query,
    prds: `productid:${productId}`,
    hl: "en-in",
    gl: "in",
    udm: "28",
  });

  return `https://www.google.co.in/search?${params.toString()}`;
};

const MOCK_RESULTS = [
  {
    position: 1,
    title: "Organic Bamboo Toothbrush with Soft Plant-Based Bristles",
    product_id: "10173617857559319502",
    source: "Green Habit",
    price: "₹149",
    extracted_price: 149,
    rating: 4.4,
    reviews: 318,
    thumbnail: "/mock-products/toothbrush.svg",
    delivery: "Free delivery by Saturday",
  },
  {
    position: 2,
    title: "Bamboo Toothbrush with Detachable Head, Pack of 2",
    product_id: "14984630762724932705",
    source: "Eco Essentials India",
    price: "₹249",
    extracted_price: 249,
    rating: 4.1,
    reviews: 86,
    thumbnail: "/mock-products/toothbrush.svg",
    delivery: "Delivery by Monday",
  },
  {
    position: 3,
    title: "Natural Bamboo Charcoal Toothbrush, Medium Bristles",
    product_id: "7834651209762143871",
    source: "Nature Basket",
    price: "₹99",
    extracted_price: 99,
    rating: 4,
    reviews: 44,
    thumbnail: "/mock-products/toothbrush.svg",
    delivery: "₹40 delivery",
  },
  {
    position: 4,
    title: "Toothbrush Made with 90% Recycled Plastic, Pack of 3",
    product_id: "4438257910645332119",
    source: "Everyday Care",
    price: "₹199",
    extracted_price: 199,
    reviews: 57,
    thumbnail: "/mock-products/toothbrush.svg",
    delivery: "Free delivery",
  },
  {
    position: 5,
    title: "FSC-Certified Bamboo Toothbrush Set in Plastic-Free Packaging",
    product_id: "6307827463749163197",
    source: "Bare Necessities",
    price: "₹399",
    extracted_price: 399,
    rating: 4.8,
    thumbnail: "/mock-products/toothbrush.svg",
    delivery: "Free delivery by Friday",
  },
  {
    position: 6,
    title: "Reusable Stainless Steel Water Bottle, 750 ml",
    product_id: "8250173496201573144",
    source: "Daily Living",
    price: "₹599",
    extracted_price: 599,
    rating: 4.5,
    reviews: 1203,
    thumbnail: "/mock-products/bottle.svg",
  },
  {
    position: 7,
    title: "Tote Bag Made from 80% Recycled Cotton",
    product_id: "2564980137546998312",
    source: "Rewoven",
    price: "₹349",
    extracted_price: 349,
    rating: 4.6,
    reviews: 212,
    thumbnail: "/mock-products/tote.svg",
    delivery: "Delivery in 3-5 days",
  },
  {
    position: 8,
    title: "Home-Compostable Cellulose Kitchen Sponge, Pack of 4",
    product_id: "3901847625508136942",
    source: "Earth Kitchen",
    price: "₹279",
    extracted_price: 279,
    rating: 4.3,
    reviews: 173,
    thumbnail: "/mock-products/sponge.svg",
    delivery: "Free delivery",
  },
  {
    position: 9,
    title: "Premium Soft Toothbrush, Pack of 4",
    product_id: "6751348890246157330",
    source: "Smile Store",
    price: "₹189",
    extracted_price: 189,
    rating: 4.2,
    reviews: 648,
    delivery: "Delivery by tomorrow",
  },
  {
    position: 10,
    title: "Refillable Glass Cleaning Spray Bottle, 500 ml",
    product_id: "9913472056318247601",
    source: "Refill Home",
    price: "₹449",
    extracted_price: 449,
    rating: 4.7,
    reviews: 95,
    thumbnail: "/mock-products/spray-bottle.svg",
    delivery: "Free delivery by Sunday",
  },
  {
    position: 11,
    title: "GOTS-Certified Organic Cotton T-Shirt",
    product_id: "3187564209781645032",
    source: "Kind Threads",
    price: "₹899",
    extracted_price: 899,
    rating: 4.6,
    reviews: 144,
    thumbnail: "/mock-products/tote.svg",
    delivery: "Delivery in 4-6 days",
  },
  {
    position: 12,
    title: "Recycled Paper Hardcover Notebook",
    product_id: "7264903185460271598",
    source: "Paper Again",
    price: "₹225",
    extracted_price: 225,
    rating: 4.3,
    reviews: 62,
    thumbnail: "/mock-products/notebook.svg",
  },
];

export function createMockShoppingResponse({
  query,
  location,
  origin,
  scenario = "success",
}) {
  const response = {
    search_metadata: {
      id: "mock-search",
      status: "Success",
      total_time_taken: 0.1,
    },
    search_parameters: {
      engine: "google_shopping_light",
      q: query,
      location_requested: location,
      location_used: location.replaceAll(", ", ","),
      google_domain: "google.co.in",
      hl: "en-in",
      gl: "in",
      device: "desktop",
    },
    search_information: {
      query_displayed: query,
      shopping_results_state: "Mock results",
    },
    shopping_results: MOCK_RESULTS.map((result) => ({
      ...result,
      thumbnail: result.thumbnail
        ? new URL(result.thumbnail, origin).toString()
        : undefined,
      product_link: googleShoppingUrl(result.product_id, query),
    })),
  };

  if (scenario === "no_results") {
    response.shopping_results = [];
    response.search_information.shopping_results_state = "No results";
  }

  if (scenario === "malformed_provider") {
    response.shopping_results = { unexpected: "shape" };
  }

  return response;
}
