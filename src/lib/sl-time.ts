/** Sri Lanka is UTC+05:30 all year (no daylight saving); the server runs in UTC. */
export const SRI_LANKA_OFFSET_MS = 330 * 60_000;
export const DAY_MS = 86_400_000;

/** The Sri Lanka calendar date (YYYY-MM-DD) an instant falls on. */
export const sriLankaDay = (d: Date) => new Date(d.getTime() + SRI_LANKA_OFFSET_MS).toISOString().slice(0, 10);

/** Midnight at the start of a Sri Lanka calendar date, as an instant. */
export const sriLankaMidnight = (day: string) => new Date(`${day}T00:00:00+05:30`);

/** The hour (0–23) on a Sri Lanka wall clock. */
export const sriLankaHour = (d: Date) => new Date(d.getTime() + SRI_LANKA_OFFSET_MS).getUTCHours();

/** The Sri Lanka calendar year an instant falls in. */
export const sriLankaYear = (d: Date) => Number(sriLankaDay(d).slice(0, 4));

/** Monday 00:00 Sri Lanka time of the week containing `d`. */
export function sriLankaWeekStart(d: Date): Date {
  const midnight = sriLankaMidnight(sriLankaDay(d));
  const weekday = new Date(midnight.getTime() + SRI_LANKA_OFFSET_MS).getUTCDay(); // 0 = Sunday
  return new Date(midnight.getTime() - ((weekday + 6) % 7) * DAY_MS);
}

/** Whole days from now until a YYYY-MM-DD Sri Lanka date (negative once passed). */
export const daysUntil = (day: string, now: Date) => Math.ceil((sriLankaMidnight(day).getTime() - sriLankaMidnight(sriLankaDay(now)).getTime()) / DAY_MS);
