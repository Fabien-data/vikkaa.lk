import { describe, it, expect, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { prospects, tasks, messages, consents } from '@/db/schema';

vi.mock('@/server/email', () => ({ sendEmail: vi.fn(async () => ({})) }));

import { getPitch, recordPitchView, requestCall, recordInbound } from '@/server/pitch';
import { quickAdd } from '@/server/prospects';
import { canSend } from '@/server/consent';
import { savePackage } from '@/server/packages';
import { addBooking, weekView } from '@/server/bookings';

const T0 = new Date('2026-11-23T05:00:00Z');
const load = async (id: string) => (await db.select().from(prospects).where(eq(prospects.id, id)))[0];

describe('pitch pages', () => {
  it('shows the segment offers, with founding terms kept separate', async () => {
    await savePackage({ name: 'Dealer 8', segment: 'dealer', category: 'vehicle', kind: 'retainer', priceCents: 15_000_000, unitsPerMonth: 8 });
    await savePackage({ name: 'Dealer founding', segment: 'dealer', category: 'vehicle', kind: 'retainer', priceCents: 0, unitsPerMonth: 4, founding: true });
    await savePackage({ name: 'Private', segment: 'private', category: 'property', kind: 'upfront', priceCents: 7_500_000 });
    const p = await quickAdd({ name: 'Lanka Auto', segment: 'dealer', phone: '0771234567' }, T0);
    const pitch = await getPitch(p.pitchToken);
    expect(pitch?.offers.map((o) => o.name)).toEqual(['Dealer 8']);
    expect(pitch?.founding?.name).toBe('Dealer founding');
    expect(await getPitch('../../etc')).toBeNull();
    expect(await getPitch('0'.repeat(32))).toBeNull();
  });

  it('counts real views only, and the first view creates exactly one call task', async () => {
    const p = await quickAdd({ name: 'Lanka Auto', segment: 'dealer', phone: '0771234567' }, T0);
    expect(await recordPitchView(p.pitchToken, { preview: true })).toBeNull();
    expect(await recordPitchView(p.pitchToken, { userAgent: 'WhatsApp/2.23.20.0 A' })).toBeNull();
    expect(await recordPitchView(p.pitchToken, { userAgent: 'facebookexternalhit/1.1' })).toBeNull();
    const first = await recordPitchView(p.pitchToken, { userAgent: 'Mozilla/5.0 (iPhone)' }, T0);
    const second = await recordPitchView(p.pitchToken, { userAgent: 'Mozilla/5.0 (iPhone)' }, T0);
    expect([first?.first, second?.first]).toEqual([true, false]);
    const row = await load(p.id);
    expect(row.pitchViews).toBe(2);
    expect(row.pitchFirstViewedAt?.getTime()).toBe(T0.getTime());
    const t = await db.select().from(tasks).where(eq(tasks.subjectId, p.id));
    expect(t).toHaveLength(1);
    expect(t[0].title).toMatch(/opened their pitch page: follow up as agreed/);
    // A view is interest, not permission to message them.
    expect(await canSend('+94771234567', 'outreach')).toBe(false);
  });

  it('a call request marks the prospect replied, stops the cadence and creates a task', async () => {
    const p = await quickAdd({ name: 'Dev Co', segment: 'developer', email: 'a@dev.lk' }, T0);
    await requestCall(p.pitchToken, { phone: '0775555555', note: 'After 4pm' }, T0);
    const row = await load(p.id);
    expect([row.status, row.nextActionAt, row.phone]).toEqual(['replied', null, '+94775555555']);
    const [m] = await db.select().from(messages).where(eq(messages.subjectId, p.id));
    expect([m.direction, m.outcome, m.body]).toEqual(['in', 'call_requested', 'After 4pm']);
    expect(await db.select().from(tasks).where(eq(tasks.subjectId, p.id))).toHaveLength(1);
    expect(await canSend('+94775555555', 'outreach')).toBe(true);
  });
});

describe('inbound website leads', () => {
  it('a new dealer joins the list as replied with its campaign tags; a repeat does not duplicate', async () => {
    const p = await recordInbound({ segment: 'dealer', name: 'Galle Road Motors', phone: '0776666666', utm: { utm_source: 'facebook' }, updatesConsent: true }, T0);
    expect([p.source, p.utm]).toEqual(['website', { utm_source: 'facebook' }]);
    expect((await load(p.id)).status).toBe('replied');
    const again = await recordInbound({ segment: 'dealer', name: 'Galle Road Motors (again)', phone: '+94776666666' }, T0);
    expect(again.id).toBe(p.id);
    expect(await db.select().from(prospects)).toHaveLength(1);
    const rows = await db.select().from(consents);
    expect(rows.filter((c) => c.purpose === 'marketing').map((c) => [c.contact, c.granted])).toEqual([['+94776666666', true]]);
    expect(rows.filter((c) => c.purpose === 'outreach').every((c) => c.source === 'inbound_request' && c.contact === '+94776666666')).toBe(true);
  });
});

describe('pitch visits in the calendar', () => {
  it('a prospect booking shows with the prospect name', async () => {
    const p = await quickAdd({ name: 'Lanka Auto', segment: 'dealer', phone: '0771234567' }, T0);
    await addBooking({ prospectId: p.id, type: 'pitch', startsAt: new Date('2026-11-24T05:00:00Z'), durationMinutes: 30, area: 'Nugegoda', notes: null });
    const days = await weekView(new Date('2026-11-23T00:00:00Z'));
    const b = days.flatMap((d) => d.areas.flatMap((a) => a.bookings))[0];
    expect([b.clientName, b.type, b.prospectId]).toEqual(['Lanka Auto', 'pitch', p.id]);
  });

  it('a booking needs an engagement or a prospect', async () => {
    await expect(addBooking({ type: 'call', startsAt: T0, durationMinutes: 30, area: 'X', notes: null })).rejects.toThrow();
  });
});
