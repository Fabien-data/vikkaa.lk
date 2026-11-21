import { describe, it, expect, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { clients, engagements, assets, comparables, numberSequences } from '@/db/schema';
import { config } from '@/lib/config';
import { nextDocumentNumber } from '@/server/document-numbers';
import {
  generateProposal,
  generateAgreementDraft,
  issueInvoice,
  recordAdDeposit,
  recordPayment,
} from '@/server/documents';
import { readPrivate, sha256 } from '@/server/storage';
import { markSigned } from '@/server/pipeline';

async function seed(over: Partial<typeof engagements.$inferInsert> = {}) {
  const [c] = await db.insert(clients).values({ type: 'private', name: 'Nimal Perera', phone: `+9477${Math.floor(1e7 + Math.random() * 9e7)}` }).returning();
  const [e] = await db
    .insert(engagements)
    .values({
      clientId: c.id, type: 'single', commissionRateBp: 300, exclusiveDays: 90, followOnMonths: 6,
      upfrontFeeCents: 10_000_000, adBudgetCents: 5_000_000, contentPlan: 'Photos, drone, film, 3 reels', marketNotes: 'Strong demand',
      ...over,
    })
    .returning();
  const [a] = await db
    .insert(assets)
    .values({ engagementId: e.id, category: 'property', kind: 'house', title: '4-bed house, Nugegoda', slug: `h-${crypto.randomUUID()}`, district: 'Colombo', area: 'Nugegoda', askingPriceCents: 6_850_000_000, recommendedPriceCents: 6_500_000_000 })
    .returning();
  await db.insert(comparables).values({ engagementId: e.id, description: '3-bed, same lane', priceCents: 6_200_000_000, source: 'LPW', observedOn: '2026-11-01' });
  return { e, a };
}

describe('document numbers', () => {
  it('are sequential per prefix and year', async () => {
    const at = new Date('2026-11-21T10:00:00Z');
    expect(await nextDocumentNumber('VKA', at)).toBe('VKA-2026-001');
    expect(await nextDocumentNumber('VKA', at)).toBe('VKA-2026-002');
    expect(await nextDocumentNumber('RCP', at)).toBe('RCP-2026-001');
  });
  it('reset in a new calendar year', async () => {
    await nextDocumentNumber('VKA', new Date('2026-12-31T10:00:00Z'));
    expect(await nextDocumentNumber('VKA', new Date('2027-01-01T10:00:00Z'))).toBe('VKA-2027-001');
  });
  it('grow past 999', async () => {
    await db.insert(numberSequences).values({ key: 'VKA-2026', last: 999 });
    expect(await nextDocumentNumber('VKA', new Date('2026-06-01T00:00:00Z'))).toBe('VKA-2026-1000');
  });
  it('concurrent calls get distinct numbers', async () => {
    const at = new Date('2026-03-01T00:00:00Z');
    const all = await Promise.all(Array.from({ length: 5 }, () => nextDocumentNumber('VKA', at)));
    expect(new Set(all).size).toBe(5);
  });
});

describe('documents', () => {
  afterEach(() => {
    config.vatRateBp = 0;
  });

  it('invoice without VAT', async () => {
    const { e } = await seed();
    const inv = await issueInvoice(e.id);
    expect(inv.number).toMatch(/^VKA-\d{4}-001$/);
    expect([inv.amountCents, inv.vatCents, inv.totalCents]).toEqual([10_000_000, 0, 10_000_000]);
  });

  it('invoice with 18% VAT', async () => {
    config.vatRateBp = 1800;
    const { e } = await seed();
    const inv = await issueInvoice(e.id);
    expect([inv.vatCents, inv.totalCents]).toEqual([1_800_000, 11_800_000]);
  });

  it('proposal lists missing fields', async () => {
    const { e, a } = await seed({ contentPlan: null });
    await db.update(assets).set({ recommendedPriceCents: null }).where(eq(assets.id, a.id));
    await expect(generateProposal(e.id)).rejects.toThrow(/recommended price.*content plan/);
  });

  it('stored PDF hash matches and is a real PDF', async () => {
    const { e } = await seed();
    for (const doc of [await generateProposal(e.id), await generateAgreementDraft(e.id), await issueInvoice(e.id)]) {
      const bytes = await readPrivate(doc.storageKey);
      expect(bytes.subarray(0, 4).toString()).toBe('%PDF');
      expect(sha256(bytes)).toBe(doc.sha256);
    }
  });

  it('partial payment does not mark paid', async () => {
    const { e } = await seed();
    const inv = await issueInvoice(e.id);
    await recordPayment(inv.id, 4_000_000, 'bank_transfer', 'TX1', new Date());
    const [fresh] = await db.select().from(engagements).where(eq(engagements.id, e.id));
    expect(fresh.paidAt).toBeNull();
  });

  it('paid invoice + full deposit + signed moves assets to production', async () => {
    const { e, a } = await seed({ stage: 'proposal' });
    await markSigned(e.id, new Date());
    const inv = await issueInvoice(e.id);
    await recordPayment(inv.id, 10_000_000, 'bank_transfer', 'TX1', new Date());
    expect((await db.select().from(assets).where(eq(assets.id, a.id)))[0].status).toBe('draft');
    const rcp = await recordAdDeposit(e.id, 5_000_000, 'TX2', new Date());
    expect(rcp.number).toMatch(/^RCP-\d{4}-001$/);
    expect(rcp.paidAt).toBeInstanceOf(Date);
    expect((await db.select().from(assets).where(eq(assets.id, a.id)))[0].status).toBe('production');
  });

  it('no ad budget: invoice alone marks paid', async () => {
    const { e } = await seed({ adBudgetCents: 0 });
    const inv = await issueInvoice(e.id);
    await recordPayment(inv.id, 10_000_000, 'cash', null, new Date());
    const [fresh] = await db.select().from(engagements).where(eq(engagements.id, e.id));
    expect(fresh.paidAt).toBeInstanceOf(Date);
  });
});
