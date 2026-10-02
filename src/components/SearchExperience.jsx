"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import BrandMark from "@/components/BrandMark";
import ProductCard from "@/components/ProductCard";
import ProductSkeleton from "@/components/ProductSkeleton";
import {
  buildSearchCacheKey,
  readCachedSearch,
  writeCachedSearch,
} from "@/lib/client-cache";
import {
  DEFAULT_MOCK_SCENARIO,
  MOCK_SCENARIOS,
} from "@/lib/mock-scenarios";

const DEFAULT_QUERY = "bamboo toothbrush";
const DEFAULT_LOCATION = "Hyderabad, Telangana, India";
const CLIENT_MODE =
  process.env.NEXT_PUBLIC_USE_MOCK_DATA === "true" ? "mock" : "real";

function SearchIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 20 20">
      <circle
        cx="8.5"
        cy="8.5"
        fill="none"
        r="5.5"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="m12.6 12.6 4 4"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 20 20">
      <path
        d="M10 18s5-5.2 5-10A5 5 0 0 0 5 8c0 4.8 5 10 5 10Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
      <circle cx="10" cy="8" fill="currentColor" r="1.8" />
    </svg>
  );
}

export default function SearchExperience() {
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [location, setLocation] = useState(DEFAULT_LOCATION);
  const [products, setProducts] = useState([]);
  const [requestState, setRequestState] = useState("idle");
  const [filter, setFilter] = useState("all");
  const [message, setMessage] = useState("");
  const [activeSearch, setActiveSearch] = useState(null);
  const [isMock, setIsMock] = useState(CLIENT_MODE === "mock");
  const [mockScenario, setMockScenario] = useState(DEFAULT_MOCK_SCENARIO);
  const abortControllerRef = useRef(null);
  const latestRequestRef = useRef(0);

  useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  const filteredProducts = useMemo(
    () =>
      filter === "eco"
        ? products.filter(
            (product) =>
              product.analysisStatus === "complete" && product.ecoScore >= 7,
          )
        : products,
    [filter, products],
  );

  const hasAnalysis = products.some(
    (product) => product.analysisStatus === "complete",
  );

  function applySearchResponse(response) {
    setProducts(response.products);
    setActiveSearch({
      query: response.query,
      location: response.location,
    });
    setIsMock(response.isMock);
    setFilter("all");
    setMessage(response.analysisMessage ?? "");
    setRequestState(response.status === "no_results" ? "empty" : "success");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedQuery = query.trim();
    const trimmedLocation = location.trim();

    if (!trimmedQuery) {
      setMessage("Please enter a product to search.");
      setRequestState("error");
      return;
    }

    if (!trimmedLocation) {
      setMessage("Please enter a shopping location.");
      setRequestState("error");
      return;
    }

    const requestSequence = latestRequestRef.current + 1;
    latestRequestRef.current = requestSequence;
    abortControllerRef.current?.abort();

    const cacheKey = buildSearchCacheKey(
      trimmedQuery,
      trimmedLocation,
      CLIENT_MODE,
      CLIENT_MODE === "mock" ? mockScenario : "live",
    );
    const cachedResponse = readCachedSearch(cacheKey);

    if (cachedResponse) {
      if (requestSequence === latestRequestRef.current) {
        applySearchResponse(cachedResponse);
      }
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setProducts([]);
    setFilter("all");
    setMessage("");
    setRequestState("loading");

    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: trimmedQuery,
          location: trimmedLocation,
          ...(CLIENT_MODE === "mock" ? { mockScenario } : {}),
        }),
        signal: controller.signal,
      });

      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error("The server returned an unreadable response.");
      }

      if (!response.ok) {
        throw new Error(
          payload?.error?.message ?? "Something went wrong. Please try again.",
        );
      }

      if (requestSequence !== latestRequestRef.current) {
        return;
      }

      writeCachedSearch(cacheKey, payload);
      applySearchResponse(payload);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        return;
      }

      if (requestSequence !== latestRequestRef.current) {
        return;
      }

      setProducts([]);
      setMessage(
        error instanceof TypeError
          ? "Unable to connect. Check your connection and try again."
          : error.message,
      );
      setRequestState("error");
    }
  }

  return (
    <>
      <header className="border-b border-[#dfe7df] bg-[#f6f8f3]/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <Link
            aria-label="LocalEco home"
            className="flex items-center gap-2.5 rounded-lg text-[#164e3e] focus:outline-none focus-visible:ring-3 focus-visible:ring-[#86c99b]"
            href="/"
          >
            <BrandMark className="h-9 w-9" />
            <span className="text-xl font-extrabold tracking-tight">LocalEco</span>
          </Link>
          <span className="hidden rounded-full border border-[#cfe1d3] bg-white px-3 py-1.5 text-xs font-semibold text-[#47705d] sm:inline-flex">
            Listing evidence, clearly explained
          </span>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-[#dfe7df] bg-[#eef5ec]">
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-[#cdebd3]/70 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-[#dbeee5]/70 blur-3xl"
        />
        <div className="relative mx-auto max-w-5xl px-5 py-14 text-center sm:px-8 sm:py-20">
          <div className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border border-[#bedcc5] bg-white/75 px-3 py-1.5 text-xs font-bold uppercase tracking-[0.15em] text-[#267341]">
            <BrandMark className="h-4 w-4" />
            Smarter sustainable shopping
          </div>
          <h1 className="mx-auto max-w-3xl text-4xl font-black leading-[1.08] tracking-[-0.035em] text-[#17332b] sm:text-6xl">
            Shop with more context,
            <span className="block text-[#19713c]">not more guesswork.</span>
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[#52665d] sm:text-lg">
            Search Google Shopping listings and see the sustainability evidence
            they actually provide, summarized by AI.
          </p>

          <form
            className="mx-auto mt-9 max-w-4xl rounded-3xl border border-[#d6e3d8] bg-white p-3 text-left shadow-[0_24px_70px_rgba(22,78,62,0.12)] sm:p-4"
            onSubmit={handleSubmit}
          >
            <div className="grid gap-3 md:grid-cols-[1fr_0.78fr_auto] md:items-end">
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#52665d]">
                  What are you looking for?
                </span>
                <span className="flex min-h-13 items-center gap-3 rounded-xl border border-[#d9e2da] bg-[#fbfcfa] px-4 transition focus-within:border-[#2e8250] focus-within:ring-3 focus-within:ring-[#bce6c8]">
                  <SearchIcon />
                  <input
                    className="min-w-0 flex-1 bg-transparent py-3 text-base text-[#17332b] outline-none placeholder:text-[#8b9a93]"
                    maxLength={120}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="e.g. bamboo toothbrush"
                    value={query}
                  />
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-[0.12em] text-[#52665d]">
                  Shopping location
                </span>
                <span className="flex min-h-13 items-center gap-3 rounded-xl border border-[#d9e2da] bg-[#fbfcfa] px-4 transition focus-within:border-[#2e8250] focus-within:ring-3 focus-within:ring-[#bce6c8]">
                  <LocationIcon />
                  <input
                    className="min-w-0 flex-1 bg-transparent py-3 text-base text-[#17332b] outline-none placeholder:text-[#8b9a93]"
                    list="location-suggestions"
                    maxLength={120}
                    onChange={(event) => setLocation(event.target.value)}
                    placeholder="City, state, country"
                    value={location}
                  />
                  <datalist id="location-suggestions">
                    <option value="Hyderabad, Telangana, India" />
                    <option value="Bengaluru, Karnataka, India" />
                    <option value="Mumbai, Maharashtra, India" />
                    <option value="Delhi, India" />
                    <option value="Chennai, Tamil Nadu, India" />
                  </datalist>
                </span>
              </label>

              <button
                className="inline-flex min-h-13 items-center justify-center gap-2 rounded-xl bg-[#164e3e] px-6 py-3.5 font-bold text-white shadow-sm transition hover:bg-[#0f3d30] focus:outline-none focus-visible:ring-3 focus-visible:ring-[#86c99b] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={requestState === "loading"}
                type="submit"
              >
                <SearchIcon />
                {requestState === "loading" ? "Searching..." : "Search"}
              </button>
            </div>
          </form>

          {CLIENT_MODE === "mock" ? (
            <details className="mx-auto mt-4 max-w-4xl rounded-2xl border border-[#d6e3d8] bg-white/70 px-4 py-3 text-left">
              <summary className="cursor-pointer text-sm font-bold text-[#315849] focus:outline-none focus-visible:ring-3 focus-visible:ring-[#86c99b]">
                Demo scenario controls
              </summary>
              <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,18rem)_1fr] sm:items-center">
                <label
                  className="text-xs font-bold uppercase tracking-[0.12em] text-[#52665d]"
                  htmlFor="mock-scenario"
                >
                  Scenario
                </label>
                <select
                  className="min-h-11 rounded-xl border border-[#cbd9ce] bg-white px-3 text-sm font-semibold text-[#17332b] outline-none focus:border-[#2e8250] focus:ring-3 focus:ring-[#bce6c8]"
                  id="mock-scenario"
                  onChange={(event) => setMockScenario(event.target.value)}
                  value={mockScenario}
                >
                  {MOCK_SCENARIOS.map((scenario) => (
                    <option key={scenario.value} value={scenario.value}>
                      {scenario.label}
                    </option>
                  ))}
                </select>
                <span aria-hidden="true" />
                <p className="text-xs leading-5 text-[#63766d]">
                  {
                    MOCK_SCENARIOS.find(
                      (scenario) => scenario.value === mockScenario,
                    ).description
                  }
                </p>
              </div>
            </details>
          ) : null}

          <p className="mt-4 text-xs leading-5 text-[#63766d]">
            Eco Evidence Scores are AI estimates based only on each shopping
            listing. They are not verified environmental-impact ratings or
            product certifications.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10 lg:py-14">
        <div aria-live="polite" className="sr-only" role="status">
          {requestState === "loading"
            ? "Searching and analyzing products..."
            : message}
        </div>

        {requestState === "idle" ? (
          <div className="mx-auto max-w-2xl py-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e2f2e5] text-[#237744]">
              <SearchIcon />
            </div>
            <h2 className="mt-5 text-2xl font-bold text-[#17332b]">
              Search everyday products
            </h2>
            <p className="mt-2 leading-7 text-[#63766d]">
              Compare listing-supported signals such as recycled content,
              reusable design, certified materials, and plastic-free packaging.
            </p>
          </div>
        ) : null}

        {requestState === "loading" ? (
          <>
            <div className="mb-6">
              <p className="text-sm font-bold text-[#19713c]">
                Searching and analyzing products...
              </p>
              <p className="mt-1 text-sm text-[#6b7d74]">
                Checking shopping listings and their sustainability evidence.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }, (_, index) => (
                <ProductSkeleton key={index} />
              ))}
            </div>
          </>
        ) : null}

        {requestState === "error" || requestState === "empty" ? (
          <div
            className="mx-auto max-w-2xl rounded-3xl border border-[#dce5dd] bg-white px-6 py-12 text-center shadow-[0_16px_50px_rgba(22,78,62,0.06)]"
            role={requestState === "error" ? "alert" : "status"}
          >
            <h2 className="text-2xl font-bold text-[#17332b]">
              {requestState === "empty"
                ? "No shopping results found"
                : "We could not complete that search"}
            </h2>
            <p className="mt-3 text-[#63766d]">
              {message ||
                "No shopping results found for this search. Try another product."}
            </p>
          </div>
        ) : null}

        {requestState === "success" ? (
          <>
            <div className="mb-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-2xl font-extrabold tracking-tight text-[#17332b] sm:text-3xl">
                    Shopping results
                  </h2>
                  {isMock ? (
                    <span className="rounded-full bg-[#e6f3ff] px-2.5 py-1 text-xs font-bold text-[#175985]">
                      Demo data
                    </span>
                  ) : (
                    <span className="rounded-full bg-[#dcfce7] px-2.5 py-1 text-xs font-bold text-[#166534]">
                      Live shopping data
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-[#63766d]">
                  {products.length} products for &ldquo;{activeSearch.query}&rdquo;
                  {" in "}
                  {activeSearch.location}
                </p>
                {message ? (
                  <p
                    className="mt-3 rounded-xl border border-[#f3d8a0] bg-[#fff8e8] px-3 py-2 text-sm font-medium text-[#7b5717]"
                    role="status"
                  >
                    {message}
                  </p>
                ) : null}
              </div>

              <div
                aria-label="Filter shopping results"
                className="inline-flex w-fit rounded-xl border border-[#d8e2da] bg-white p-1"
                role="group"
              >
                <button
                  aria-pressed={filter === "all"}
                  className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
                    filter === "all"
                      ? "bg-[#164e3e] text-white"
                      : "text-[#52665d] hover:bg-[#f0f5f0]"
                  }`}
                  onClick={() => setFilter("all")}
                  type="button"
                >
                  All Results
                </button>
                <button
                  aria-pressed={filter === "eco"}
                  className={`rounded-lg px-4 py-2 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-45 ${
                    filter === "eco"
                      ? "bg-[#164e3e] text-white"
                      : "text-[#52665d] hover:bg-[#f0f5f0]"
                  }`}
                  disabled={!hasAnalysis}
                  onClick={() => setFilter("eco")}
                  title={
                    hasAnalysis
                      ? undefined
                      : "Sustainability analysis is unavailable."
                  }
                  type="button"
                >
                  Eco 7+
                </button>
              </div>
            </div>

            {filteredProducts.length ? (
              <div className="grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-[#dce5dd] bg-white px-6 py-12 text-center">
                <h3 className="text-xl font-bold text-[#17332b]">
                  No Eco 7+ products in this search
                </h3>
                <p className="mt-2 text-[#63766d]">
                  No products have an Eco Evidence Score of 7 or higher.
                </p>
              </div>
            )}
          </>
        ) : null}
      </section>

      <footer className="mt-auto border-t border-[#dfe7df] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-6 text-sm text-[#63766d] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-10">
          <p className="font-semibold text-[#315849]">LocalEco</p>
          <p>Shopping results powered by SerpApi Google Shopping Light.</p>
        </div>
      </footer>
    </>
  );
}
