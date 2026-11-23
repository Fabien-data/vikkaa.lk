import { describe, it, expect, vi, beforeEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { agreementTemplates, assets, clients, documents, engagements, signatories } from '@/db/schema';

vi.mock('@/server/sms', () => ({ sendSms: async () => {} }));
vi.mock('@/server/email', () => ({ sendEmail: async () => ({}) }));
vi.mock('@/server/auth-guard', () => ({ requireStaff: async () => ({ userId: 'u', organizationId: 'org_vikkaa' }) }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

import {
  activeTemplate,
  approveTemplate,
  clauseProblems,
  ensureDraftTemplates,
  newVersion,
  renderClauses,
  saveDraftClauses,
  signingBlocker,
  DECIDE_MARKER,
} from '@/server/agreement-templates';
import { generateAgreementDraft } from '@/server/documents';
import { signWithPaperScan } from '@/server/agreement-signer';
import { applyPackage, savePackage } from '@/server/packages';
import { signingLink } from '@/app/console/studio/(staff)/engagements/[id]/signatory-actions';
import { requestCode } from '@/app/console/sign/[id]/actions';
import { signPath } from '@/lib/signed-url';

async function seed(over: Partial<typeof engagements.$inferInsert> = {}) {
  const [c] = await db.insert(clients).values({ type: 'private', name: 'Nimal', phone: `+9477${Math.floor(1e7 + Math.random() * 9e7)}` }).returning();
  const [e] = await db.insert(engagements).values({ clientId: c.id, type: 'single', stage: 'proposal', commissionRateBp: 300, exclusiveDays: 90, followOnMonths: 6, upfrontFeeCents: 7_500_000, ...over }).returning();
  await db.insert(assets).values({ engagementId: e.id, category: 'property', kind: 'house', title: 'House', slug: `h-${crypto.randomUUID()}`, district: 'Colombo', area: 'Nugegoda', askingPriceCents: 100 });
  const [s] = await db.insert(signatories).values({ engagementId: e.id, role: 'owner', name: 'Nimal', phone: '+94771234567' }).returning();
  return { e, s };
}

async function approvedSellerTemplate() {
  const { template } = await activeTemplate('seller_exclusive');
  await saveDraftClauses(
    template.id,
    template.clauses.map((c) => (c.includes(DECIDE_MARKER) ? c.replace(/\[TO DECIDE WITH THE LAWYER:[^\]]*\]/, 'The fee is not refundable.') : c)),
  );
  await approveTemplate(template.id, { lawyerName: 'A. Perera, AAL', reference: 'email 2026-12-10' });
  return template.id;
}

describe('the lawyer gate', () => {
  beforeEach(async () => {
    await ensureDraftTemplates();
  });

  it('starts with an unapproved draft for each kind of agreement', async () => {
    const rows = await db.select().from(agreementTemplates);
    expect(rows.map((r) => r.kind).sort()).toEqual(['founding', 'pilot', 'retainer', 'seller_exclusive']);
    expect(rows.every((r) => r.approvedAt === null)).toBe(true);
  });

  it('blocks every way to sign while the wording is unapproved', async () => {
    const { e, s } = await seed();
    const draft = await generateAgreementDraft(e.id);
    expect(draft.meta.legalApproved).toBe(false);
    expect(await signingBlocker(e.id)).toMatch(/not approved/);
    expect(await signingLink(s.id)).toEqual({ error: expect.stringMatching(/not approved/) });
    const url = new URL(`http://x${signPath(`/sign/${s.id}`, 3600)}`);
    expect(await requestCode(s.id, url.searchParams.get('exp')!, url.searchParams.get('sig')!)).toEqual({ error: expect.stringMatching(/not ready/) });
    await expect(signWithPaperScan(e.id, Buffer.from('%PDF-scan'), 'scan.pdf')).rejects.toThrow(/lawyer/);
  });

  it('allows a paper agreement the lawyer drafted, and records who', async () => {
    const { e } = await seed();
    await generateAgreementDraft(e.id);
    await signWithPaperScan(e.id, Buffer.from('%PDF-scan'), 'scan.pdf', 'A. Perera, AAL');
    const [scan] = await db.select().from(documents).where(eq(documents.type, 'agreement_scan'));
    expect(scan.meta.lawyerDraftedBy).toBe('A. Perera, AAL');
    expect((await db.select().from(engagements).where(eq(engagements.id, e.id)))[0].stage).toBe('signed');
  });

  it('cannot be approved while a clause is still undecided; approval needs a name and a reference', async () => {
    const { template } = await activeTemplate('seller_exclusive');
    await expect(approveTemplate(template.id, { lawyerName: 'A. Perera', reference: 'x' })).rejects.toThrow(/TO DECIDE/);
    await expect(approveTemplate(template.id, { lawyerName: '', reference: 'x' })).rejects.toThrow(/name/);
  });

  it('after approval a new draft is signable; approved wording is frozen and a new version starts unapproved', async () => {
    const id = await approvedSellerTemplate();
    const { e, s } = await seed();
    const draft = await generateAgreementDraft(e.id);
    expect(draft.meta.legalApproved).toBe(true);
    expect(await signingBlocker(e.id)).toBeNull();
    expect(await signingLink(s.id)).toMatchObject({ url: expect.stringContaining('/sign/') });

    await expect(saveDraftClauses(id, ['Changed'])).rejects.toThrow(/cannot be changed/);
    const v2 = await newVersion(id);
    expect([v2.version, v2.approvedAt]).toEqual([2, null]);
    expect((await activeTemplate('seller_exclusive')).template.id).toBe(id); // v1 stays in force until v2 is approved
  });

  it('a draft made before approval stays unsignable after approval', async () => {
    const { e } = await seed();
    await generateAgreementDraft(e.id);
    await approvedSellerTemplate();
    expect(await signingBlocker(e.id)).toMatch(/new draft/);
  });

  it('renders only the clauses that apply, with the terms filled in', () => {
    const clauses = ['Exclusive for {exclusiveDays} days.', '[if fee] Fee {upfrontFee} is credited.', '[if no fee] No fee.', '[if minimum] At least {commissionMin}.'];
    const terms = { commissionApplies: true, commissionRateBp: 300, commissionMinCents: 0, upfrontFeeCents: 0, adBudgetCents: 0, monthlyFeeCents: 0, exclusiveDays: 60, followOnMonths: 6, unitsPerMonth: null, client: { name: 'X' } };
    expect(renderClauses(clauses, terms)).toEqual(['Exclusive for 60 days.', 'No fee.']);
    expect(renderClauses(clauses, { ...terms, upfrontFeeCents: 7_500_000, commissionMinCents: 5_000_000 })).toEqual(['Exclusive for 60 days.', 'Fee Rs 75,000 is credited.', 'At least Rs 50,000.']);
    expect(clauseProblems(['[if fees] x {fee}'])).toEqual(['Unknown condition [if fees]', 'Unknown placeholder {fee}']);
  });

  it('a dealer retainer drafts its own wording without any car added yet', async () => {
    const [c] = await db.insert(clients).values({ type: 'dealer', name: 'Lanka Auto', phone: '+94112345678' }).returning();
    const [e] = await db.insert(engagements).values({ clientId: c.id, type: 'retainer', stage: 'proposal', commissionRateBp: 150, exclusiveDays: 90, followOnMonths: 6, monthlyFeeCents: 15_000_000, unitsPerMonth: 8 }).returning();
    const draft = await generateAgreementDraft(e.id);
    expect(draft.meta.kind).toBe('retainer');
    expect((draft.meta.clauses as string[]).some((c) => c.includes('up to 8 vehicles'))).toBe(true);
  });

  it('editing the terms after the approved draft blocks signing until a new draft is made', async () => {
    await approvedSellerTemplate();
    const { e } = await seed();
    await generateAgreementDraft(e.id);
    expect(await signingBlocker(e.id)).toBeNull();
    await db.update(engagements).set({ commissionRateBp: 250 }).where(eq(engagements.id, e.id));
    expect(await signingBlocker(e.id)).toMatch(/terms changed/);
    await generateAgreementDraft(e.id);
    expect(await signingBlocker(e.id)).toBeNull();
  });

  it('a paper signature locks the terms just like a digital one', async () => {
    const { e } = await seed();
    await generateAgreementDraft(e.id);
    await signWithPaperScan(e.id, Buffer.from('%PDF-scan'), 'scan.pdf', 'A. Perera, AAL');
    const pkg = await savePackage({ name: 'Std', segment: 'private', category: 'property', kind: 'upfront', priceCents: 1 });
    await expect(applyPackage(e.id, pkg.id)).rejects.toThrow(/locked/);
    await expect(generateAgreementDraft(e.id)).rejects.toThrow(/already signed/);
  });
});
