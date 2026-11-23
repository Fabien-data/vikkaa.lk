import { and, countDistinct, eq, gte, inArray, isNotNull, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { clients, documents, engagements, messages, packages, payments, prospects } from '@/db/schema';
import { DAY_MS, daysUntil, sriLankaDay, sriLankaMidnight, sriLankaWeekStart } from '@/lib/sl-time';
import { getSettings } from '@/server/settings';
import { agreementTemplates } from '@/db/schema';
import { agreedDealsCount } from '@/server/deals';
import { kindFor } from '@/server/agreement-templates';
import { lastTick } from '@/server/ticker';

/** Pitches counted towards the court's target start from the plan's first selling week. */
export const PITCH_COUNT_FROM = '2026-11-23';
export const PITCH_TARGET = 30;

export type GateStatus = 'met' | 'open' | 'missed';
export type Gate = { key: 'A' | 'B' | 'C'; date: string; daysLeft: number; status: GateStatus; detail: string };

/** A pitch is a touch a founder marked "pitched": need, scope, price and next step covered with a decision-maker. A visit alone is not one. */
const isPitch = eq(messages.outcome, 'pitched');
const outbound = and(eq(messages.subjectType, 'prospect'), eq(messages.direction, 'out'), inArray(messages.status, ['sent', 'logged']));

async function count(where: ReturnType<typeof and>) {
  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(messages).where(where);
  return n;
}

export async function weekNumbers(now: Date) {
  const since = sriLankaWeekStart(now);
  const [{ contacted }] = await db
    .select({ contacted: countDistinct(messages.subjectId) })
    .from(messages)
    .where(and(outbound, gte(messages.sentAt, since), sql`${messages.outcome} is distinct from 'skipped'`));
  const changed = (statuses: ('replied' | 'meeting' | 'won')[]) =>
    db
      .select({ n: sql<number>`count(*)::int` })
      .from(prospects)
      .where(and(inArray(prospects.status, statuses), gte(prospects.statusChangedAt, since)))
      .then(([r]) => r.n);
  return {
    contacted,
    pitches: await count(and(outbound, isPitch, gte(messages.sentAt, since))),
    replied: await changed(['replied']),
    meetings: await changed(['meeting']),
    won: await changed(['won']),
  };
}

export async function pitchProgress() {
  return { done: await count(and(outbound, isPitch, gte(messages.sentAt, sriLankaMidnight(PITCH_COUNT_FROM)))), target: PITCH_TARGET };
}

/**
 * The paid-client gate: distinct customers with a signed scope and a fully paid service invoice.
 * Ad deposits are not invoices, and two engagements for one customer count once.
 */
export async function payingCustomers(): Promise<number> {
  const [{ n }] = await db
    .select({ n: countDistinct(clients.id) })
    .from(engagements)
    .innerJoin(clients, eq(engagements.clientId, clients.id))
    .innerJoin(documents, eq(documents.engagementId, engagements.id))
    .where(and(isNotNull(engagements.signedAt), isNotNull(documents.paidAt), sql`${documents.type}::text like '%invoice'`, sql`${documents.voidedAt} is null`));
  return n;
}

export async function gates(now: Date, extra: { lawyerApproved: boolean; mrrCents: number; dealsAgreed: number }): Promise<Gate[]> {
  const s = await getSettings();
  const [{ paid }] = await db.select({ paid: sql<number>`count(*)::int` }).from(engagements).where(isNotNull(engagements.paidAt));
  const [{ warm }] = await db.select({ warm: sql<number>`count(*)::int` }).from(prospects).where(inArray(prospects.status, ['meeting', 'won']));
  const paying = await payingCustomers();
  const share = Math.round((s.runway.monthlyCostCents * s.runway.gateCShareBp) / 10_000);

  const gate = (key: Gate['key'], date: string, met: boolean, detail: string): Gate => {
    const daysLeft = daysUntil(date, now);
    return { key, date, daysLeft, status: met ? 'met' : daysLeft < 0 ? 'missed' : 'open', detail };
  };
  return [
    gate(
      'A',
      s.gates.a,
      extra.lawyerApproved && (paid >= 1 || warm >= 3),
      `Lawyer-approved agreement: ${extra.lawyerApproved ? 'yes' : 'no'} · paid clients: ${paid} · prospects at meeting or won: ${warm} (need 1 paid or 3 warm)`,
    ),
    gate('B', s.gates.b, paying >= 1, `Customers with a signed scope and a cleared fee: ${paying} (need 1)`),
    gate(
      'C',
      s.gates.c,
      share > 0 && extra.mrrCents >= share && extra.dealsAgreed >= 1,
      `Monthly recurring revenue: Rs ${Math.round(extra.mrrCents / 100).toLocaleString('en-LK')} of Rs ${Math.round(share / 100).toLocaleString('en-LK')} needed · deals agreed: ${extra.dealsAgreed}`,
    ),
  ];
}

export async function runway(now: Date) {
  const { runway: r } = await getSettings();
  const months = r.monthlyCostCents > 0 ? r.cashOnHandCents / r.monthlyCostCents : null;
  const stale = !r.asOf || daysUntil(r.asOf, now) < -7;
  return { months, stale, asOf: r.asOf || null, monthlyCostCents: r.monthlyCostCents };
}

/** Revenue invoices only: ad deposits are the client's money held for their ads, not income. */
const revenueDoc = and(sql`${documents.type}::text like '%invoice'`, sql`${documents.voidedAt} is null`);

export async function activeRetainers(now: Date) {
  const today = sriLankaDay(now);
  return db
    .select({ id: engagements.id, monthlyFeeCents: engagements.monthlyFeeCents })
    .from(engagements)
    .where(
      and(
        isNotNull(engagements.signedAt),
        sql`${engagements.monthlyFeeCents} > 0`,
        sql`${engagements.stage} <> 'closed'`,
        or(sql`${engagements.retainerEndsOn} is null`, sql`${engagements.retainerEndsOn} >= ${today}`),
      ),
    );
}

export type WarRoomExtras = {
  lawyerApproved: boolean;
  mrrCents: number;
  dealsAgreed: number;
  collectedThisMonthCents: number;
  owedCents: number;
  /** Paying clients a month needed to cover both founders' costs; `needed` is null when the fee does not cover delivery. */
  survival: { needed: number | null; active: number } | null;
  failedMessages: number;
  lastTick: Date | null;
};

export async function warRoomExtras(now: Date): Promise<WarRoomExtras> {
  const monthStart = sriLankaMidnight(`${sriLankaDay(now).slice(0, 7)}-01`);
  const retainers = await activeRetainers(now);
  // Recurring revenue counts a retainer only once it has paid at least once: a signature is not cash.
  const paidIds = retainers.length
    ? new Set(
        (
          await db
            .selectDistinct({ id: documents.engagementId })
            .from(documents)
            .where(and(inArray(documents.engagementId, retainers.map((r) => r.id)), isNotNull(documents.paidAt), revenueDoc))
        ).map((r) => r.id),
      )
    : new Set<string | null>();
  const paying = retainers.filter((r) => paidIds.has(r.id));
  const mrrCents = paying.reduce((a, r) => a + r.monthlyFeeCents, 0);
  const [{ collected }] = await db
    .select({ collected: sql<number>`coalesce(sum(${payments.amountCents}), 0)::bigint` })
    .from(payments)
    .innerJoin(documents, eq(payments.documentId, documents.id))
    .where(and(revenueDoc, gte(payments.receivedAt, monthStart)));
  const [{ owed }] = await db
    .select({
      owed: sql<number>`coalesce(sum(${documents.totalCents} - coalesce((select sum(p.amount_cents) from payments p where p.document_id = ${documents.id}), 0)), 0)::bigint`,
    })
    .from(documents)
    .where(and(revenueDoc, sql`${documents.paidAt} is null`));
  const { runway: r } = await getSettings();
  const [cheapest] = await db
    .select({ price: packages.priceCents })
    .from(packages)
    .where(and(inArray(packages.kind, ['retainer', 'pilot']), eq(packages.active, true), sql`${packages.priceCents} > 0`))
    .orderBy(packages.priceCents)
    .limit(1);
  // Each client covers costs with what is left after delivering for them, not with the whole fee.
  const contribution = cheapest ? cheapest.price - r.directCostPerClientCents : 0;
  const [{ failed }] = await db
    .select({ failed: sql<number>`count(*)::int` })
    .from(messages)
    .where(and(eq(messages.status, 'failed'), gte(messages.createdAt, new Date(now.getTime() - 7 * DAY_MS))));
  const approvedKinds = new Set(
    (await db.selectDistinct({ kind: agreementTemplates.kind }).from(agreementTemplates).where(isNotNull(agreementTemplates.approvedAt))).map((r) => r.kind),
  );
  const inUse = new Set(
    (await db.select().from(engagements).where(inArray(engagements.stage, ['proposal', 'signed']))).map((e) => kindFor(e)),
  );
  if (!inUse.size) inUse.add('seller_exclusive');
  return {
    lawyerApproved: [...inUse].every((k) => approvedKinds.has(k)),
    mrrCents,
    dealsAgreed: await agreedDealsCount(),
    collectedThisMonthCents: Number(collected),
    owedCents: Number(owed),
    survival: cheapest && r.monthlyCostCents > 0 ? { needed: contribution > 0 ? Math.ceil(r.monthlyCostCents / contribution) : null, active: paying.length } : null,
    failedMessages: failed,
    lastTick: lastTick(),
  };
}
