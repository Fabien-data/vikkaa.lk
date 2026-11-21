import { describe, it, expect, vi, beforeEach } from 'vitest';
import { asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { clients, engagements, assets, buyers, enquiries, evidenceEntries } from '@/db/schema';

const sendEmail = vi.fn(async () => {});
vi.mock('@/server/email', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...(a as [])) }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-forwarded-for': `198.51.100.${Math.floor(Math.random() * 250)}` }) }));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
  notFound: () => {
    throw new Error('NOT_FOUND');
  },
}));

import { recordEnquiry } from '@/server/enquiry-intake';
import { submitEnquiry } from '@/app/site/enquire-action';
import { submitBrief } from '@/app/site/buy/actions';

async function asset(status: 'live' | 'draft' = 'live') {
  const [c] = await db.insert(clients).values({ type: 'private', name: 'N', phone: `+9477${Math.floor(1e7 + Math.random() * 9e7)}` }).returning();
  const [e] = await db.insert(engagements).values({ clientId: c.id, type: 'single', commissionRateBp: 300, exclusiveDays: 90, followOnMonths: 6 }).returning();
  const [a] = await db
    .insert(assets)
    .values({
      engagementId: e.id, category: 'property', kind: 'house', title: 'House', slug: `house-${crypto.randomUUID().slice(0, 8)}`,
      district: 'Colombo', area: 'Nugegoda', askingPriceCents: 1, status, publishedAt: status === 'live' ? new Date(Date.now() - 60_000) : null,
    })
    .returning();
  return a;
}

function form(o: Record<string, string>) {
  const fd = new FormData();
  Object.entries(o).forEach(([k, v]) => fd.set(k, v));
  return fd;
}

const enquiry = { name: 'Kamal', phone: '0771234567', email: '', message: 'Can I view on Saturday?', privacy: 'on', website: '' };

describe('enquiries', () => {
  beforeEach(() => sendEmail.mockClear());

  it('first enquiry logs first_contact and emails staff', async () => {
    const a = await asset();
    const r = await recordEnquiry(a.id, { name: 'Kamal', phone: '+94771234567', message: 'Hi' });
    expect(r.type).toBe('first_contact');
    const [e] = await db.select().from(evidenceEntries);
    expect([e.type, e.channel, e.data]).toEqual(['first_contact', 'web_form', { enquiryId: r.enquiryId }]);
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ subject: 'New enquiry: House' }));
  });

  it('second enquiry from the same phone in another format is contact for the same buyer', async () => {
    const a = await asset();
    expect(await submitEnquiry(a.slug, undefined, form(enquiry))).toEqual({ ok: true });
    expect(await submitEnquiry(a.slug, undefined, form({ ...enquiry, phone: '+94 77 123 4567' }))).toEqual({ ok: true });
    expect(await db.$count(buyers)).toBe(1);
    const types = (await db.select().from(evidenceEntries).orderBy(asc(evidenceEntries.seq))).map((e) => e.type);
    expect(types).toEqual(['first_contact', 'contact']);
    expect(await db.$count(enquiries)).toBe(2);
  });

  it('enquiry on a draft asset is not found', async () => {
    const a = await asset('draft');
    await expect(submitEnquiry(a.slug, undefined, form(enquiry))).rejects.toThrow('NOT_FOUND');
  });

  it('privacy checkbox is required', async () => {
    const a = await asset();
    const r = await submitEnquiry(a.slug, undefined, form({ ...enquiry, privacy: '' }));
    expect(r?.error).toMatch(/privacy/i);
    expect(await db.$count(buyers)).toBe(0);
  });

  it('rejects an invalid phone', async () => {
    const a = await asset();
    expect((await submitEnquiry(a.slug, undefined, form({ ...enquiry, phone: '123' })))?.error).toBe('Enter a valid phone number.');
  });

  it('records Vikkaa Circle consent once', async () => {
    const a = await asset();
    await submitEnquiry(a.slug, undefined, form({ ...enquiry, circle: 'on' }));
    const [first] = await db.select().from(buyers);
    await new Promise((r) => setTimeout(r, 5));
    await submitEnquiry(a.slug, undefined, form({ ...enquiry, circle: 'on' }));
    const [again] = await db.select().from(buyers);
    expect(first.circleConsentAt).toBeInstanceOf(Date);
    expect(again.circleConsentAt!.getTime()).toBe(first.circleConsentAt!.getTime());
  });

  it('honeypot saves nothing but reports success', async () => {
    const a = await asset();
    expect(await submitEnquiry(a.slug, undefined, form({ ...enquiry, website: 'spam' }))).toEqual({ ok: true });
    expect(await db.$count(buyers)).toBe(0);
  });

  it('buyer brief creates a buyer without evidence', async () => {
    const fd = form({ name: 'Ruwan', phone: '0719998887', email: 'r@x.lk', budgetMinRupees: '20,000,000', budgetMaxRupees: '35,000,000', areas: 'Maharagama, Kottawa', timeline: '3-6m', financing: 'loan', privacy: 'on', website: '' });
    fd.append('kinds', 'house');
    fd.append('kinds', 'land');
    await expect(submitBrief(undefined, fd)).rejects.toThrow('REDIRECT:/buy/thanks');
    const [b] = await db.select().from(buyers).where(eq(buyers.phone, '+94719998887'));
    expect([b.budgetMinCents, b.budgetMaxCents, b.kinds, b.source]).toEqual([2_000_000_000, 3_500_000_000, ['house', 'land'], 'buyer_brief']);
    expect(b.privacyAcceptedAt).toBeInstanceOf(Date);
    expect(await db.$count(evidenceEntries)).toBe(0);
  });
});
