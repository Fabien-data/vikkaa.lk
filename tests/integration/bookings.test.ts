import { describe, it, expect, vi } from 'vitest';
import { db } from '@/db';
import { clients, engagements, assets, bookings } from '@/db/schema';
import { addBooking, weekView } from '@/server/bookings';
import { SHOT_LISTS } from '@/lib/shot-lists';
import { ASSET_KINDS } from '@/lib/enums';

vi.mock('@/server/auth-guard', () => ({ requireStaff: async () => ({ userId: 'u1', organizationId: 'org_vikkaa' }) }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));
const { saveBooking } = await import('@/app/console/studio/(staff)/calendar/actions');
const form = (o: Record<string, string>) => {
  const fd = new FormData();
  Object.entries(o).forEach(([k, v]) => fd.set(k, v));
  return fd;
};

async function seed() {
  const [c] = await db.insert(clients).values({ type: 'private', name: 'Perera', phone: `+9477${Math.floor(1e7 + Math.random() * 9e7)}` }).returning();
  const [e] = await db.insert(engagements).values({ clientId: c.id, type: 'single', commissionRateBp: 300, exclusiveDays: 90, followOnMonths: 6 }).returning();
  const [a] = await db
    .insert(assets)
    .values({ engagementId: e.id, category: 'property', kind: 'house', title: 'House', slug: `h-${crypto.randomUUID()}`, district: 'Colombo', area: 'Nugegoda', askingPriceCents: 100 })
    .returning();
  return { e, a };
}
// Sri Lanka wall-clock time → instant.
const sl = (s: string) => new Date(`${s}:00+05:30`);

describe('bookings', () => {
  it('week view groups same-day bookings by area', async () => {
    const { e, a } = await seed();
    await addBooking({ engagementId: e.id, assetId: a.id, type: 'shoot', startsAt: sl('2026-12-02T09:00'), durationMinutes: 120, area: 'Nugegoda' });
    await addBooking({ engagementId: e.id, type: 'visit', startsAt: sl('2026-12-02T14:00'), durationMinutes: 60, area: 'Kotte' });
    await addBooking({ engagementId: e.id, type: 'visit', startsAt: sl('2026-12-02T16:00'), durationMinutes: 60, area: 'Nugegoda' });
    // 00:30 Sri Lanka time on Thursday is still Wednesday evening in UTC: it must land on Thursday.
    await addBooking({ engagementId: e.id, type: 'visit', startsAt: sl('2026-12-03T00:30'), durationMinutes: 30, area: 'Kotte' });
    await addBooking({ engagementId: e.id, type: 'visit', startsAt: sl('2026-12-08T10:00'), durationMinutes: 60, area: 'Kotte' }); // next week

    const week = await weekView(sl('2026-11-30T00:00'));
    expect(week.map((d) => d.day)).toEqual(['2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04', '2026-12-05', '2026-12-06']);
    const wed = week[2];
    expect(wed.areas.map((g) => g.area)).toEqual(['Nugegoda', 'Kotte']); // in order of each area's first booking
    expect(wed.areas[0].bookings.map((b) => b.type)).toEqual(['shoot', 'visit']);
    expect(wed.areas[0].bookings[0].clientName).toBe('Perera');
    expect(wed.areas[0].bookings[0].assetKind).toBe('house');
    expect(week[3].areas.map((g) => g.area)).toEqual(['Kotte']);
    expect(week.flatMap((d) => d.areas).flatMap((g) => g.bookings)).toHaveLength(4);
  });

  it('shot list matches asset kind', () => {
    for (const kind of ASSET_KINDS) expect(SHOT_LISTS[kind].length).toBeGreaterThan(0);
    expect(SHOT_LISTS.house.join(' ')).toMatch(/bedroom/i);
    expect(SHOT_LISTS.land.join(' ')).toMatch(/boundar/i);
    expect(SHOT_LISTS.land.join(' ')).not.toMatch(/bedroom/i);
    expect(SHOT_LISTS.car.join(' ')).toMatch(/odometer/i);
    expect(SHOT_LISTS.suv).toBe(SHOT_LISTS.car);
  });

  it('overlap is reported but saved', async () => {
    const { e } = await seed();
    const first = await addBooking({ engagementId: e.id, type: 'shoot', startsAt: sl('2026-12-02T09:00'), durationMinutes: 120, area: 'Nugegoda' });
    expect(first.overlaps).toEqual([]);

    const clash = await addBooking({ engagementId: e.id, type: 'visit', startsAt: sl('2026-12-02T10:30'), durationMinutes: 60, area: 'Kotte' });
    expect(clash.overlaps.map((b) => b.id)).toEqual([first.booking.id]);

    // Starting exactly when the shoot ends is not an overlap.
    const after = await addBooking({ engagementId: e.id, type: 'visit', startsAt: sl('2026-12-02T11:00'), durationMinutes: 30, area: 'Kotte' });
    expect(after.overlaps.map((b) => b.id)).toEqual([clash.booking.id]);

    expect(await db.select().from(bookings)).toHaveLength(3);
  });

  it('booking form takes the area from the asset, reads Sri Lanka time, and warns about overlaps', async () => {
    const { e, a } = await seed();
    const base = { engagementId: e.id, assetId: a.id, type: 'shoot', durationMinutes: '120', area: '', notes: '' };
    expect(await saveBooking(undefined, form({ ...base, startsAt: '2026-12-02T09:00' }))).toEqual({ ok: true });
    const [saved] = await db.select().from(bookings);
    expect(saved.area).toBe('Nugegoda');
    expect(saved.startsAt.toISOString()).toBe('2026-12-02T03:30:00.000Z');

    const clash = await saveBooking(undefined, form({ ...base, type: 'visit', durationMinutes: '60', startsAt: '2026-12-02T10:00' }));
    expect(clash?.ok).toBe(true);
    expect(clash?.warning).toMatch(/overlaps: shoot in Nugegoda on 2026-12-02 at 09:00/);
  });

  it('booking form rejects a missing time, a missing area, and an asset from another engagement', async () => {
    const { e } = await seed();
    const other = await seed();
    const base = { engagementId: e.id, type: 'visit', durationMinutes: '60', area: 'Kotte', startsAt: '2026-12-02T09:00' };
    expect((await saveBooking(undefined, form({ ...base, startsAt: '' })))?.error).toMatch(/date and time/);
    expect((await saveBooking(undefined, form({ ...base, area: '' })))?.error).toMatch(/Area/);
    expect((await saveBooking(undefined, form({ ...base, assetId: other.a.id })))?.error).toMatch(/not part of this engagement/);
    expect(await db.select().from(bookings)).toHaveLength(0);
  });
});
