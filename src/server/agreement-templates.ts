import { and, desc, eq, isNotNull, isNull, max } from 'drizzle-orm';
import { db } from '@/db';
import { agreementTemplates, documents, engagements, type AgreementKind, type AgreementTemplate, type Engagement } from '@/db/schema';
import { formatLkr } from '@/lib/money';

/** A wording problem staff can fix. */
export class AgreementTemplateError extends Error {}

export const AGREEMENT_TITLES: Record<AgreementKind, string> = {
  seller_exclusive: 'Exclusive marketing and sale agreement',
  founding: 'Exclusive marketing and sale agreement (founding client)',
  retainer: 'Dealer marketing retainer agreement',
  pilot: 'Project marketing pilot agreement',
};

export const CLAUSE_VARS = ['exclusiveDays', 'followOnMonths', 'commissionPercent', 'commissionMin', 'upfrontFee', 'adBudget', 'monthlyFee', 'unitsPerMonth', 'clientName'] as const;
export const CLAUSE_CONDITIONS = ['commission', 'no commission', 'fee', 'no fee', 'deposit', 'minimum', 'retainer'] as const;

/** A line marked like this must be replaced before the lawyer can approve the wording. */
export const DECIDE_MARKER = 'TO DECIDE WITH THE LAWYER';

const ENQUIRIES = 'Buyer enquiries. All buyer enquiries are handled by Vikkaa. Vikkaa keeps a tamper-evident record of every buyer it introduces, which either party may rely on.';
const DEPOSIT =
  '[if deposit] Advertising deposit. The advertising deposit of {adBudget} is spent only on advertising under this agreement. Spend is shown in the client portal. [TO DECIDE WITH THE LAWYER: what happens to any unspent balance when the agreement ends.]';

/** Starting points for the lawyer, written from the court's list of risks. Never signable until approved. */
const DRAFTS: Record<AgreementKind, string[]> = {
  seller_exclusive: [
    'Exclusivity. For {exclusiveDays} days from signing, Vikkaa is the only party appointed to market and sell the asset(s) listed above.',
    '[if commission] Commission. If an asset sells during the exclusive period, the seller pays Vikkaa a commission of {commissionPercent}% of the sale price, whoever found the buyer.',
    '[if minimum] Minimum commission. The commission on each sale is at least {commissionMin}.',
    '[if no commission] Commission. No sale commission applies to this agreement.',
    '[if commission] Follow-on period. If a buyer introduced by Vikkaa buys an asset within {followOnMonths} months after the exclusive period ends, the commission is still due.',
    '[if commission] Payment of commission. Commission is due on the day the deed is signed (property) or the ownership transfer is completed (vehicle).',
    '[if fee] Upfront fee credit. If an asset sells within the exclusive period, the upfront marketing fee of {upfrontFee} is deducted from the commission due.',
    '[if fee] Upfront fee if there is no sale. [TO DECIDE WITH THE LAWYER: whether the upfront fee is refundable, partly refundable or non-refundable if nothing sells.]',
    DEPOSIT,
    ENQUIRIES,
  ],
  founding: [
    'Exclusivity. For {exclusiveDays} days from signing, Vikkaa is the only party appointed to market and sell the asset(s) listed above.',
    'Founding client. The seller is one of Vikkaa\'s founding clients and agrees that Vikkaa may publish the campaign content and an anonymised case study of this sale.',
    '[if no fee] Upfront fee. No upfront marketing fee is charged.',
    '[if commission] Commission. If an asset sells during the exclusive period, the seller pays Vikkaa a commission of {commissionPercent}% of the sale price, whoever found the buyer.',
    '[if minimum] Minimum commission. The commission on each sale is at least {commissionMin}.',
    '[if commission] Follow-on period. If a buyer introduced by Vikkaa buys an asset within {followOnMonths} months after the exclusive period ends, the commission is still due.',
    '[if commission] Payment of commission. Commission is due on the day the deed is signed (property) or the ownership transfer is completed (vehicle).',
    '[if fee] Upfront fee credit. If an asset sells within the exclusive period, the upfront marketing fee of {upfrontFee} is deducted from the commission due.',
    DEPOSIT,
    ENQUIRIES,
  ],
  retainer: [
    'Services. Each month Vikkaa photographs, films and markets up to {unitsPerMonth} vehicles supplied by the dealer, and handles every buyer enquiry for them.',
    'Monthly fee. The dealer pays {monthlyFee} a month, invoiced in advance and due within 7 days of the invoice.',
    '[if commission] Commission. If a buyer introduced by Vikkaa buys a vehicle marketed under this agreement, the dealer pays a commission of {commissionPercent}% of the sale price.',
    '[if minimum] Minimum commission. The commission on each such sale is at least {commissionMin}.',
    '[if commission] Follow-on period. Commission remains due for a buyer introduced by Vikkaa who buys within {followOnMonths} months after the vehicle stops being marketed.',
    'Term. [TO DECIDE WITH THE LAWYER: minimum term and notice period, e.g. month to month with 30 days\' written notice.]',
    DEPOSIT,
    ENQUIRIES,
  ],
  pilot: [
    'Pilot. For one month from signing, Vikkaa markets the project listed above: a project page, a photo, drone and film shoot, and one campaign across its channels.',
    '[if fee] Fee. The fixed pilot fee is {upfrontFee}, payable before work starts.',
    '[if commission] Commission. If a unit sells to a buyer introduced by Vikkaa during the pilot or within {followOnMonths} months after it, the developer pays a commission of {commissionPercent}% of the sale price.',
    '[if minimum] Minimum commission. The commission on each such sale is at least {commissionMin}.',
    'After the pilot. The developer may continue on a monthly retainer on terms agreed in writing, or end the engagement.',
    DEPOSIT,
    ENQUIRIES,
  ],
};

