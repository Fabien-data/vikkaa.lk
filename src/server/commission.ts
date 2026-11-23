import type { AgreementKind } from '@/db/schema';
import { sriLankaMidnight } from '@/lib/sl-time';

export type CommissionBasis = 'exclusive' | 'follow_on' | 'introduced' | 'none';

export type CommissionInput = {
  agreementKind: AgreementKind;
  commissionApplies: boolean;
  rateBp: number;
  minCents: number;
  signedAt: Date | null;
  /** End of the exclusive period (sale agreements). */
  endsAt: Date | null;
  /** Last day of a retainer (YYYY-MM-DD), if it has ended or an end is set. */
  retainerEndsOn: string | null;
  followOnMonths: number;
  saleAgreedAt: Date;
  salePriceCents: number;
  /** Vikkaa recorded this buyer for this asset before the cut-off (end of the period, or the sale for retainers). */
  buyerIntroduced: boolean;
  /** Upfront fee actually paid on this engagement (before VAT). */
  feePaidCents: number;
  /** Fee credit already used by earlier commission invoices on the same engagement (batches use it once). */
  creditUsedCents: number;
  vatRateBp: number;
};

export type Commission = {
  basis: CommissionBasis;
  grossCents: number;
  creditCents: number;
  netCents: number;
  vatCents: number;
  totalCents: number;
  reason: string;
};

const none = (reason: string): Commission => ({ basis: 'none', grossCents: 0, creditCents: 0, netCents: 0, vatCents: 0, totalCents: 0, reason });

function addMonths(d: Date, months: number): Date {
  const out = new Date(d);
  out.setUTCMonth(out.getUTCMonth() + months);
  return out;
}

/**
 * The commission due on one sale, from the engagement's signed terms. Pure: the same inputs always give the same answer.
 *
 * - Exclusive agreements: any sale during the exclusive period earns commission, whoever found the buyer, and the
 *   upfront fee is credited (once per engagement). After the period, only a buyer Vikkaa introduced earns
 *   commission, within the follow-on months, with no credit.
 * - Retainers: only buyers Vikkaa introduced, while the retainer runs or within the follow-on months after; no credit.
 * - A minimum (vehicles) applies per sale. VAT is added to the net.
 */
export function commissionFor(i: CommissionInput): Commission {
  if (!i.signedAt) return none('The agreement was never signed.');
  if (i.saleAgreedAt < i.signedAt) return none('The sale was agreed before the agreement was signed.');
  if (!i.commissionApplies || i.rateBp <= 0) return none('No commission applies to this agreement.');
  const retainer = i.agreementKind === 'retainer';
  // Retainers and pilots pay on buyers Vikkaa introduced only, with no fee credit (see their agreement wording).
  const introducedOnly = retainer || i.agreementKind === 'pilot';
  const windowEnd = retainer ? (i.retainerEndsOn ? new Date(sriLankaMidnight(i.retainerEndsOn).getTime() + 86_400_000) : null) : i.endsAt;

  const inWindow = (windowEnd === null || i.saleAgreedAt <= windowEnd) && (!introducedOnly || i.buyerIntroduced);
  const inFollowOn = !inWindow && i.buyerIntroduced && windowEnd !== null && i.saleAgreedAt <= addMonths(windowEnd, i.followOnMonths);
  if (!inWindow && !inFollowOn) {
    return none(introducedOnly && !i.buyerIntroduced ? 'The buyer was not introduced by Vikkaa.' : i.buyerIntroduced ? 'The sale came after the follow-on period.' : 'The sale came after the exclusive period, to a buyer Vikkaa did not introduce.');
  }

  const grossCents = Math.max(Math.round((i.salePriceCents * i.rateBp) / 10_000), i.minCents);
  const creditCents = inWindow && !introducedOnly ? Math.min(Math.max(i.feePaidCents - i.creditUsedCents, 0), grossCents) : 0;
  const netCents = grossCents - creditCents;
  const vatCents = Math.round((netCents * i.vatRateBp) / 10_000);
  const basis: CommissionBasis = inFollowOn ? 'follow_on' : introducedOnly ? 'introduced' : 'exclusive';
  const reason =
    basis === 'exclusive' ? 'Sold during the exclusive period.' : basis === 'introduced' ? 'Sold to a buyer Vikkaa introduced.' : 'Sold to a buyer Vikkaa introduced, within the follow-on period.';
  return { basis, grossCents, creditCents, netCents, vatCents, totalCents: netCents + vatCents, reason };
}
