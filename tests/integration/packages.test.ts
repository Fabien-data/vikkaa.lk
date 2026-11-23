import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { clients, engagements, signatories, type Package } from '@/db/schema';
import { applyPackage, savePackage, priceGuide, listPackages, PackageError, type PackageInput } from '@/server/packages';
import { saveSettings } from '@/server/settings';

const base: PackageInput = { name: 'Standard property campaign', segment: 'private', category: 'property', kind: 'upfront', priceCents: 7_500_000 };

async function engagement(type: 'single' | 'retainer' = 'single') {
  const [c] = await db.insert(clients).values({ type: 'private', name: 'Kamal', phone: `+9477${Math.floor(1e7 + Math.random() * 9e7)}` }).returning();
  const [e] = await db.insert(engagements).values({ clientId: c.id, type, commissionRateBp: 300, exclusiveDays: 90, followOnMonths: 6 }).returning();
  return e;
}
const load = async (id: string) => (await db.select().from(engagements).where(eq(engagements.id, id)))[0];

describe('price book', () => {
  it('validates packages', async () => {
    await expect(savePackage({ ...base, name: ' ' })).rejects.toThrow(PackageError);
    await expect(savePackage({ ...base, priceCents: 0 })).rejects.toThrow(/founding/);
    await expect(savePackage({ ...base, kind: 'retainer' })).rejects.toThrow(/units/);
    await savePackage({ ...base, priceCents: 0, founding: true, name: 'Founding' });
    expect(await listPackages()).toHaveLength(1);
  });

  it('applying an upfront package copies its terms onto the engagement', async () => {
    const p = await savePackage({ ...base, exclusiveDays: 60, commissionBp: 250, commissionMinCents: 0 });
    const e = await engagement();
    await applyPackage(e.id, p.id);
    const after = await load(e.id);
    expect(after).toMatchObject({ packageId: p.id, upfrontFeeCents: 7_500_000, monthlyFeeCents: 0, exclusiveDays: 60, commissionRateBp: 250, followOnMonths: 6, commissionApplies: true });
  });

  it('a retainer sets the monthly fee, units and a billing day, and zero commission turns commission off', async () => {
    const p = await savePackage({ ...base, name: 'Dealer, 8 cars', segment: 'dealer', category: 'vehicle', kind: 'retainer', priceCents: 15_000_000, unitsPerMonth: 8, commissionBp: 0 });
    const e = await engagement('retainer');
    await applyPackage(e.id, p.id);
    expect(await load(e.id)).toMatchObject({ monthlyFeeCents: 15_000_000, upfrontFeeCents: 0, unitsPerMonth: 8, billingDay: 1, commissionApplies: false });
  });

  it('is refused once anyone has signed', async () => {
    const p = await savePackage(base);
    const e = await engagement();
    await db.insert(signatories).values({ engagementId: e.id, role: 'owner', name: 'Kamal', phone: '+94771234567', signedAt: new Date() });
    await expect(applyPackage(e.id, p.id)).rejects.toThrow(/locked/);
  });

  it('caps founding terms', async () => {
    await saveSettings('limits', { foundingCap: 2, maxLiveCampaigns: 3 });
    const founding: Package = await savePackage({ ...base, name: 'Founding', priceCents: 0, founding: true });
    const [a, b, c] = [await engagement(), await engagement(), await engagement()];
    await applyPackage(a.id, founding.id);
    await applyPackage(b.id, founding.id);
    await expect(applyPackage(c.id, founding.id)).rejects.toThrow(/capped at 2/);
    // Re-applying to an engagement that already holds a founding slot is fine.
    await applyPackage(a.id, founding.id);
    // A lost deal frees its slot.
    await db.update(engagements).set({ stage: 'no_go' }).where(eq(engagements.id, b.id));
    await applyPackage(c.id, founding.id);
    expect((await load(c.id)).foundingTerms).toBe(true);
  });

  it('price guide is the cheapest active public package per category', async () => {
    expect(await priceGuide()).toEqual({ propertyCents: 0, vehicleCents: 0 });
    await savePackage({ ...base, priceCents: 9_000_000, publicFrom: true });
    await savePackage({ ...base, priceCents: 7_500_000, publicFrom: true });
    await savePackage({ ...base, priceCents: 1_000_000, publicFrom: true, active: false });
    await savePackage({ ...base, priceCents: 2_000_000, publicFrom: false });
    await savePackage({ ...base, category: 'vehicle', priceCents: 3_000_000, publicFrom: true });
    expect(await priceGuide()).toEqual({ propertyCents: 7_500_000, vehicleCents: 3_000_000 });
  });
});
