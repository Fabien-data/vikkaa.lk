/** Shown while a Studio page loads its data: the page's shape, shimmering. */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="grid gap-5">
      <span className="sr-only">Loading…</span>
      <div className="skeleton h-11 w-64" />
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-28" />
        ))}
      </div>
      <div className="skeleton h-48" />
      <div className="skeleton h-64" />
    </div>
  );
}
