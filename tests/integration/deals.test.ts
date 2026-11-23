import { describe, it, expect, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets, buyers, clients, deals, documents, engagements, tasks } from '@/db/schema';

vi.mock('@/server/email', () => ({ sendEmail: vi.fn(async () => ({})) }));

import { agreeSale, completeSale, fallThrough, followOnWatch, generateClaimPack, addLedgerEntry, adBalance } from '@/server/deals';
import { appendEvidence } from '@/server/evidence-log';
import { recordAdDeposit } from '@/server/documents';
import { expiryWatch, completionReminders } from '@/server/deal-sweeps';
import { readPrivate } from '@/server/storage';

const SIGNED = new Date('2026-08-01T05:00:00Z');
const ENDS = new Date('2026-10-30T05:00:00Z');

async function seed(opts: { feePaid?: boolean; assets?: number } = {}) {
  const [c] = await db.insert(clients).values({ type: 'private', name: 'Nimal', phone: `+9477${Math.floor(1e7 + Math.random() * 9e7)}` }).returning();
  const [e] = await db
    .insert(engagements)
    .values({ clientId: c.id, type: 'batch', stage: 'signed', commissionRateBp: 300, exclusiveDays: 90, followOnMonths: 6, upfrontFeeCents: 7_500_000, signedAt: SIGNED, endsAt: ENDS })
    .returning();
  const list = [];
  for (let i = 0; i < (opts.assets ?? 1); i++) {
    const [a] = await db
      .insert(assets)
      .values({ engagementId: e.id, category: 'property', kind: 'land', title: `Plot ${i + 1}`, slug: `p-${crypto.randomUUID()}`, district: 'Gampaha', area: 'Kadawatha', askingPriceCents: 1_000_000_000, status: 'live', publishedAt: SIGNED })
      .returning();
    list.push(a);
  }
  if (opts.feePaid !== false) {
    await db.insert(documents).values({ engagementId: e.id, type: 'invoice', storageKey: 'k', sha256: 'x'.repeat(64), amountCents: 7_500_000, totalCents: 7_500_000, paidAt: SIGNED });
  }
  const [b] = await db.insert(buyers).values({ phone: `+9471${Math.floor(1e7 + Math.random() * 9e7)}`, name: 'Ruwan' }).returning();
  return { c, e, assets: list, buyer: b };
}

describe('deals and commission', () => {
  it('a sale in the exclusive period raises a commission invoice with the fee credited, and goes under offer', async () => {
    const { assets: [a], buyer } = await seed();
    await appendEvidence({ assetId: a.id, buyerId: buyer.id, type: 'contact', channel: 'web_form', happenedAt: new Date('2026-09-01T05:00:00Z') });
    const { deal, commission, invoice } = await agreeSale({ assetId: a.id, buyerId: buyer.id, priceCents: 1_000_000_000, agreedAt: new Date('2026-09-20T05:00:00Z'), completionDueOn: '2026-10-15' });
    expect(commission).toMatchObject({ basis: 'exclusive', grossCents: 30_000_000, creditCents: 7_500_000, totalCents: 22_500_000 });
    expect(invoice).toMatchObject({ type: 'commission_invoice', totalCents: 22_500_000, dueOn: '2026-10-15', key: `commission:${deal.id}` });
    expect((await db.select().from(assets).where(eq(assets.id, a.id)))[0].status).toBe('under_offer');
  });

  it('the fee credit is used once across a batch', async () => {
    const { assets: [a, b] } = await seed({ assets: 2 });
    const first = await agreeSale({ assetId: a.id, priceCents: 1_000_000_000, agreedAt: new Date('2026-09-20T05:00:00Z') });
    const second = await agreeSale({ assetId: b.id, priceCents: 1_000_000_000, agreedAt: new Date('2026-09-25T05:00:00Z') });
    expect([first.commission.creditCents, second.commission.creditCents]).toEqual([7_500_000, 0]);
  });

  it('after expiry: introduced buyer means follow-on commission (no credit); anyone else, none', async () => {
    const { assets: [a], buyer } = await seed();
    await db.update(assets).set({ status: 'expired' }).where(eq(assets.id, a.id));
    await appendEvidence({ assetId: a.id, buyerId: buyer.id, type: 'viewing', channel: 'in_person', happenedAt: new Date('2026-09-01T05:00:00Z') });
    const r = await agreeSale({ assetId: a.id, buyerId: buyer.id, priceCents: 1_000_000_000, agreedAt: new Date('2026-11-20T05:00:00Z') });
    expect([r.commission.basis, r.commission.creditCents, r.commission.grossCents]).toEqual(['follow_on', 0, 30_000_000]);
    await fallThrough(r.deal.id, 'Buyer pulled out');

    const [stranger] = await db.insert(buyers).values({ phone: '+94719990000' }).returning();
    const none = await agreeSale({ assetId: a.id, buyerId: stranger.id, priceCents: 1_000_000_000, agreedAt: new Date('2026-11-21T05:00:00Z') });
    expect([none.commission.basis, none.invoice]).toEqual(['none', null]);
  });

  it('falling through cancels the commission invoice and puts the listing back live', async () => {
    const { assets: [a] } = await seed();
    const { deal, invoice } = await agreeSale({ assetId: a.id, priceCents: 1_000_000_000, agreedAt: new Date('2026-09-20T05:00:00Z') });
    await expect(agreeSale({ assetId: a.id, priceCents: 1, agreedAt: new Date('2026-09-21T05:00:00Z') })).rejects.toThrow(/already has an agreed sale/);
    await fallThrough(deal.id, 'Loan refused');
    const [inv] = await db.select().from(documents).where(eq(documents.id, invoice!.id));
    expect(inv.voidReason).toMatch(/Loan refused/);
    expect((await db.select().from(assets).where(eq(assets.id, a.id)))[0].status).toBe('live');
  });

  it('completing a sale marks the listing sold at the agreed price', async () => {
    const { assets: [a] } = await seed();
    const { deal } = await agreeSale({ assetId: a.id, priceCents: 990_000_000, agreedAt: new Date('2026-09-20T05:00:00Z') });
    await completeSale(deal.id, new Date('2026-10-15T05:00:00Z'));
    const [row] = await db.select().from(assets).where(eq(assets.id, a.id));
    expect([row.status, row.soldPriceCents]).toEqual(['sold', 990_000_000]);
    expect((await db.select().from(deals))[0].status).toBe('completed');
  });

  it('the follow-on watch lists introduced buyers, and a claim pack prints from the evidence log', async () => {
    const { e, assets: [a], buyer } = await seed();
    await appendEvidence({ assetId: a.id, buyerId: buyer.id, type: 'contact', channel: 'phone', happenedAt: new Date('2026-09-01T05:00:00Z') });
    const watch = await followOnWatch(new Date('2026-11-20T05:00:00Z'));
    expect(watch).toHaveLength(1);
    expect(watch[0].buyers.map((b) => b.id)).toEqual([buyer.id]);
    const pack = await generateClaimPack(e.id, buyer.id);
    expect(pack.type).toBe('claim_pack');
    expect(pack.meta).toMatchObject({ entries: 1, chainOk: true });
    expect((await readPrivate(pack.storageKey)).subarray(0, 4).toString()).toBe('%PDF');
  });

  it('the ad balance is deposits minus spend and refunds', async () => {
    const { e } = await seed();
    await recordAdDeposit(e.id, 5_000_000, 'TX', new Date());
    await addLedgerEntry({ engagementId: e.id, kind: 'spend', amountCents: 1_200_000, occurredOn: '2026-09-02', channel: 'Facebook' });
    await addLedgerEntry({ engagementId: e.id, kind: 'refund', amountCents: 300_000, occurredOn: '2026-11-01' });
    expect(await adBalance(e.id)).toEqual({ depositCents: 5_000_000, spentCents: 1_200_000, refundedCents: 300_000, balanceCents: 3_500_000 });
  });
});

