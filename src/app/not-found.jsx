import Link from "next/link";

import BrandMark from "@/components/BrandMark";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f8f3] px-5">
      <section className="w-full max-w-xl rounded-3xl border border-[#dce5dd] bg-white px-6 py-12 text-center shadow-[0_16px_50px_rgba(22,78,62,0.08)]">
        <BrandMark className="mx-auto h-14 w-14 text-[#237744]" />
        <p className="mt-5 text-sm font-bold uppercase tracking-[0.16em] text-[#267341]">
          404
        </p>
        <h1 className="mt-2 text-3xl font-extrabold text-[#17332b]">
          Page not found
        </h1>
        <p className="mt-3 leading-7 text-[#63766d]">
          The page you requested does not exist.
        </p>
        <Link
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#164e3e] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0f3d30] focus:outline-none focus-visible:ring-3 focus-visible:ring-[#86c99b] focus-visible:ring-offset-2"
          href="/"
        >
          Return to LocalEco
        </Link>
      </section>
    </main>
  );
}
