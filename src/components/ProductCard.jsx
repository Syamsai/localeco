"use client";

/* eslint-disable @next/next/no-img-element -- provider thumbnail hosts are dynamic */

import { useState } from "react";

import BrandMark from "@/components/BrandMark";

function scoreStyle(score) {
  if (score >= 8) {
    return {
      badge: "bg-[#dcfce7] text-[#166534] ring-[#bbf7d0]",
      label: "Strong listing evidence",
    };
  }

  if (score >= 5) {
    return {
      badge: "bg-[#fef3c7] text-[#92400e] ring-[#fde68a]",
      label: "Moderate listing evidence",
    };
  }

  return {
    badge: "bg-[#f1f5f2] text-[#4b6258] ring-[#dce5dd]",
    label: "Limited listing evidence",
  };
}

function StarIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 text-[#c57b10]"
      viewBox="0 0 20 20"
    >
      <path
        d="m10 1.7 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L10 1.7Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function ProductCard({ product }) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasAnalysis =
    product.analysisStatus === "complete" && product.ecoScore !== null;
  const score = hasAnalysis ? scoreStyle(product.ecoScore) : null;

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl border border-[#dce5dd] bg-white shadow-[0_16px_50px_rgba(22,78,62,0.06)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_rgba(22,78,62,0.12)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-[#eef3ee]">
        {product.thumbnail && !imageFailed ? (
          <img
            alt={product.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
            decoding="async"
            loading="lazy"
            onError={() => setImageFailed(true)}
            src={product.thumbnail}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-[#8aa096]">
            <BrandMark className="h-16 w-16" />
            <span className="sr-only">Product image unavailable</span>
          </div>
        )}
        {hasAnalysis ? (
          <div
            className={`absolute right-4 top-4 rounded-full px-3 py-1.5 text-sm font-bold shadow-sm ring-1 ${score.badge}`}
          >
            {product.ecoScore}/10
          </div>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-[#6c8077]">
          {product.source ?? "Merchant not listed"}
        </p>
        <h2 className="text-lg font-bold leading-6 text-[#17332b]">
          {product.title}
        </h2>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1">
          {product.price ? (
            <p className="text-2xl font-extrabold tracking-tight text-[#164e3e]">
              {product.price}
            </p>
          ) : null}
          {product.rating !== null ? (
            <div
              aria-label={`${product.rating} out of 5 stars${
                product.reviews !== null ? ` from ${product.reviews} reviews` : ""
              }`}
              className="flex items-center gap-1 text-sm text-[#52665d]"
            >
              <StarIcon />
              <span className="font-semibold">{product.rating}</span>
              {product.reviews !== null ? (
                <span>({product.reviews.toLocaleString("en-IN")})</span>
              ) : null}
            </div>
          ) : null}
        </div>

        {product.delivery ? (
          <p className="mt-2 text-sm text-[#5c6f67]">{product.delivery}</p>
        ) : null}

        <div className="my-5 border-t border-[#edf1ed]" />

        {hasAnalysis ? (
          <div className="flex-1">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#19713c]">
                Eco Evidence Score
              </p>
              <span className="text-right text-xs font-semibold text-[#52665d]">
                {score.label}
              </span>
            </div>
            <p className="text-sm leading-6 text-[#40574d]">{product.ecoReason}</p>
            {product.signals.length ? (
              <ul
                aria-label="Sustainability signals"
                className="mt-4 flex flex-wrap gap-2"
              >
                {product.signals.map((signal) => (
                  <li
                    className="rounded-full bg-[#eef9f0] px-2.5 py-1 text-xs font-semibold text-[#267341]"
                    key={signal}
                  >
                    {signal}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-xs font-medium text-[#71827a]">
                No supported sustainability signals found.
              </p>
            )}
          </div>
        ) : (
          <div className="flex-1 rounded-2xl bg-[#f5f7f5] p-4">
            <p className="text-sm font-semibold text-[#52665d]">
              Sustainability analysis unavailable
            </p>
            <p className="mt-1 text-sm leading-5 text-[#71827a]">
              You can still review this result on Google Shopping.
            </p>
          </div>
        )}

        <a
          className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#164e3e] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#0f3d30] focus:outline-none focus-visible:ring-3 focus-visible:ring-[#86c99b] focus-visible:ring-offset-2"
          href={product.productUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          View on Google Shopping
          <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 20 20">
            <path
              d="M7 5h8v8M15 5l-9 9"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
            />
          </svg>
        </a>
      </div>
    </article>
  );
}
