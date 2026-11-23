import { describe, it, expect } from 'vitest';
import { commissionFor, type CommissionInput } from '@/server/commission';

const D = (s: string) => new Date(`${s}T06:00:00Z`);
const base: CommissionInput = {
  agreementKind: 'seller_exclusive',
  commissionApplies: true,
  rateBp: 300,
  minCents: 0,
  signedAt: D('2026-08-01'),
  endsAt: D('2026-10-30'),
  retainerEndsOn: null,
  followOnMonths: 6,
  saleAgreedAt: D('2026-09-15'),
  salePriceCents: 5_000_000_000, // Rs 50,000,000
  buyerIntroduced: true,
  feePaidCents: 7_500_000,
  creditUsedCents: 0,
  vatRateBp: 0,
};
const run = (over: Partial<CommissionInput>) => commissionFor({ ...base, ...over });

describe('commission rules', () => {
  it.each([
    ['inside the exclusive period, introduced buyer: commission with fee credit', {}, 'exclusive', 150_000_000, 7_500_000],
    ['inside the exclusive period, seller found the buyer: still due, with credit', { buyerIntroduced: false }, 'exclusive', 150_000_000, 7_500_000],
    ['after the period, introduced buyer, within follow-on: due, no credit', { saleAgreedAt: D('2027-02-01') }, 'follow_on', 150_000_000, 0],
    ['after the period, not introduced: nothing due', { saleAgreedAt: D('2027-02-01'), buyerIntroduced: false }, 'none', 0, 0],
    ['after the follow-on window: nothing due', { saleAgreedAt: D('2027-05-15') }, 'none', 0, 0],
    ['sale agreed before signing: nothing due', { saleAgreedAt: D('2026-07-20') }, 'none', 0, 0],
    ['commission switched off: nothing due', { commissionApplies: false }, 'none', 0, 0],
    ['credit capped at the commission', { salePriceCents: 100_000_000, feePaidCents: 7_500_000 }, 'exclusive', 3_000_000, 3_000_000],
    ['batch: credit already used by an earlier sale', { creditUsedCents: 7_500_000 }, 'exclusive', 150_000_000, 0],
    ['batch: partly used credit', { creditUsedCents: 5_000_000 }, 'exclusive', 150_000_000, 2_500_000],
    ['zero fee (founding): no credit', { feePaidCents: 0 }, 'exclusive', 150_000_000, 0],
  ] as const)('%s', (_label, over, basis, gross, credit) => {
    const c = run(over as Partial<CommissionInput>);
    expect([c.basis, c.grossCents, c.creditCents, c.netCents]).toEqual([basis, gross, credit, gross - credit]);
  });

  it('a vehicle minimum applies per sale', () => {
    const c = run({ rateBp: 150, minCents: 5_000_000, salePriceCents: 200_000_000 }); // 1.5% of Rs 2m = Rs 30,000 < Rs 50,000
    expect(c.grossCents).toBe(5_000_000);
  });

  it('VAT is added to the net after the credit', () => {
    const c = run({ vatRateBp: 1800 });
    expect([c.netCents, c.vatCents, c.totalCents]).toEqual([142_500_000, 25_650_000, 168_150_000]);
  });

  it('retainers: only introduced buyers, never a fee credit', () => {
    const r = { agreementKind: 'retainer' as const, endsAt: null, feePaidCents: 7_500_000 };
    expect(run({ ...r, buyerIntroduced: false }).basis).toBe('none');
    const c = run({ ...r, saleAgreedAt: D('2027-03-01') });
    expect([c.basis, c.creditCents]).toEqual(['introduced', 0]);
  });

  it('retainers: after the retainer ends, introduced buyers within the follow-on months still count', () => {
    const r = { agreementKind: 'retainer' as const, endsAt: null, retainerEndsOn: '2026-12-31' };
    expect(run({ ...r, saleAgreedAt: D('2027-03-01') }).basis).toBe('follow_on');
    expect(run({ ...r, saleAgreedAt: D('2027-08-01') }).basis).toBe('none');
  });

  it('pilots: only introduced buyers, never a fee credit', () => {
    const r = { agreementKind: 'pilot' as const, feePaidCents: 7_500_000 };
    expect(run({ ...r, buyerIntroduced: false }).basis).toBe('none');
    const c = run(r);
    expect([c.basis, c.creditCents, c.grossCents]).toEqual(['introduced', 0, 150_000_000]);
    expect(run({ ...r, saleAgreedAt: D('2027-02-01') }).basis).toBe('follow_on');
  });
});
