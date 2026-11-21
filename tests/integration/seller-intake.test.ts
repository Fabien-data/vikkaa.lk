import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/db';
import { clients, engagements, assets, areaPrices } from '@/db/schema';

const sendEmail = vi.fn();
vi.mock('@/server/email', () => ({ sendEmail: (...a: unknown[]) => sendEmail(...a) }));
vi.mock('next/headers', () => ({ headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.9' }) }));
vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    throw new Error(`REDIRECT:${to}`);
  },
}));

import { submitSellerIntake, sellerIntakeSchema } from '@/server/seller-intake';
import { submitSell } from '@/app/site/sell/actions';

const base = {
  name: 'Nimal Perera',
  phone: '0771234567',
  email: '',
  clientType: 'private',
  category: 'property',
  kind: 'house',
  district: 'Colombo',
  area: 'Nugegoda',
  askingPriceRupees: '68,500,000',
  timeline: '0-3m',
  documents: 'clean',
  ownersAgree: 'yes',
  exclusiveOk: 'yes',
  bedrooms: '4',
  website: '',
};

const parse = (over: Record<string, string> = {}) => sellerIntakeSchema.safeParse({ ...base, ...over });

describe('seller intake', () => {
  beforeEach(() => sendEmail.mockReset());

  it('creates client, intake engagement, draft asset and fit score; emails staff', async () => {
    await db.insert(areaPrices).values({ kind: 'house', area: 'Nugegoda', lowCents: 6_000_000_000, highCents: 7_000_000_000, source: 'x' });
    const parsed = parse();
    expect(parsed.success).toBe(true);
    const { engagementId } = await submitSellerIntake(parsed.data!);

    const e = await db.query.engagements.findFirst({ where: (t, { eq }) => eq(t.id, engagementId), with: { assets: true, client: true } });
    expect(e!.stage).toBe('intake');
    expect(e!.fitScore).toBe(100);
    expect(e!.commissionRateBp).toBe(300);
    expect(e!.exclusiveDays).toBe(90);
    expect(e!.client.phone).toBe('+94771234567');
    expect(e!.assets).toHaveLength(1);
    expect(e!.assets[0].status).toBe('draft');
    expect(e!.assets[0].title).toBe('4-bed house, Nugegoda');
    expect(e!.assets[0].slug).toMatch(/^4-bed-house-nugegoda-[a-z0-9]{6}$/);
    expect(e!.assets[0].askingPriceCents).toBe(6_850_000_000);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: ['staff@vikkaa.test'], subject: 'New seller intake: 4-bed house, Nugegoda (fit 100)' }),
    );
  });

  it('same phone in another format reuses the client', async () => {
    await submitSellerIntake(parse().data!);
    await submitSellerIntake(parse({ phone: '+94 77 123 4567' }).data!);
    expect(await db.$count(clients)).toBe(1);
    expect(await db.$count(engagements)).toBe(2);
  });

  it('rejects kind that does not match category', () => {
    const r = parse({ category: 'vehicle', kind: 'house' });
    expect(r.success).toBe(false);
    expect(r.error!.issues.some((i) => i.path[0] === 'kind')).toBe(true);
  });

  it('rejects invalid phone with message', () => {
    const r = parse({ phone: '12345' });
    expect(r.success).toBe(false);
    expect(r.error!.issues.find((i) => i.path[0] === 'phone')!.message).toBe('Enter a valid phone number');
  });

  it('titles vehicles and land from their details', async () => {
    const car = await submitSellerIntake(
      parse({ category: 'vehicle', kind: 'car', make: 'Toyota', model: 'Aqua', year: '2017', bedrooms: '' }).data!,
    );
    const land = await submitSellerIntake(
      parse({ phone: '0712345678', kind: 'land', landPerches: '20', area: 'Kottawa', bedrooms: '' }).data!,
    );
    const titles = (await db.select({ t: assets.title, e: assets.engagementId }).from(assets)).map((r) => r.t).sort();
    expect(titles).toEqual(['20 perch land, Kottawa', '2017 Toyota Aqua']);
    expect(car.engagementId).not.toBe(land.engagementId);
  });

  it('honeypot saves nothing', async () => {
    const fd = new FormData();
    Object.entries({ ...base, website: 'http://spam' }).forEach(([k, v]) => fd.set(k, v));
    await expect(submitSell(undefined, fd)).rejects.toThrow('REDIRECT:/sell/thanks');
    expect(await db.$count(clients)).toBe(0);
  });

  it('valid form submission redirects to thanks and saves', async () => {
    const fd = new FormData();
    Object.entries(base).forEach(([k, v]) => fd.set(k, v));
    await expect(submitSell(undefined, fd)).rejects.toThrow('REDIRECT:/sell/thanks');
    expect(await db.$count(clients)).toBe(1);
  });

  it('invalid form submission returns field errors', async () => {
    const fd = new FormData();
    Object.entries({ ...base, phone: 'nope' }).forEach(([k, v]) => fd.set(k, v));
    const r = await submitSell(undefined, fd);
    expect(r?.fieldErrors?.phone).toEqual(['Enter a valid phone number']);
  });

  it('outside WP district sets outside_wp', async () => {
    const { engagementId } = await submitSellerIntake(parse({ district: 'Kandy', area: 'Peradeniya' }).data!);
    const [e] = await db.select().from(engagements).where((await import('drizzle-orm')).eq(engagements.id, engagementId));
    expect(e.fitFlags).toContain('outside_wp');
  });
});
