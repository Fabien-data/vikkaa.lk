import { Document as PdfDocument, Page, Text, View } from '@react-pdf/renderer';
import type { Asset, Client, Comparable, Engagement } from '@/db/schema';
import { formatLkr } from '@/lib/money';
import { config } from '@/lib/config';
import { pdf, Letterhead } from './render';

export type EngagementForPdf = Engagement & { client: Client; assets: Asset[]; comparables: Comparable[] };

const percent = (bp: number) => (bp / 100).toFixed(bp % 100 === 0 ? 0 : 2);

export type BankDetails = { accountName: string; accountNumber: string; bank: string; branch: string };

function Bank({ b }: { b: BankDetails }) {
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

export function ProposalPdf({ e, date, bank }: { e: EngagementForPdf; date: Date; bank: BankDetails }) {
  const retainer = e.monthlyFeeCents > 0;
  return (
    <PdfDocument title="Vikkaa proposal">
      <Page size="A4" style={pdf.page}>
        <Letterhead title="Marketing proposal" date={date} />
        <Text style={{ marginTop: 8 }}>Prepared for {e.client.name}</Text>

        {(e.assets.length > 0 || e.comparables.length > 0) && <Text style={pdf.h2}>Market report</Text>}
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
            {a.title}
            {a.recommendedPriceCents
              ? `: recommended asking price ${formatLkr(a.recommendedPriceCents)} (your asking price ${formatLkr(a.askingPriceCents)})`
              : `: asking ${formatLkr(a.askingPriceCents)}`}
          </Text>
        ))}
        {e.marketNotes ? <Text style={{ marginTop: 6 }}>{e.marketNotes}</Text> : null}

        <Text style={pdf.h2}>Content plan</Text>
        <Text>{e.contentPlan}</Text>

        <Text style={pdf.h2}>Quote</Text>
        {e.foundingTerms && (
          <Text style={{ marginBottom: 6 }}>
            Founding client terms: you are one of our first clients, so you agree that we may publish this campaign as a case study.
          </Text>
        )}
        {retainer && (
          <View style={pdf.row}>
            <Text style={pdf.cell}>
              Monthly retainer{e.unitsPerMonth ? `: up to ${e.unitsPerMonth} listings a month` : ''}, billed in advance on day {e.billingDay ?? 1}
            </Text>
            <Text style={pdf.right}>{formatLkr(e.monthlyFeeCents)} / month</Text>
          </View>
        )}
        {(e.upfrontFeeCents > 0 || (!retainer && !e.foundingTerms)) && (
          <View style={pdf.row}>
            <Text style={pdf.cell}>Upfront marketing fee</Text>
            <Text style={pdf.right}>{formatLkr(e.upfrontFeeCents)}</Text>
          </View>
        )}
        {e.adBudgetCents > 0 && (
          <View style={pdf.row}>
            <Text style={pdf.cell}>Advertising deposit (spent only on your ads, shown in your weekly report)</Text>
            <Text style={pdf.right}>{formatLkr(e.adBudgetCents)}</Text>
          </View>
        )}
        {e.commissionApplies && (
          <View style={pdf.row}>
            <Text style={pdf.cell}>Commission on sale{retainer ? ' (to buyers we introduce)' : ''}</Text>
            <Text style={pdf.right}>
              {percent(e.commissionRateBp)}% of the sale price{e.commissionMinCents > 0 ? `, minimum ${formatLkr(e.commissionMinCents)}` : ''}
            </Text>
          </View>
        )}
        {!retainer && e.commissionApplies && (
          <Text style={{ marginTop: 8 }}>
            Exclusive agreement period: {e.exclusiveDays} days.
            {e.upfrontFeeCents > 0 ? ' If your asset sells within that period, the upfront fee is credited against the commission.' : ''}
          </Text>
        )}
        {!retainer && !e.commissionApplies && (
          <Text style={{ marginTop: 8 }}>
            Campaign period: {e.exclusiveDays} days. The fee buys the work in the written scope; no sale is guaranteed.
          </Text>
        )}

        <Text style={pdf.h2}>Payment</Text>
        <Bank b={bank} />
      </Page>
    </PdfDocument>
  );
}

export type SignatureLine = { name: string; idNumber: string; phone: string; signedAt: Date; ip: string; role: string };

