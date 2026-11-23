import { and, eq, gte, inArray, isNotNull, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import { clients, engagements, messages, prospects, tasks } from '@/db/schema';
import { config } from '@/lib/config';
import { DAY_MS, SRI_LANKA_OFFSET_MS, sriLankaDay, sriLankaMidnight } from '@/lib/sl-time';
import { formatLkr } from '@/lib/money';
import { sendEmail } from '@/server/email';
import { sendSms } from '@/server/sms';
import { sendTrackedEmail } from '@/server/messaging';
import { addTask } from '@/server/notes-tasks';
import { issueRetainerInvoice, openInvoices, periodOf, portalUrl } from '@/server/billing';
import { expiryWatch, completionReminders } from '@/server/deal-sweeps';
import { getSettings } from '@/server/settings';

type Sweep = { name: string; run: (now: Date) => Promise<void> };

type TickerState = { started: boolean; running: boolean; lastTick: Date | null; lastErrors: { sweep: string; error: string; at: Date }[] };
const g = globalThis as typeof globalThis & { __vikkaaTicker?: TickerState };
const state: TickerState = (g.__vikkaaTicker ??= { started: false, running: false, lastTick: null, lastErrors: [] });

export const lastTick = () => state.lastTick;
export const recentTickErrors = () => state.lastErrors;

const minutesIntoSriLankaDay = (now: Date) => Math.floor(((now.getTime() + SRI_LANKA_OFFSET_MS) % DAY_MS) / 60_000);

/** Sends messages someone queued for later. A claimed row is marked "sending" first, so two runs never send it twice. */
async function dispatchDueMessages(now: Date): Promise<void> {
  // A row stuck in "sending" means the process died mid-send: mark it failed, never retry blindly.
  await db
    .update(messages)
    .set({ status: 'failed', lastError: 'Interrupted while sending; check before resending' })
    .where(and(eq(messages.status, 'sending'), lt(messages.sentAt, new Date(now.getTime() - 10 * 60_000))));

  const due = await db
    .select()
    .from(messages)
    // Only transactional mail is sent from the queue: anything else must go through sendTrackedEmail's consent checks.
    .where(and(eq(messages.status, 'queued'), eq(messages.purpose, 'transactional'), or(isNull(messages.scheduledAt), lte(messages.scheduledAt, now))))
    .limit(20);
  for (const m of due) {
    const [claimed] = await db
      .update(messages)
      .set({ status: 'sending', attempts: sql`${messages.attempts} + 1`, sentAt: now })
      .where(and(eq(messages.id, m.id), eq(messages.status, 'queued')))
      .returning();
    if (!claimed || !claimed.toAddress) continue;
    try {
      if (claimed.channel === 'email') await sendEmail({ to: claimed.toAddress, subject: claimed.subject ?? 'Vikkaa', text: claimed.body ?? '' });
      else if (claimed.channel === 'sms' && claimed.purpose === 'transactional') await sendSms(claimed.toAddress, claimed.body ?? '');
      else throw new Error(`Cannot send ${claimed.purpose} ${claimed.channel} automatically`);
      await db.update(messages).set({ status: 'sent' }).where(eq(messages.id, claimed.id));
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      const retry = claimed.attempts < 5 && !/Cannot send/.test(error);
      await db
        .update(messages)
        .set(retry ? { status: 'queued', lastError: error, scheduledAt: new Date(now.getTime() + 2 ** claimed.attempts * 60_000) } : { status: 'failed', lastError: error })
        .where(eq(messages.id, claimed.id));
    }
  }
}

/** On or after each retainer's billing day, the month's invoice is issued and emailed with a portal link. */
async function billRetainers(now: Date): Promise<void> {
  const today = sriLankaDay(now);
  const day = Number(today.slice(8, 10));
  const due = await db
    .select({ id: engagements.id, billingDay: engagements.billingDay, clientId: clients.id, clientName: clients.name, email: clients.email })
    .from(engagements)
    .innerJoin(clients, eq(engagements.clientId, clients.id))
    .where(
      and(
        isNotNull(engagements.signedAt),
        sql`${engagements.monthlyFeeCents} > 0`,
        sql`${engagements.stage} <> 'closed'`,
        or(isNull(engagements.retainerEndsOn), gte(engagements.retainerEndsOn, today)),
      ),
    );
  for (const r of due) {
    if (day < Math.min(r.billingDay ?? 1, 28)) continue;
    const { doc } = await issueRetainerInvoice(r.id, periodOf(now), now);
    if (!r.email || doc.paidAt || doc.voidedAt) continue;
    // Idempotent by dedupe key: sent once, and retried on the next run if the send failed.
    await sendTrackedEmail({
      to: r.email,
      subject: `Vikkaa invoice ${doc.number}`,
      body: `Hello ${r.clientName},\n\nYour monthly retainer invoice ${doc.number} for ${formatLkr(doc.totalCents ?? 0)} is ready, due by ${doc.dueOn}.\n\nSee it, and every enquiry on your listings, in your portal (link valid for 7 days):\n${portalUrl(r.clientId)}\n\nThank you,\nVikkaa`,
      purpose: 'transactional',
      subjectRef: { type: 'client', id: r.clientId },
      dedupeKey: `invoice-issued:${doc.id}`,
      now,
    });
  }
}

/** Gentle reminders 3 and 7 days after the due date; at 7 days a founder also gets a task to call. */
async function remindUnpaid(now: Date): Promise<void> {
  const today = sriLankaDay(now);
  for (const inv of await openInvoices()) {
    if (!inv.dueOn) continue;
    const overdueDays = Math.round((sriLankaMidnight(today).getTime() - sriLankaMidnight(inv.dueOn).getTime()) / DAY_MS);
    // The strongest reminder that applies; after downtime an invoice 7+ days late gets one email, not two.
    const steps = overdueDays >= 7 ? ([7] as const) : overdueDays >= 3 ? ([3] as const) : ([] as const);
    for (const step of steps) {
      if (inv.clientEmail) {
        await sendTrackedEmail({
          to: inv.clientEmail,
          subject: `Reminder: Vikkaa invoice ${inv.number}`,
          body: `Hello ${inv.clientName},\n\nA friendly reminder that invoice ${inv.number} for ${formatLkr((inv.totalCents ?? 0) - inv.paidSoFarCents)} was due on ${inv.dueOn}. If you have already paid, thank you, and please reply with the bank reference.\n\nYour portal (link valid for 7 days): ${portalUrl(inv.clientId)}\n\nVikkaa`,
          purpose: 'transactional',
          subjectRef: { type: 'client', id: inv.clientId },
          dedupeKey: `invoice-reminder:${step}:${inv.id}`,
          now,
        });
      }
      if (step === 7) {
        await addTask({ type: 'client', id: inv.clientId }, { title: `Call ${inv.clientName}: invoice ${inv.number} is a week overdue`, dueAt: now, dedupeKey: `invoice-overdue-task:${inv.id}` });
      }
    }
  }
}

/** 07:30 every day: what is due, what is owed, how close the gates are. Also the heartbeat: no brief means the ticker is down. */
async function morningBrief(now: Date): Promise<void> {
  if (minutesIntoSriLankaDay(now) < 7 * 60 + 30 || !config.staffNotifyEmails.length) return;
  const day = sriLankaDay(now);
  const endOfDay = new Date(sriLankaMidnight(day).getTime() + DAY_MS);
  const [{ due }] = await db
    .select({ due: sql<number>`count(*)::int` })
    .from(prospects)
    .where(and(inArray(prospects.status, ['new', 'contacted']), lte(prospects.nextActionAt, endOfDay)));
  const [{ open }] = await db.select({ open: sql<number>`count(*)::int` }).from(tasks).where(and(isNull(tasks.doneAt), lte(tasks.dueAt, endOfDay)));
  const invoices = await openInvoices();
  const overdue = invoices.filter((i) => i.dueOn && i.dueOn < day);
  const owed = invoices.reduce((s, i) => s + (i.totalCents ?? 0) - i.paidSoFarCents, 0);
  const { gates } = await getSettings();
  const daysTo = (d: string) => Math.round((sriLankaMidnight(d).getTime() - sriLankaMidnight(day).getTime()) / DAY_MS);
  const body = [
    `Good morning. ${day}`,
    '',
    `Outreach due today: ${due}`,
    `Tasks due or overdue: ${open}`,
    `Invoices overdue: ${overdue.length} · owed in total: ${formatLkr(owed)}`,
    `Gate A in ${daysTo(gates.a)} days · Gate B in ${daysTo(gates.b)} days · Gate C in ${daysTo(gates.c)} days`,
    '',
    `War room: ${config.appUrl}/studio`,
  ].join('\n');
  for (const to of config.staffNotifyEmails) {
    await sendTrackedEmail({ to, subject: `Vikkaa today: ${due} to contact, ${overdue.length} overdue`, body, purpose: 'transactional', dedupeKey: `brief:${day}:${to}`, now });
  }
}

export const SWEEPS: Sweep[] = [
  { name: 'dispatchDueMessages', run: dispatchDueMessages },
  { name: 'billRetainers', run: billRetainers },
  { name: 'remindUnpaid', run: remindUnpaid },
  { name: 'expiryWatch', run: expiryWatch },
  { name: 'completionReminders', run: completionReminders },
  { name: 'morningBrief', run: morningBrief },
];

/** One pass of every sweep. A failing sweep is logged and the others still run. Safe to run twice: every sweep is idempotent. */
export async function tick(now = new Date()): Promise<void> {
  for (const s of SWEEPS) {
    try {
      await s.run(now);
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      console.error(`[ticker] ${s.name} failed:`, err);
      state.lastErrors = [{ sweep: s.name, error, at: now }, ...state.lastErrors].slice(0, 10);
    }
  }
  state.lastTick = now;
}

/** Starts the once-a-minute loop (called from instrumentation.ts). Guarded so hot reloads never start a second loop. */
export function startTicker(intervalMs = 60_000): void {
  if (state.started) return;
  state.started = true;
  const run = async () => {
    if (state.running) return;
    state.running = true;
    try {
      await tick();
    } finally {
      state.running = false;
    }
  };
  setInterval(run, intervalMs).unref?.();
  setTimeout(run, 10_000).unref?.();
  console.info('[ticker] started');
}
