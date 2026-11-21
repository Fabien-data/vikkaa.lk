import { describe, it, expect } from 'vitest';
import { db } from '@/db';
import { clients, engagements, assets } from '@/db/schema';

async function makeClient(phone = '+94771234567') {
  const [c] = await db.insert(clients).values({ type: 'private', name: 'Nimal', phone }).returning();
  return c;
}

describe('data model', () => {
  it('defaults organizationId to org_vikkaa', async () => {
    const c = await makeClient();
    expect(c.organizationId).toBe('org_vikkaa');
  });

  it('rejects duplicate client phone in one organization', async () => {
    await makeClient();
    await expect(makeClient()).rejects.toThrow();
  });

  it('rejects duplicate asset slug', async () => {
    const c = await makeClient();
    const [e] = await db
      .insert(engagements)
      .values({ clientId: c.id, type: 'single', commissionRateBp: 300, exclusiveDays: 90, followOnMonths: 6 })
      .returning();
    const asset = {
      engagementId: e.id,
      category: 'property' as const,
      kind: 'house' as const,
      title: 'House',
      slug: 'house-abc123',
      district: 'Colombo',
      area: 'Nugegoda',
      askingPriceCents: 1000,
    };
    await db.insert(assets).values(asset);
    await expect(db.insert(assets).values(asset)).rejects.toThrow();
  });

  it('defaults new engagements to intake with empty flags and new assets to draft', async () => {
    const c = await makeClient();
    const [e] = await db
      .insert(engagements)
      .values({ clientId: c.id, type: 'single', commissionRateBp: 300, exclusiveDays: 90, followOnMonths: 6 })
      .returning();
    expect(e.stage).toBe('intake');
    expect(e.fitFlags).toEqual([]);
    const [a] = await db
      .insert(assets)
      .values({ engagementId: e.id, category: 'vehicle', kind: 'car', title: 'Car', slug: 'car-x', district: 'Colombo', area: 'Colombo 07', askingPriceCents: 5 })
      .returning();
    expect(a.status).toBe('draft');
    expect(a.photos).toEqual([]);
  });
});
