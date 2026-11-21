// shortcut: single-process memory limiter; move to Postgres/Redis when running more than one app instance.
const hits = new Map<string, number[]>();

/** Sliding-window limiter. Returns true when the request is allowed. */
export function rateLimit(key: string, limit: number, windowMs: number, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}