export function AgreementPdf({
  e,
  date,
  title,
  clauses,
  legalApproved,
  signatures,
  draftSha256,
}: {
  e: EngagementForPdf;
  date: Date;
  title: string;
  clauses: string[];
  legalApproved: boolean;
  signatures?: SignatureLine[];
  draftSha256?: string;
}) {
  return (
    <PdfDocument title={`Vikkaa: ${title}`}>
      <Page size="A4" style={pdf.page}>
        {!legalApproved && <Text style={pdf.banner}>DRAFT WORDING, NOT APPROVED BY THE LAWYER. Do not sign.</Text>}
        <Letterhead title={title} date={date} />
        <Text style={{ marginTop: 8 }}>
          Between Vikkaa.lk and {e.client.name} ({e.client.phone}).
        </Text>
        {e.assets.length > 0 && (
          <>
            <Text style={pdf.h2}>Assets</Text>
            <AssetList assets={e.assets} />
          </>
        )}
        <Text style={pdf.h2}>Fees</Text>
        {e.monthlyFeeCents > 0 && (
          <Text>
            Monthly retainer: {formatLkr(e.monthlyFeeCents)}
            {e.unitsPerMonth ? ` for up to ${e.unitsPerMonth} listings a month` : ''}, billed in advance on day {e.billingDay ?? 1}
          </Text>
        )}
        {(e.upfrontFeeCents > 0 || e.monthlyFeeCents === 0) && <Text>Upfront marketing fee: {formatLkr(e.upfrontFeeCents)}</Text>}
        {e.adBudgetCents > 0 && <Text>Advertising deposit: {formatLkr(e.adBudgetCents)}</Text>}
        <Text style={pdf.h2}>Terms</Text>
        <View>
          {clauses.map((c, i) => (
            <Text key={i} style={{ marginBottom: 6 }}>
              {i + 1}. {c}
            </Text>
          ))}
        </View>
      </Page>
      {signatures && (
        <Page size="A4" style={pdf.page}>
          <Text style={pdf.h1}>Signatures</Text>
          <Text style={[pdf.muted, { marginBottom: 10 }]}>
            Each signatory confirmed a one-time code sent to the phone or email below and entered their name and ID number.
          </Text>
          {draftSha256 ? (
            <Text style={[pdf.muted, { marginBottom: 10 }]}>Fingerprint (SHA-256) of the draft every signatory read: {draftSha256}</Text>
          ) : null}
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

export type InvoiceLine = { label: string; amountCents: number };

export function InvoicePdf({
  e,
  number,
  date,
  lines,
  vatCents,
  totalCents,
  dueOn,
  bank,
  title = 'Invoice',
}: {
  e: EngagementForPdf;
  number: string;
  date: Date;
  lines: InvoiceLine[];
  vatCents: number;
  totalCents: number;
  dueOn?: string | null;
  bank: BankDetails;
  title?: string;
}) {
  return (
    <PdfDocument title={`${title} ${number}`}>
      <Page size="A4" style={pdf.page}>
        <Letterhead title={title} number={number} date={date} />
        <Text style={{ marginTop: 8 }}>Bill to: {e.client.name}, {e.client.phone}</Text>
        {dueOn ? <Text style={pdf.muted}>Due by {dueOn}</Text> : null}
        <View style={{ marginTop: 16 }}>
          {lines.map((l, i) => (
            <View key={i} style={pdf.row}>
              <Text style={pdf.cell}>{l.label}</Text>
              <Text style={pdf.right}>{formatLkr(l.amountCents)}</Text>
            </View>
          ))}
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
        <Bank b={bank} />
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

export type ClaimEntry = { seq: number; type: string; channel: string; happenedAt: Date; recordedAt: Date; hash: string; assetTitle: string };

/** Evidence for a commission claim: the signed terms, every recorded contact with the buyer, and the chain check. */
export function ClaimPackPdf({
  e,
  date,
  buyer,
  entries,
  chainOk,
  signedAgreement,
}: {
  e: EngagementForPdf;
  date: Date;
  buyer: { name: string | null; phone: string } | null;
  entries: ClaimEntry[];
  chainOk: boolean;
  signedAgreement: { sha256: string; issuedAt: Date } | null;
}) {
  const when = (d: Date) => d.toLocaleString('en-GB', { timeZone: 'Asia/Colombo' });
  return (
    <PdfDocument title="Vikkaa commission claim pack">
      <Page size="A4" style={pdf.page}>
        <Letterhead title="Commission claim pack" date={date} />
        <Text style={{ marginTop: 8 }}>Client: {e.client.name} ({e.client.phone})</Text>
        {buyer ? <Text>Buyer: {buyer.name ?? 'Unnamed'} ({buyer.phone})</Text> : null}
        <Text style={pdf.h2}>Signed terms</Text>
        <Text>
          Signed {e.signedAt ? when(new Date(e.signedAt)) : 'not signed'} · exclusive period {e.exclusiveDays} days
          {e.endsAt ? ` (ended ${when(new Date(e.endsAt))})` : ''} · follow-on {e.followOnMonths} months · commission {percent(e.commissionRateBp)}%
        </Text>
        {signedAgreement ? (
          <Text style={pdf.muted}>
            Signed agreement fingerprint (SHA-256): {signedAgreement.sha256}, stored {when(signedAgreement.issuedAt)}
          </Text>
        ) : null}
        <Text style={pdf.h2}>Recorded contacts</Text>
        {entries.map((x) => (
          <View key={x.seq} style={pdf.row} wrap={false}>
            <Text style={pdf.cell}>
              #{x.seq} {when(x.happenedAt)}
            </Text>
            <Text style={pdf.cell}>
              {x.type.replace('_', ' ')} by {x.channel.replace('_', ' ')}: {x.assetTitle}
            </Text>
            <Text style={[pdf.muted, { width: 150 }]}>{x.hash.slice(0, 24)}…</Text>
          </View>
        ))}
        {entries.length === 0 ? <Text style={pdf.muted}>No recorded contacts.</Text> : null}
        <Text style={pdf.h2}>Integrity</Text>
        <Text>
          {chainOk
            ? 'The evidence log was re-checked when this pack was made: every entry is unchanged and in its original order.'
            : 'WARNING: the evidence log check failed. Do not rely on this pack until the log is investigated.'}
        </Text>
        <Text style={[pdf.muted, { marginTop: 6 }]}>
          Each entry is chained to the one before it with a SHA-256 fingerprint, recorded at the time shown, and cannot be edited or deleted.
        </Text>
      </Page>
    </PdfDocument>
  );
}
