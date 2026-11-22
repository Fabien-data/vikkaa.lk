import { describe, it, expect, vi, beforeEach } from 'vitest';
import { db } from '@/db';
import { clients, engagements, assets, documents, buyers, enquiries, signatories } from '@/db/schema';
import { signPath } from '@/lib/signed-url';

const jar = new Map<string, string>();
vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => (jar.has(name) ? { name, value: jar.get(name)! } : undefined),
    set: (name: string, value: string) => void jar.set(name, value),
    delete: (name: string) => void jar.delete(name),
  }),
}));

import { GET as login } from '@/app/console/portal/login/[clientId]/route';
import { GET as download } from '@/app/console/portal/documents/[id]/route';
import { getPortalClientId } from '@/server/portal-session';
import { getPortalDashboard } from '@/server/portal';
import { putPrivate } from '@/server/storage';

async function seedClient(phone: string) {
  const [c] = await db.insert(clients).values({ type: 'private', name: `Client ${phone}`, phone }).returning();
  const [e] = await db.insert(engagements).values({ clientId: c.id, type: 'single', stage: 'signed', commissionRateBp: 300, exclusiveDays: 90, followOnMonths: 6 }).returning();
  const [a] = await db
    .insert(assets)
    .values({ engagementId: e.id, category: 'property', kind: 'house', title: `House ${phone}`, slug: `h-${crypto.randomUUID().slice(0, 8)}`, district: 'Colombo', area: 'Nugegoda', askingPriceCents: 1, status: 'live', publishedAt: new Date(Date.now() - 1000) })
    .returning();
  await putPrivate(`documents/test/${e.id}.pdf`, Buffer.from('%PDF-x'));
  const [invoice] = await db.insert(documents).values({ engagementId: e.id, type: 'invoice', number: `VKA-2026-${phone.slice(-3)}`, storageKey: `documents/test/${e.id}.pdf`, sha256: 'x' }).returning();
  const [draft] = await db.insert(documents).values({ engagementId: e.id, type: 'agreement', storageKey: `documents/test/${e.id}.pdf`, sha256: 'x' }).returning();
  return { c, e, a, invoice, draft };
}

const req = (path: string) => new Request(`http://app.vikkaa.test${path}`);
const ctx = <T extends Record<string, string>>(p: T) => ({ params: Promise.resolve(p) });

describe('client portal', () => {
  beforeEach(() => jar.clear());

  it('a valid signed link starts a session', async () => {
    const { c } = await seedClient('+94770000001');
    const res = await login(req(signPath(`/portal/login/${c.id}`, 3600)), ctx({ clientId: c.id }));
    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toMatch(/\/portal$/);
    expect(await getPortalClientId()).toBe(c.id);
  });

  it('a tampered or expired link returns 403 and no session', async () => {
    const { c } = await seedClient('+94770000002');
    const tampered = signPath(`/portal/login/${c.id}`, 3600).replace(/sig=(.)/, (_, ch) => `sig=${ch === '0' ? '1' : '0'}`); // always change a character
    expect((await login(req(tampered), ctx({ clientId: c.id }))).status).toBe(403);
    const expired = signPath(`/portal/login/${c.id}`, -10);
    expect((await login(req(expired), ctx({ clientId: c.id }))).status).toBe(403);
    expect(await getPortalClientId()).toBeNull();
  });

  it("a client cannot download another client's document", async () => {
    const a = await seedClient('+94770000003');
    const b = await seedClient('+94770000004');
    await login(req(signPath(`/portal/login/${a.c.id}`, 3600)), ctx({ clientId: a.c.id }));
    expect((await download(req(`/portal/documents/${a.invoice.id}`), ctx({ id: a.invoice.id }))).status).toBe(200);
    expect((await download(req(`/portal/documents/${b.invoice.id}`), ctx({ id: b.invoice.id }))).status).toBe(404);
  });

  it('a client cannot download the draft agreement', async () => {
    const a = await seedClient('+94770000005');
    await login(req(signPath(`/portal/login/${a.c.id}`, 3600)), ctx({ clientId: a.c.id }));
    expect((await download(req(`/portal/documents/${a.draft.id}`), ctx({ id: a.draft.id }))).status).toBe(404);
  });

  it('download without a session is not found', async () => {
    const a = await seedClient('+94770000006');
    expect((await download(req(`/portal/documents/${a.invoice.id}`), ctx({ id: a.invoice.id }))).status).toBe(404);
  });

  it('dashboard data has enquiry counts but no buyer details', async () => {
    const { c, e, a } = await seedClient('+94770000007');
    const [buyer] = await db.insert(buyers).values({ name: 'Secret Buyer', phone: '+94719990000' }).returning();
    await db.insert(enquiries).values([
      { assetId: a.id, buyerId: buyer.id, channel: 'web_form' },
      { assetId: a.id, buyerId: buyer.id, channel: 'whatsapp' },
    ]);
    await db.insert(signatories).values({ engagementId: e.id, role: 'owner', name: 'Owner', phone: '+94770000007', signedAt: new Date() });
    const dash = await getPortalDashboard(c.id);
    expect(dash.engagements[0].assets[0]).toMatchObject({ title: a.title, status: 'Live', enquiries: 2 });
    expect(dash.engagements[0].assets[0].publicUrl).toBe(`http://vikkaa.test/property/${a.slug}`);
    expect(dash.engagements[0].documents.map((d) => d.type)).toEqual(['invoice']);
    expect(dash.engagements[0].signatories).toEqual([{ name: 'Owner', signed: true }]);
    const json = JSON.stringify(dash);
    expect(json).not.toContain('Secret Buyer');
    expect(json).not.toContain('+94719990000');
  });
});
