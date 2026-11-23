import { describe, it, expect } from 'vitest';
import { db } from '@/db';
import { orgSettings } from '@/db/schema';
import { getSettings, saveSettings, bankDetails } from '@/server/settings';
import { config } from '@/lib/config';

describe('settings', () => {
  it('fills every section with defaults when nothing is saved', async () => {
    const s = await getSettings();
    expect(s.commission.propertyBp).toBe(300);
    expect(s.commission.vehicleBp).toBe(150);
    expect(s.limits.foundingCap).toBe(3);
    expect(s.messaging.quietStartHour).toBe(9);
    expect(s.gates.b).toBe('2027-01-31');
  });

  it('saving one section keeps the others', async () => {
    await saveSettings('runway', { monthlyCostCents: 25_000_000, cashOnHandCents: 60_000_000, asOf: '2026-11-23' });
    await saveSettings('limits', { foundingCap: 2, maxLiveCampaigns: 4 });
    const s = await getSettings();
    expect(s.runway.monthlyCostCents).toBe(25_000_000);
    expect(s.runway.gateCShareBp).toBe(5_000);
    expect(s.limits.foundingCap).toBe(2);
    expect(await db.select().from(orgSettings)).toHaveLength(1);
  });

  it('rejects bad values', async () => {
    await expect(saveSettings('messaging', { quietStartHour: 30 })).rejects.toThrow();
  });

  it('bank details come from settings once filled in, else from the deploy env', async () => {
    expect((await bankDetails()).accountNumber).toBe(config.bank.accountNumber);
    await saveSettings('bank', { accountName: 'Vikkaa (Pvt) Ltd', accountNumber: '1234567890', bank: 'Sampath', branch: 'Nugegoda' });
    expect(await bankDetails()).toEqual({ accountName: 'Vikkaa (Pvt) Ltd', accountNumber: '1234567890', bank: 'Sampath', branch: 'Nugegoda' });
  });
});
