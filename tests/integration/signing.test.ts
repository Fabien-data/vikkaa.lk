import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { clients, engagements, assets, signatories, documents } from '@/db/schema';

const sms: { to: string; message: string }[] = [];
const emails: { to: unknown; text: string }[] = [];
vi.mock('@/server/sms', () => ({
  sendSms: async (to: string, message: string) => {
    sms.push({ to, message });
  },
}));
vi.mock('@/server/email', () => ({
  sendEmail: async (i: { to: unknown; text: string }) => {
    emails.push(i);
  },
}));
const requireStaff = vi.fn();
vi.mock('@/server/auth-guard', () => ({ requireStaff: () => requireStaff() }));
vi.mock('next/cache', () => ({ revalidatePath: () => {} }));

import { sendSigningCode, verifySigningCode, OtpTooSoonError } from '@/server/otp';
import { signAgreement, signWithPaperScan } from '@/server/agreement-signer';
import { generateAgreementDraft } from '@/server/documents';
import { saveSignatory } from '@/app/console/studio/(staff)/engagements/[id]/signatory-actions';
import { saveEngagement } from '@/app/console/studio/(staff)/engagements/actions';

const lastCode = () => (sms.at(-1)?.message ?? emails.at(-1)?.text ?? '').match(/\b(\d{6})\b/)![1];
const wrongCode = (code: string) => (code === '000000' ? '111111' : '000000');

async function seed(people: { phone: string; email?: string }[] = [{ phone: '+94771234567' }]) {
  const [c] = await db.insert(clients).values({ type: 'private', name: 'Nimal', phone: '+94770000123' }).returning();
  const [e] = await db
    .insert(engagements)
    .values({ clientId: c.id, type: 'single', stage: 'proposal', commissionRateBp: 300, exclusiveDays: 90, followOnMonths: 6 })
    .returning();
  await db.insert(assets).values({
    engagementId: e.id, category: 'property', kind: 'house', title: 'House', slug: `h-${crypto.randomUUID()}`, district: 'Colombo', area: 'Nugegoda', askingPriceCents: 100,
  });
  await generateAgreementDraft(e.id);
  const rows = await db
    .insert(signatories)
    .values(
      people.map((p, i) => ({
        engagementId: e.id,
        role: i === 0 ? ('owner' as const) : ('co_owner' as const),
        name: `Owner ${i}`,
        phone: p.phone,
        email: p.email,
      })),
    )
    .returning();
  return { e, s: rows };
}

const sign = (id: string, code: string, idNumber = '123456789V') =>
  signAgreement({ signatoryId: id, name: 'Nimal Perera', idNumber, code, ip: '203.0.113.1', userAgent: 'test' });

function form(o: Record<string, string>) {
  const fd = new FormData();
  Object.entries(o).forEach(([k, v]) => fd.set(k, v));
  return fd;
}

