import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { buyers, consents } from '@/db/schema';
import { canSend, contactKey, isDoNotContact, recordConsent, recordOutreachBasis, withdrawAll } from '@/server/consent';

describe('consent ledger', () => {
  it('normalises contacts', () => {
    expect(contactKey('077 123 4567')).toBe('+94771234567');
    expect(contactKey(' Jane@Example.COM ')).toBe('jane@example.com');
    expect(contactKey('')).toBeNull();
  });

  it('transactional always goes; outreach needs a recorded basis and stops when they ask', async () => {
    expect(await canSend('+94771234567', 'transactional')).toBe(true);
    expect(await canSend('+94771234567', 'outreach')).toBe(false);
    await recordOutreachBasis('077 123 4567', 'introduction', { note: 'Introduced by Sunil', at: new Date('2026-11-01') });
    expect(await canSend('+94771234567', 'outreach')).toBe(true);
    expect(await canSend('+94771234567', 'marketing')).toBe(false);
    await withdrawAll('0771234567', 'test');
    expect(await canSend('+94771234567', 'outreach')).toBe(false);
    expect(await canSend('+94771234567', 'transactional')).toBe(true);
    expect(await isDoNotContact('077 123 4567')).toBe(true);
  });

  it('Circle and marketing need a grant newer than any withdrawal', async () => {
    const c = 'jane@example.com';
    expect(await canSend(c, 'circle')).toBe(false);
    await recordConsent({ contact: c, purpose: 'circle', granted: true, source: 'test', at: new Date('2026-11-01') });
    expect(await canSend(c, 'circle')).toBe(true);
    expect(await canSend(c, 'marketing')).toBe(false);
    await withdrawAll(c, 'unsubscribe');
    expect(await canSend(c, 'circle')).toBe(false);
    await recordConsent({ contact: c, purpose: 'circle', granted: true, source: 'rejoined' });
    expect(await canSend(c, 'circle')).toBe(true);
  });

  it('keeps the buyer Circle columns in sync, including a re-join after withdrawing', async () => {
    const [b] = await db.insert(buyers).values({ phone: '+94770000001', name: 'Kasun' }).returning();
    await recordConsent({ contact: b.phone, purpose: 'circle', granted: true, source: 'test' });
    let [row] = await db.select().from(buyers).where(eq(buyers.id, b.id));
    expect(row.circleConsentAt).toBeInstanceOf(Date);
    await withdrawAll(b.phone, 'unsubscribe');
    [row] = await db.select().from(buyers).where(eq(buyers.id, b.id));
    expect(row.circleWithdrawnAt).toBeInstanceOf(Date);
    await recordConsent({ contact: b.phone, purpose: 'circle', granted: true, source: 'rejoined' });
    [row] = await db.select().from(buyers).where(eq(buyers.id, b.id));
    expect(row.circleWithdrawnAt).toBeNull();
    expect(await db.select().from(consents)).toHaveLength(3);
  });
});
