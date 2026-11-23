import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets, clients, documents, engagements } from '@/db/schema';
import { issueRetainerInvoice, voidInvoice, openInvoices } from '@/server/billing';
import { recordPayment, recordAdDeposit, syncEngagementPaid } from '@/server/documents';
import { nextDocumentNumber } from '@/server/document-numbers';

async function retainer(over: Partial<typeof engagements.$inferInsert> = {}) {
  const [c] = await db.insert(clients).values({ type: 'dealer', name: 'Lanka Auto', phone: `+9411${Math.floor(1e6 + Math.random() * 9e6)}`, email: 'o@la.lk' }).returning();
  const [e] = await db
    .insert(engagements)
    .values({ clientId: c.id, type: 'retainer', stage: 'signed', commissionRateBp: 150, exclusiveDays: 90, followOnMonths: 6, monthlyFeeCents: 15_000_000, unitsPerMonth: 8, billingDay: 5, signedAt: new Date('2026-11-10T05:00:00Z'), ...over })
    .returning();
  return e;
}

describe('retainer billing', () => {
  it('issues one invoice per month, however often it is asked', async () => {
    const e = await retainer();
    const now = new Date('2026-12-05T03:00:00Z');
    const a = await issueRetainerInvoice(e.id, '2026-12', now);
    const b = await issueRetainerInvoice(e.id, '2026-12', now);
    expect([a.created, b.created]).toEqual([true, false]);
    expect(b.doc.id).toBe(a.doc.id);
    expect(a.doc).toMatchObject({ type: 'retainer_invoice', totalCents: 15_000_000, dueOn: '2026-12-12', key: `retainer:${e.id}:2026-12` });
    expect(a.doc.number).toMatch(/^VKA-2026-\d{3}$/);
    expect(await db.select().from(documents)).toHaveLength(1);
  });

  it('refuses months before signing, unsigned engagements and bad months', async () => {
    const e = await retainer();
    await expect(issueRetainerInvoice(e.id, '2026-10')).rejects.toThrow(/before the agreement/);
    await expect(issueRetainerInvoice(e.id, '2026-13')).rejects.toThrow(/month like/);
    const unsigned = await retainer({ signedAt: null, stage: 'proposal' });
    await expect(issueRetainerInvoice(unsigned.id, '2026-12')).rejects.toThrow(/signed/);
  });

  it('counts listings added that month', async () => {
    const e = await retainer();
    await db.insert(assets).values({ engagementId: e.id, category: 'vehicle', kind: 'car', title: 'Prius', slug: `p-${crypto.randomUUID()}`, district: 'Colombo', area: 'Nugegoda', askingPriceCents: 1, createdAt: new Date('2026-12-02T05:00:00Z') });
    await db.insert(assets).values({ engagementId: e.id, category: 'vehicle', kind: 'car', title: 'Next month', slug: `n-${crypto.randomUUID()}`, district: 'Colombo', area: 'Nugegoda', askingPriceCents: 1, createdAt: new Date('2027-01-02T05:00:00Z') });
    const { doc } = await issueRetainerInvoice(e.id, '2026-12', new Date('2026-12-05T03:00:00Z'));
    expect(doc.meta.unitsUsed).toBe(1);
  });

  it('paying the first retainer invoice marks the engagement paid and starts production', async () => {
    const e = await retainer();
    const [a] = await db.insert(assets).values({ engagementId: e.id, category: 'vehicle', kind: 'car', title: 'Prius', slug: `p-${crypto.randomUUID()}`, district: 'Colombo', area: 'Nugegoda', askingPriceCents: 1 }).returning();
    const { doc } = await issueRetainerInvoice(e.id, '2026-12', new Date('2026-12-05T03:00:00Z'));
    await recordPayment(doc.id, 15_000_000, 'bank_transfer', 'TX', new Date('2026-12-06T03:00:00Z'));
    expect((await db.select().from(engagements).where(eq(engagements.id, e.id)))[0].paidAt).toBeInstanceOf(Date);
    expect((await db.select().from(assets).where(eq(assets.id, a.id)))[0].status).toBe('production');
  });

  it('a cancelled invoice keeps its number but takes no payments; a paid one cannot be cancelled', async () => {
    const e = await retainer();
    const { doc } = await issueRetainerInvoice(e.id, '2026-12', new Date('2026-12-05T03:00:00Z'));
    await voidInvoice(doc.id, 'Wrong month');
    await expect(recordPayment(doc.id, 100, 'cash', null, new Date())).rejects.toThrow(/cancelled/);
    expect(await openInvoices()).toHaveLength(0);
    const { doc: jan } = await issueRetainerInvoice(e.id, '2027-01', new Date('2027-01-05T03:00:00Z'));
    await recordPayment(jan.id, 15_000_000, 'cash', null, new Date());
    await expect(voidInvoice(jan.id, 'x')).rejects.toThrow(/paid invoice/);
  });
});

describe('paid rules', () => {
  it('nothing to pay at all: paid only once signed', async () => {
    const [c] = await db.insert(clients).values({ type: 'private', name: 'Founding', phone: '+94770001111' }).returning();
    const [e] = await db.insert(engagements).values({ clientId: c.id, type: 'single', stage: 'proposal', commissionRateBp: 300, exclusiveDays: 90, followOnMonths: 6, foundingTerms: true }).returning();
    await syncEngagementPaid(e.id, new Date());
    expect((await db.select().from(engagements).where(eq(engagements.id, e.id)))[0].paidAt).toBeNull();
    await db.update(engagements).set({ stage: 'signed', signedAt: new Date() }).where(eq(engagements.id, e.id));
    await syncEngagementPaid(e.id, new Date());
    expect((await db.select().from(engagements).where(eq(engagements.id, e.id)))[0].paidAt).toBeInstanceOf(Date);
  });

  it('a deposit alone is enough when there is no fee', async () => {
    const [c] = await db.insert(clients).values({ type: 'private', name: 'Deposit only', phone: '+94770002222' }).returning();
    const [e] = await db.insert(engagements).values({ clientId: c.id, type: 'single', commissionRateBp: 300, exclusiveDays: 90, followOnMonths: 6, adBudgetCents: 5_000_000 }).returning();
    await recordAdDeposit(e.id, 5_000_000, 'TX', new Date());
    expect((await db.select().from(engagements).where(eq(engagements.id, e.id)))[0].paidAt).toBeInstanceOf(Date);
  });
});

describe('document numbers', () => {
  it('follow the Sri Lanka calendar year', async () => {
    expect(await nextDocumentNumber('VKA', new Date('2026-12-31T19:00:00Z'))).toBe('VKA-2027-001'); // 00:30 on 1 Jan in Colombo
  });
});
