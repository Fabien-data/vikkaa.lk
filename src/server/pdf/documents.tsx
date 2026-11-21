import { Document as PdfDocument, Page, Text, View } from '@react-pdf/renderer';
import type { Asset, Client, Comparable, Engagement } from '@/db/schema';
import { formatLkr } from '@/lib/money';
import { config } from '@/lib/config';
import { pdf, Letterhead } from './render';
import { AgreementTerms, LEGAL_REVIEWED } from './agreement-terms';

export type EngagementForPdf = Engagement & { client: Client; assets: Asset[]; comparables: Comparable[] };

const percent = (bp: number) => (bp / 100).toFixed(bp % 100 === 0 ? 0 : 2);

function Bank() {
  const b = config.bank;
  if (!b.accountNumber) return <Text style={pdf.muted}>Bank details will be provided separately.</Text>;
  return (
    <View>
      <Text>Account name: {b.accountName}</Text>
      <Text>Account number: {b.accountNumber}</Text>
      <Text>
        Bank: {b.bank}
        {b.branch ? `, ${b.branch} branch` : ''}
      </Text>
    </View>
  );
}

function AssetList({ assets }: { assets: Asset[] }) {
  return (
    <View>
      {assets.map((a) => (
        <View key={a.id} style={pdf.row}>
          <Text style={pdf.cell}>{a.title}</Text>
          <Text style={pdf.cell}>
            {a.area}, {a.district}
          </Text>
          <Text style={pdf.right}>Asking {formatLkr(a.askingPriceCents)}</Text>
        </View>
      ))}
    </View>
  );
}

export function ProposalPdf({ e, date }: { e: EngagementForPdf; date: Date }) {
  return (
    <PdfDocument title="Vikkaa proposal">
      <Page size="A4" style={pdf.page}>
        <Letterhead title="Marketing proposal" date={date} />
        <Text style={{ marginTop: 8 }}>Prepared for {e.client.name}</Text>

        <Text style={pdf.h2}>Market report</Text>
        {e.comparables.length > 0 && (
          <View style={{ marginBottom: 8 }}>
            {e.comparables.map((c) => (
              <View key={c.id} style={pdf.row}>
                <Text style={pdf.cell}>{c.description}</Text>
                <Text style={pdf.cell}>{c.source}</Text>
                <Text style={pdf.cell}>{c.observedOn}</Text>
                <Text style={pdf.right}>{formatLkr(c.priceCents)}</Text>
              </View>
            ))}
          </View>
        )}
        {e.assets.map((a) => (
          <Text key={a.id}>
            {a.title}: recommended asking price {formatLkr(a.recommendedPriceCents ?? 0)} (your asking price{' '}
            {formatLkr(a.askingPriceCents)})
          </Text>
        ))}
        {e.marketNotes ? <Text style={{ marginTop: 6 }}>{e.marketNotes}</Text> : null}

        <Text style={pdf.h2}>Content plan</Text>
        <Text>{e.contentPlan}</Text>

        <Text style={pdf.h2}>Quote</Text>
        <View style={pdf.row}>
          <Text style={pdf.cell}>Upfront marketing fee</Text>
          <Text style={pdf.right}>{formatLkr(e.upfrontFeeCents)}</Text>
        </View>
        <View style={pdf.row}>
          <Text style={pdf.cell}>Advertising deposit (spent on your ads, shown live in your portal)</Text>
          <Text style={pdf.right}>{formatLkr(e.adBudgetCents)}</Text>
        </View>
        {e.commissionApplies && (
          <View style={pdf.row}>
            <Text style={pdf.cell}>Commission on sale</Text>
            <Text style={pdf.right}>{percent(e.commissionRateBp)}% of the sale price</Text>
          </View>
        )}
        <Text style={{ marginTop: 8 }}>
          Exclusive agreement period: {e.exclusiveDays} days. If your asset sells within that period, the upfront fee is
          credited against the commission.
        </Text>

        <Text style={pdf.h2}>Payment</Text>
        <Bank />
      </Page>
    </PdfDocument>
  );
}

export type SignatureLine = { name: string; idNumber: string; phone: string; signedAt: Date; ip: string; role: string };

