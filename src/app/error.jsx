"use client";

import { useEffect } from "react";

import BrandMark from "@/components/BrandMark";

export default function ErrorPage({ error, reset }) {
  useEffect(() => {
    console.error("Unhandled LocalEco page error", error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8f3] px-5">
      <section
        className="w-full max-w-xl rounded-3xl border border-[#dce5dd] bg-white px-6 py-12 text-center shadow-[0_16px_50px_rgba(22,78,62,0.08)]"
        role="alert"
      >
        <BrandMark className="mx-auto h-14 w-14 text-[#237744]" />
        <h1 className="mt-5 text-3xl font-extrabold text-[#17332b]">
          Something went wrong
        </h1>
        <p className="mt-3 leading-7 text-[#63766d]">
          LocalEco could not display this page. Please try again.
        </p>
        <button
          className="mt-6 min-h-11 rounded-xl bg-[#164e3e] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0f3d30] focus:outline-none focus-visible:ring-3 focus-visible:ring-[#86c99b] focus-visible:ring-offset-2"
          onClick={reset}
          type="button"
        >
          Try again
        </button>
      </section>
    </main>
  );
}