describe('deal safety', () => {
  it('the database allows one open sale per asset', async () => {
    const { assets: [a] } = await seed();
    await agreeSale({ assetId: a.id, priceCents: 1_000_000_000, agreedAt: new Date('2026-09-20T05:00:00Z') });
    await expect(db.insert(deals).values({ assetId: a.id, agreedPriceCents: 1, agreedAt: new Date(), basis: 'none' })).rejects.toThrow();
  });

  it('a bad completion date is refused before anything is saved', async () => {
    const { assets: [a] } = await seed();
    await expect(agreeSale({ assetId: a.id, priceCents: 1, agreedAt: new Date('2026-09-20T05:00:00Z'), completionDueOn: 'next week' })).rejects.toThrow(/completion date/);
    expect(await db.select().from(deals)).toHaveLength(0);
  });
});

describe('deal sweeps', () => {
  it('ends live listings when the period is over and warns about follow-on windows closing', async () => {
    const { assets: [a] } = await seed();
    await expiryWatch(new Date('2026-11-01T05:00:00Z'));
    expect((await db.select().from(assets).where(eq(assets.id, a.id)))[0].status).toBe('expired');
    await expiryWatch(new Date('2027-04-20T05:00:00Z')); // follow-on ends 2027-04-30
    await expiryWatch(new Date('2027-04-21T05:00:00Z'));
    expect((await db.select().from(tasks)).filter((t) => /follow-on period ends/.test(t.title))).toHaveLength(1);
  });

  it('two weeks before the end: one task', async () => {
    await seed();
    await expiryWatch(new Date('2026-10-20T05:00:00Z'));
    await expiryWatch(new Date('2026-10-21T05:00:00Z'));
    expect((await db.select().from(tasks)).filter((t) => /agreement ends/.test(t.title))).toHaveLength(1);
  });

  it('reminds three days before completion, once', async () => {
    const { assets: [a] } = await seed();
    await agreeSale({ assetId: a.id, priceCents: 1_000_000_000, agreedAt: new Date('2026-09-20T05:00:00Z'), completionDueOn: '2026-10-15' });
    await completionReminders(new Date('2026-10-11T05:00:00Z'));
    expect(await db.select().from(tasks)).toHaveLength(0);
    await completionReminders(new Date('2026-10-12T05:00:00Z'));
    await completionReminders(new Date('2026-10-13T05:00:00Z'));
    expect(await db.select().from(tasks)).toHaveLength(1);
  });
});