export function AgreementPdf({ e, date, signatures }: { e: EngagementForPdf; date: Date; signatures?: SignatureLine[] }) {
  return (
    <PdfDocument title="Vikkaa exclusive marketing and sale agreement">
      <Page size="A4" style={pdf.page}>
        {!LEGAL_REVIEWED && <Text style={pdf.banner}>DRAFT WORDING, PENDING LEGAL REVIEW. Do not sign with a client yet.</Text>}
        <Letterhead title="Exclusive marketing and sale agreement" date={date} />
        <Text style={{ marginTop: 8 }}>
          Between Vikkaa.lk and {e.client.name} ({e.client.phone}), the seller.
        </Text>
        <Text style={pdf.h2}>Assets</Text>
        <AssetList assets={e.assets} />
        <Text style={pdf.h2}>Fees</Text>
        <Text>Upfront marketing fee: {formatLkr(e.upfrontFeeCents)}</Text>
        <Text>Advertising deposit: {formatLkr(e.adBudgetCents)}</Text>
        <Text style={pdf.h2}>Terms</Text>
        <AgreementTerms
          exclusiveDays={e.exclusiveDays}
          followOnMonths={e.followOnMonths}
          commissionPercent={percent(e.commissionRateBp)}
          commissionApplies={e.commissionApplies}
        />
      </Page>
      {signatures && (
        <Page size="A4" style={pdf.page}>
          <Text style={pdf.h1}>Signatures</Text>
          <Text style={[pdf.muted, { marginBottom: 10 }]}>
            Each signatory confirmed a one-time code sent to the phone or email below and entered their name and ID number.
          </Text>
          {signatures.map((s, i) => (
            <View key={i} style={{ marginBottom: 12 }}>
              <Text style={{ fontFamily: 'Helvetica-Bold' }}>
                {s.name} ({s.role.replace('_', ' ')})
              </Text>
              <Text>ID number: {s.idNumber}</Text>
              <Text>Verified contact: {s.phone}</Text>
              <Text>Signed: {s.signedAt.toISOString()} from IP {s.ip}</Text>
            </View>
          ))}
        </Page>
      )}
    </PdfDocument>
  );
}

export function InvoicePdf({
  e,
  number,
  date,
  amountCents,
  vatCents,
  totalCents,
}: {
  e: EngagementForPdf;
  number: string;
  date: Date;
  amountCents: number;
  vatCents: number;
  totalCents: number;
}) {
  return (
    <PdfDocument title={`Invoice ${number}`}>
      <Page size="A4" style={pdf.page}>
        <Letterhead title="Invoice" number={number} date={date} />
        <Text style={{ marginTop: 8 }}>Bill to: {e.client.name}, {e.client.phone}</Text>
        <View style={{ marginTop: 16 }}>
          <View style={pdf.row}>
            <Text style={pdf.cell}>Marketing campaign fee: {e.assets.map((a) => a.title).join(', ')}</Text>
            <Text style={pdf.right}>{formatLkr(amountCents)}</Text>
          </View>
          {vatCents > 0 && (
            <View style={pdf.row}>
              <Text style={pdf.cell}>VAT {percent(config.vatRateBp)}%</Text>
              <Text style={pdf.right}>{formatLkr(vatCents)}</Text>
            </View>
          )}
          <View style={pdf.total}>
            <Text style={pdf.cell}>Total due</Text>
            <Text style={pdf.right}>{formatLkr(totalCents)}</Text>
          </View>
        </View>
        <Text style={pdf.h2}>Pay by bank transfer</Text>
        <Bank />
        <Text style={[pdf.muted, { marginTop: 8 }]}>Please use {number} as the payment reference.</Text>
      </Page>
    </PdfDocument>
  );
}

export function ReceiptPdf({
  e,
  number,
  date,
  amountCents,
  reference,
}: {
  e: EngagementForPdf;
  number: string;
  date: Date;
  amountCents: number;
  reference: string;
}) {
  return (
    <PdfDocument title={`Receipt ${number}`}>
      <Page size="A4" style={pdf.page}>
        <Letterhead title="Receipt: advertising deposit" number={number} date={date} />
        <Text style={{ marginTop: 8 }}>Received from: {e.client.name}, {e.client.phone}</Text>
        <View style={[pdf.total, { marginTop: 16 }]}>
          <Text style={pdf.cell}>Advertising deposit for {e.assets.map((a) => a.title).join(', ')}</Text>
          <Text style={pdf.right}>{formatLkr(amountCents)}</Text>
        </View>
        <Text>Payment reference: {reference}</Text>
        <Text style={[pdf.muted, { marginTop: 8 }]}>
          This deposit is spent on paid advertising for your listing. You can follow the spend in your Vikkaa portal.
        </Text>
      </Page>
    </PdfDocument>
  );
}
