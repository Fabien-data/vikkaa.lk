import { Text, View } from '@react-pdf/renderer';
import { pdf } from './render';

/**
 * Agreement wording. REPLACE these placeholder clauses with the lawyer's text before the first real signing,
 * then set LEGAL_REVIEWED to true (removes the draft banner from every agreement).
 */
export const LEGAL_REVIEWED = false;

export function AgreementTerms(t: {
  exclusiveDays: number;
  followOnMonths: number;
  commissionPercent: string;
  commissionApplies: boolean;
}) {
  const clauses = [
    `Exclusivity. For ${t.exclusiveDays} days from signing, Vikkaa is the only party appointed to market and sell the asset(s) listed above.`,
    t.commissionApplies
      ? `Commission. If an asset sells during the exclusive period, the seller pays Vikkaa a commission of ${t.commissionPercent}% of the sale price, whoever found the buyer.`
      : 'Commission. No sale commission applies to this engagement.',
    `Follow-on period. If a buyer introduced by Vikkaa buys an asset within ${t.followOnMonths} months after the exclusive period ends, the commission is still due.`,
    'Payment of commission. Commission is due on the day the deed is signed (property) or the ownership transfer is completed (vehicle).',
    'Upfront fee credit. If an asset sells within the exclusive period, the upfront marketing fee is deducted from the commission due.',
    'Buyer enquiries. All buyer enquiries are handled by Vikkaa. Vikkaa keeps a record of every buyer it introduces.',
  ];
  return (
    <View>
      {clauses.map((c, i) => (
        <Text key={i} style={{ marginBottom: 6 }}>
          {i + 1}. {c}
        </Text>
      ))}
      <Text style={[pdf.muted, { marginTop: 8 }]}>Draft wording. Final terms are subject to legal review.</Text>
    </View>
  );
}