/** Which wording applies: chosen on the engagement, else derived from its terms. */
export function kindFor(e: Pick<Engagement, 'agreementKind' | 'monthlyFeeCents' | 'foundingTerms'>): AgreementKind {
  return e.agreementKind ?? (e.monthlyFeeCents > 0 ? 'retainer' : e.foundingTerms ? 'founding' : 'seller_exclusive');
}

const COND = /^\[if ([a-z ]+)\]\s*/;
const VAR = /\{(\w+)\}/g;

export function clauseProblems(clauses: string[]): string[] {
  const problems: string[] = [];
  for (const c of clauses) {
    const cond = c.match(COND)?.[1];
    if (cond && !(CLAUSE_CONDITIONS as readonly string[]).includes(cond)) problems.push(`Unknown condition [if ${cond}]`);
    for (const m of c.matchAll(VAR)) if (!(CLAUSE_VARS as readonly string[]).includes(m[1])) problems.push(`Unknown placeholder {${m[1]}}`);
  }
  return problems;
}

type Terms = Pick<Engagement, 'commissionApplies' | 'commissionRateBp' | 'commissionMinCents' | 'upfrontFeeCents' | 'adBudgetCents' | 'monthlyFeeCents' | 'exclusiveDays' | 'followOnMonths' | 'unitsPerMonth'> & {
  client: { name: string };
};

const percent = (bp: number) => (bp / 100).toFixed(bp % 100 === 0 ? 0 : 2);

/** The clauses that apply to these terms, with every placeholder filled in. */
export function renderClauses(clauses: string[], e: Terms): string[] {
  const commission = e.commissionApplies && e.commissionRateBp > 0;
  const holds: Record<string, boolean> = {
    commission,
    'no commission': !commission,
    fee: e.upfrontFeeCents > 0,
    'no fee': !(e.upfrontFeeCents > 0),
    deposit: e.adBudgetCents > 0,
    minimum: commission && e.commissionMinCents > 0,
    retainer: e.monthlyFeeCents > 0,
  };
  const vars: Record<string, string> = {
    exclusiveDays: String(e.exclusiveDays),
    followOnMonths: String(e.followOnMonths),
    commissionPercent: percent(e.commissionRateBp),
    commissionMin: formatLkr(e.commissionMinCents),
    upfrontFee: formatLkr(e.upfrontFeeCents),
    adBudget: formatLkr(e.adBudgetCents),
    monthlyFee: formatLkr(e.monthlyFeeCents),
    unitsPerMonth: String(e.unitsPerMonth ?? 0),
    clientName: e.client.name,
  };
  return clauses.flatMap((c) => {
    const cond = c.match(COND)?.[1];
    if (cond && !holds[cond]) return [];
    return [c.replace(COND, '').replace(VAR, (_, k: string) => vars[k] ?? '')];
  });
}

export async function ensureDraftTemplates(): Promise<void> {
  const existing = await db.select({ kind: agreementTemplates.kind }).from(agreementTemplates);
  const have = new Set(existing.map((r) => r.kind));
  const missing = (Object.keys(DRAFTS) as AgreementKind[]).filter((k) => !have.has(k));
  if (missing.length) {
    await db
      .insert(agreementTemplates)
      .values(missing.map((kind) => ({ kind, version: 1, clauses: DRAFTS[kind], notes: 'Starting draft for the lawyer. Not signable until approved.' })))
      .onConflictDoNothing();
  }
}

/** The wording in force: the highest approved version, else the latest draft (shown with a banner, not signable). */
export async function activeTemplate(kind: AgreementKind): Promise<{ template: AgreementTemplate; approved: boolean }> {
  await ensureDraftTemplates();
  const [approved] = await db
    .select()
    .from(agreementTemplates)
    .where(and(eq(agreementTemplates.kind, kind), isNotNull(agreementTemplates.approvedAt)))
    .orderBy(desc(agreementTemplates.version))
    .limit(1);
  if (approved) return { template: approved, approved: true };
  const [draft] = await db.select().from(agreementTemplates).where(eq(agreementTemplates.kind, kind)).orderBy(desc(agreementTemplates.version)).limit(1);
  return { template: draft, approved: false };
}

