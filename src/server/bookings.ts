import { and, asc, eq, getTableColumns, gte, lt, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { assets, bookings, clients, engagements, type Booking } from '@/db/schema';
import type { AssetKind } from '@/lib/enums';

export type BookingInput = Pick<typeof bookings.$inferInsert, 'engagementId' | 'assetId' | 'type' | 'startsAt' | 'durationMinutes' | 'area' | 'notes'>;
export type CalendarBooking = Booking & { clientName: string; assetTitle: string | null; assetKind: AssetKind | null };
export type CalendarDay = { day: string; areas: Array<{ area: string; bookings: CalendarBooking[] }> };

const DAY_MS = 86_400_000;
const SRI_LANKA_OFFSET_MS = 330 * 60_000;

/** The Sri Lanka calendar date (YYYY-MM-DD) an instant falls on. */
export const sriLankaDay = (d: Date) => new Date(d.getTime() + SRI_LANKA_OFFSET_MS).toISOString().slice(0, 10);
const sriLankaMidnight = (day: string) => new Date(`${day}T00:00:00+05:30`);

/** Other bookings whose time overlaps this one. A warning only: overlapping bookings still save. */
export async function findOverlaps(b: Pick<Booking, 'startsAt' | 'durationMinutes'> & { id?: string }): Promise<Booking[]> {
  const end = new Date(b.startsAt.getTime() + b.durationMinutes * 60_000);
  return db
    .select()
    .from(bookings)
    .where(
      and(
        lt(bookings.startsAt, end),
        sql`${bookings.startsAt} + ${bookings.durationMinutes} * interval '1 minute' > ${b.startsAt.toISOString()}::timestamptz`,
        b.id ? ne(bookings.id, b.id) : undefined,
      ),
    )
    .orderBy(asc(bookings.startsAt));
}

export async function addBooking(input: BookingInput): Promise<{ booking: Booking; overlaps: Booking[] }> {
  const [booking] = await db
    .insert(bookings)
    .values({ ...input, area: input.area.trim() })
    .returning();
  return { booking, overlaps: await findOverlaps(booking) };
}

/** Seven Sri Lanka days from `weekStart`'s date; each day's bookings grouped by area, so one trip covers one area. */
export async function weekView(weekStart: Date): Promise<CalendarDay[]> {
  const start = sriLankaMidnight(sriLankaDay(weekStart));
  const end = new Date(start.getTime() + 7 * DAY_MS);
  const rows = await db
    .select({ ...getTableColumns(bookings), clientName: clients.name, assetTitle: assets.title, assetKind: assets.kind })
    .from(bookings)
    .innerJoin(engagements, eq(bookings.engagementId, engagements.id))
    .innerJoin(clients, eq(engagements.clientId, clients.id))
    .leftJoin(assets, eq(bookings.assetId, assets.id))
    .where(and(gte(bookings.startsAt, start), lt(bookings.startsAt, end)))
    .orderBy(asc(bookings.startsAt));

  const days: CalendarDay[] = Array.from({ length: 7 }, (_, i) => ({ day: sriLankaDay(new Date(start.getTime() + i * DAY_MS)), areas: [] }));
  for (const b of rows) {
    const day = days.find((d) => d.day === sriLankaDay(b.startsAt))!;
    // "Nugegoda" and "nugegoda " are the same trip.
    let group = day.areas.find((g) => g.area.toLowerCase() === b.area.trim().toLowerCase());
    if (!group) day.areas.push((group = { area: b.area.trim(), bookings: [] }));
    group.bookings.push(b);
  }
  return days;
}