describe('signing', () => {
  beforeEach(() => {
    sms.length = 0;
    emails.length = 0;
    requireStaff.mockResolvedValue({ userId: 'u', organizationId: 'org_vikkaa' });
  });
  afterEach(() => vi.useRealTimers());

  it('Sri Lankan number gets an SMS', async () => {
    const { s } = await seed();
    expect(await sendSigningCode(s[0].id)).toBe('sms');
    expect(sms[0].to).toBe('+94771234567');
    expect(sms[0].message).toMatch(/^Your Vikkaa signing code is \d{6}\. It expires in 10 minutes\.$/);
    expect(emails).toHaveLength(0);
  });

  it('overseas number gets an email, no SMS', async () => {
    const { s } = await seed([{ phone: '+447911123456', email: 'owner@example.com' }]);
    expect(await sendSigningCode(s[0].id)).toBe('email');
    expect(emails[0].to).toBe('owner@example.com');
    expect(sms).toHaveLength(0);
  });

  it('overseas signatory without email cannot be saved', async () => {
    const { e } = await seed();
    const r = await saveSignatory(undefined, form({ engagementId: e.id, role: 'co_owner', name: 'Abroad', phone: '+447911123456', email: '' }));
    expect(r).toEqual({ error: 'Signatories abroad need an email for their code.' });
  });

  it('power-of-attorney holder needs the POA document', async () => {
    const { e } = await seed();
    const r = await saveSignatory(undefined, form({ engagementId: e.id, role: 'poa_holder', name: 'POA', phone: '0771112223' }));
    expect(r).toEqual({ error: 'Upload the power of attorney document.' });
  });

  it('resend within 60 seconds throws OtpTooSoonError', async () => {
    const { s } = await seed();
    await sendSigningCode(s[0].id);
    await expect(sendSigningCode(s[0].id)).rejects.toBeInstanceOf(OtpTooSoonError);
  });

  it('five wrong codes lock the code until a resend', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { s } = await seed();
    await sendSigningCode(s[0].id);
    const code = lastCode();
    for (let i = 0; i < 5; i++) expect(await verifySigningCode(s[0].id, wrongCode(code))).toBe(false);
    expect(await verifySigningCode(s[0].id, code)).toBe(false);
    vi.setSystemTime(Date.now() + 61_000);
    await sendSigningCode(s[0].id);
    expect(await verifySigningCode(s[0].id, lastCode())).toBe(true);
  });

  it('expired code is rejected', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { s } = await seed();
    await sendSigningCode(s[0].id);
    const code = lastCode();
    vi.setSystemTime(Date.now() + 11 * 60_000);
    expect(await verifySigningCode(s[0].id, code)).toBe(false);
  });

  it('invalid id number is rejected', async () => {
    const { s } = await seed();
    await sendSigningCode(s[0].id);
    await expect(sign(s[0].id, lastCode(), '1234')).rejects.toThrow(/ID number/);
  });

  it('last signature creates the signed agreement and marks the engagement signed', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const { e, s } = await seed([{ phone: '+94771234567' }, { phone: '+94772223334' }]);
    await sendSigningCode(s[0].id);
    expect(await sign(s[0].id, lastCode())).toEqual({ allSigned: false });
    expect((await db.select().from(engagements).where(eq(engagements.id, e.id)))[0].stage).toBe('proposal');

    await sendSigningCode(s[1].id);
    expect(await sign(s[1].id, lastCode(), '200012345678')).toEqual({ allSigned: true });
    const [fresh] = await db.select().from(engagements).where(eq(engagements.id, e.id));
    expect(fresh.stage).toBe('signed');
    expect(fresh.endsAt!.getTime() - fresh.signedAt!.getTime()).toBe(90 * 86_400_000);
    const signed = await db.select().from(documents).where(eq(documents.type, 'agreement_signed'));
    expect(signed).toHaveLength(1);
    expect(signed[0].sha256).toMatch(/^[a-f0-9]{64}$/);
    const [row] = await db.select().from(signatories).where(eq(signatories.id, s[1].id));
    expect([row.signedName, row.signedIdNumber, row.signedPhone, row.signedIp]).toEqual([
      'Nimal Perera',
      '200012345678',
      '+94772223334',
      '203.0.113.1',
    ]);
  });

  it('a second sign attempt after signing throws "already signed"', async () => {
    const { s } = await seed();
    await sendSigningCode(s[0].id);
    await sign(s[0].id, lastCode());
    await expect(sign(s[0].id, '123456')).rejects.toThrow(/already signed/);
  });

  it('parallel wrong guesses cannot beat the 5-attempt limit', async () => {
    const { s } = await seed();
    await sendSigningCode(s[0].id);
    const code = lastCode();
    await Promise.all(Array.from({ length: 10 }, () => verifySigningCode(s[0].id, wrongCode(code))));
    expect(await verifySigningCode(s[0].id, code)).toBe(false);
  });

  it('a correct code signs only once even when submitted twice at the same time', async () => {
    const { s } = await seed();
    await sendSigningCode(s[0].id);
    const code = lastCode();
    const results = await Promise.allSettled([sign(s[0].id, code), sign(s[0].id, code)]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    expect(await db.$count(documents, eq(documents.type, 'agreement_signed'))).toBe(1);
  });

  it('records which draft each signatory signed, and builds the signed copy from that draft', async () => {
    const { e, s } = await seed([{ phone: '+94771234567' }, { phone: '+94772223334' }]);
    const [draft] = await db.select().from(documents).where(eq(documents.type, 'agreement'));
    await sendSigningCode(s[0].id);
    await sign(s[0].id, lastCode());
    const [first] = await db.select().from(signatories).where(eq(signatories.id, s[0].id));
    expect([first.signedDocumentId, first.signedDocumentSha256]).toEqual([draft.id, draft.sha256]);

    await db.update(assets).set({ title: 'Edited after signing' }).where(eq(assets.engagementId, e.id));
    await sendSigningCode(s[1].id);
    await sign(s[1].id, lastCode(), '200012345678');
    const [signed] = await db.select().from(documents).where(eq(documents.type, 'agreement_signed'));
    expect(signed.meta).toMatchObject({ draftId: draft.id, draftSha256: draft.sha256, assetTitles: ['House'] });
  });

  it('no new draft can be generated once anyone has signed', async () => {
    const { e, s } = await seed([{ phone: '+94771234567' }, { phone: '+94772223334' }]);
    await sendSigningCode(s[0].id);
    await sign(s[0].id, lastCode());
    await expect(generateAgreementDraft(e.id)).rejects.toThrow(/already signed/);
  });

  it('refuses to sign a different draft from the one a co-owner signed', async () => {
    const { e, s } = await seed([{ phone: '+94771234567' }, { phone: '+94772223334' }]);
    await sendSigningCode(s[0].id);
    await sign(s[0].id, lastCode());
    const [draft] = await db.select().from(documents).where(eq(documents.type, 'agreement'));
    await db.insert(documents).values({ engagementId: e.id, type: 'agreement', storageKey: draft.storageKey, sha256: 'f'.repeat(64), issuedAt: new Date(Date.now() + 1000) });
    await sendSigningCode(s[1].id);
    await expect(sign(s[1].id, lastCode(), '200012345678')).rejects.toThrow(/changed/);
  });

  it('engagement terms are locked once anyone has signed', async () => {
    const { e, s } = await seed([{ phone: '+94771234567' }, { phone: '+94772223334' }]);
    await sendSigningCode(s[0].id);
    await sign(s[0].id, lastCode());
    const r = await saveEngagement(
      undefined,
      form({ id: e.id, upfrontFeeRupees: '1', adBudgetRupees: '0', commissionPercent: '1', exclusiveDays: '30', followOnMonths: '1' }),
    );
    expect(r?.error).toMatch(/locked/);
  });

  it('a second paper scan does not move the signing dates', async () => {
    const { e } = await seed();
    await signWithPaperScan(e.id, Buffer.from('%PDF-scan'), 'signed.pdf');
    const [first] = await db.select().from(engagements).where(eq(engagements.id, e.id));
    await expect(signWithPaperScan(e.id, Buffer.from('%PDF-scan2'), 'again.pdf')).rejects.toThrow();
    const [after] = await db.select().from(engagements).where(eq(engagements.id, e.id));
    expect(after.signedAt!.getTime()).toBe(first.signedAt!.getTime());
  });

  it('paper scan marks the engagement signed', async () => {
    const { e } = await seed();
    await signWithPaperScan(e.id, Buffer.from('%PDF-scan'), 'signed.pdf');
    const [fresh] = await db.select().from(engagements).where(eq(engagements.id, e.id));
    expect(fresh.stage).toBe('signed');
    expect(await db.$count(documents, eq(documents.type, 'agreement_scan'))).toBe(1);
  });
});