export async function listTemplateVersions(): Promise<AgreementTemplate[]> {
  await ensureDraftTemplates();
  return db.select().from(agreementTemplates).orderBy(agreementTemplates.kind, desc(agreementTemplates.version));
}

export async function getAgreementTemplate(id: string): Promise<AgreementTemplate> {
  const [t] = await db.select().from(agreementTemplates).where(eq(agreementTemplates.id, id));
  if (!t) throw new AgreementTemplateError('That wording no longer exists');
  return t;
}

/** Drafts are editable; approved versions are not (the update only matches unapproved rows). */
export async function saveDraftClauses(id: string, clauses: string[], notes?: string | null): Promise<void> {
  const clean = clauses.map((c) => c.trim()).filter(Boolean);
  if (!clean.length) throw new AgreementTemplateError('Add at least one clause');
  const problems = clauseProblems(clean);
  if (problems.length) throw new AgreementTemplateError(problems.join('; '));
  const [row] = await db
    .update(agreementTemplates)
    .set({ clauses: clean, notes: notes ?? null })
    .where(and(eq(agreementTemplates.id, id), isNull(agreementTemplates.approvedAt)))
    .returning({ id: agreementTemplates.id });
  if (!row) throw new AgreementTemplateError('Approved wording cannot be changed. Start a new version instead.');
}

/** A new unapproved version, starting from the given version's clauses. */
export async function newVersion(fromId: string, userId?: string): Promise<AgreementTemplate> {
  const from = await getAgreementTemplate(fromId);
  const [{ top }] = await db.select({ top: max(agreementTemplates.version) }).from(agreementTemplates).where(eq(agreementTemplates.kind, from.kind));
  const [t] = await db
    .insert(agreementTemplates)
    .values({ kind: from.kind, version: (top ?? 0) + 1, clauses: from.clauses, createdByUserId: userId })
    .returning();
  return t;
}

/** The lawyer has confirmed this wording in writing. From now on it is the signable version and cannot change. */
export async function approveTemplate(id: string, input: { lawyerName: string; reference: string; userId?: string }): Promise<void> {
  const t = await getAgreementTemplate(id);
  if (t.approvedAt) throw new AgreementTemplateError('This version is already approved.');
  if (input.lawyerName.trim().length < 3) throw new AgreementTemplateError("Enter the lawyer's name");
  if (!input.reference.trim()) throw new AgreementTemplateError('Enter a reference for the written confirmation (email date, letter number…)');
  if (t.clauses.some((c) => c.includes(DECIDE_MARKER))) throw new AgreementTemplateError('Some clauses still say "TO DECIDE WITH THE LAWYER". Replace them with the agreed wording first.');
  await db
    .update(agreementTemplates)
    .set({ approvedAt: new Date(), approvedBy: input.lawyerName.trim(), approvalReference: input.reference.trim(), approvedByUserId: input.userId })
    .where(and(eq(agreementTemplates.id, id), isNull(agreementTemplates.approvedAt)));
}

/**
 * The single check before anyone may sign: the latest draft must have been generated from lawyer-approved wording.
 * A draft made before approval stays unsignable even after approval; generate a new draft.
 */
const SIGNED_TERMS = [
  'upfrontFeeCents',
  'adBudgetCents',
  'monthlyFeeCents',
  'unitsPerMonth',
  'billingDay',
  'commissionApplies',
  'commissionRateBp',
  'commissionMinCents',
  'exclusiveDays',
  'followOnMonths',
  'agreementKind',
  'foundingTerms',
] as const;

/** Term names that differ between the draft's frozen snapshot and the live engagement. */
export function changedTerms(snapshot: Partial<Record<string, unknown>>, live: Engagement): string[] {
  return SIGNED_TERMS.filter((k) => (snapshot[k] ?? null) !== (live[k] ?? null));
}

export async function signingBlocker(engagementId: string): Promise<string | null> {
  const [draft] = await db
    .select({ meta: documents.meta })
    .from(documents)
    .where(and(eq(documents.engagementId, engagementId), eq(documents.type, 'agreement')))
    .orderBy(desc(documents.issuedAt))
    .limit(1);
  if (!draft) return 'Generate the agreement draft first.';
  if (draft.meta.legalApproved !== true) {
    return 'This agreement uses wording the lawyer has not approved. Approve it in Settings → Agreements, then generate a new draft.';
  }
  const [live] = await db.select().from(engagements).where(eq(engagements.id, engagementId));
  const snapshot = draft.meta.snapshot as Partial<Record<string, unknown>> | undefined;
  if (live && snapshot && changedTerms(snapshot, live).length) {
    return 'The terms changed after this draft was made, so it no longer matches. Generate a new agreement draft.';
  }
  return null;
}
