/** Shown while a Studio page loads its data. */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="grid gap-4">
      <span className="sr-only">Loading…</span>
      <div className="h-8 w-48 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="h-32 animate-pulse rounded-md border bg-background motion-reduce:animate-none" />
      <div className="h-48 animate-pulse rounded-md border bg-background motion-reduce:animate-none" />
    </div>
  );
}
