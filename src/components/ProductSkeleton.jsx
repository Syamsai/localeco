export default function ProductSkeleton() {
  return (
    <article
      aria-hidden="true"
      className="overflow-hidden rounded-3xl border border-[#dce5dd] bg-white shadow-[0_16px_50px_rgba(22,78,62,0.06)]"
    >
      <div className="skeleton-shimmer aspect-[4/3] bg-[#e6ece6]" />
      <div className="space-y-4 p-5">
        <div className="skeleton-shimmer h-4 w-24 rounded bg-[#e6ece6]" />
        <div className="space-y-2">
          <div className="skeleton-shimmer h-5 w-full rounded bg-[#e6ece6]" />
          <div className="skeleton-shimmer h-5 w-4/5 rounded bg-[#e6ece6]" />
        </div>
        <div className="skeleton-shimmer h-7 w-28 rounded bg-[#e6ece6]" />
        <div className="skeleton-shimmer h-24 rounded-2xl bg-[#eef3ee]" />
        <div className="skeleton-shimmer h-11 rounded-xl bg-[#e6ece6]" />
      </div>
    </article>
  );
}
