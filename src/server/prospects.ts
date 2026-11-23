import { createHash } from 'node:crypto';
import { and, asc, desc, eq, inArray, isNull, lte, or, sql } from 'drizzle-orm';
import { db } from '@/db';
import {
  clients,
  engagements,
  messages,
  prospects,
  user,
  type Message,
  type Prospect,
  type ProspectSegment,
  type ProspectStatus,
} from '@/db/schema';
import { config } from '@/lib/config';
import type { ClientType, EngagementType } from '@/lib/enums';
import { normalisePhone } from '@/lib/phone';
import { DEFAULT_ORG_ID } from '@/lib/rules';
import { DAY_MS, sriLankaDay, sriLankaMidnight } from '@/lib/sl-time';
import { canSend, contactKey, isDoNotContact, recordOutreachBasis, withdrawAll, type OutreachBasis } from '@/server/consent';
import { sendTrackedEmail, whatsappDraft, type SendResult } from '@/server/messaging';
import { applyPackage } from '@/server/packages';
import { getSettings } from '@/server/settings';
import { getTemplate, render, type TemplateVars } from '@/server/templates';

/** A prospect problem staff can fix. */
export class ProspectError extends Error {}

export type CadenceStep = { day: number; channel: 'email' | 'whatsapp' | 'call'; template?: string };

const steps = (prefix: string): CadenceStep[] => [
  { day: 0, channel: 'email', template: `${prefix}_intro` },
  { day: 2, channel: 'whatsapp', template: `${prefix}_whatsapp` },
  { day: 4, channel: 'call' },
  { day: 8, channel: 'email', template: `${prefix}_followup` },
];

/** Who gets contacted how, and when (days after the first touch). Human-paced: nothing sends without a founder's click. */
export const CADENCE: Record<ProspectSegment, CadenceStep[]> = {
  dealer: steps('dealer'),
  developer: steps('developer'),
  agent: steps('general'),
  private: steps('general'),
  overseas: steps('general'),
  other: steps('general'),
};

/** Statuses where the cadence keeps running. Anything later is handled by hand. */
const ACTIVE: ProspectStatus[] = ['new', 'contacted'];

const reachable = (step: CadenceStep, p: Pick<Prospect, 'phone' | 'email'>) => (step.channel === 'email' ? Boolean(p.email) : Boolean(p.phone));

/** The step this prospect is on (skipping channels we have no address for), or null when the cadence is over. */
export function currentStep(p: Pick<Prospect, 'segment' | 'cadenceStep' | 'phone' | 'email' | 'status'>): { index: number; step: CadenceStep } | null {
  if (!ACTIVE.includes(p.status)) return null;
  const list = CADENCE[p.segment];
  for (let i = p.cadenceStep; i < list.length; i++) if (reachable(list[i], p)) return { index: i, step: list[i] };
  return null;
}

export const pitchUrl = (p: Pick<Prospect, 'pitchToken'>) => `${config.publicUrl}/for/${p.pitchToken}`;

export function templateVars(p: Prospect, founderName: string): TemplateVars {
  return {
    // A business name is not a person: without a contact name, greet politely instead of "Hi Lanka,".
    firstName: p.contactName?.trim() ? p.contactName.trim().split(/\s+/)[0] : 'there',
    company: p.name,
    founderName,
    pitchLink: pitchUrl(p),
    area: p.area ?? p.district ?? 'the Western Province',
  };
}

export type ProspectInput = {
  name: string;
  segment: ProspectSegment;
  phone?: string | null;
  email?: string | null;
  contactName?: string | null;
  contactRole?: string | null;
  district?: string | null;
  area?: string | null;
  links?: string | null;
  stockNote?: string | null;
  diagnosis?: string | null;
  agreedNextStep?: string | null;
  source?: string | null;
  utm?: Record<string, string> | null;
  ownerUserId?: string | null;
};

function clean(input: ProspectInput) {
  const name = input.name.trim();
  if (!name) throw new ProspectError('Enter the business or person name');
  const phone = input.phone?.trim() ? normalisePhone(input.phone) : null;
  if (input.phone?.trim() && !phone) throw new ProspectError('Enter a valid phone number');
  const email = input.email?.trim() ? input.email.trim().toLowerCase() : null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ProspectError('Enter a valid email address');
  return { ...input, name, phone, email };
}

export async function findProspectByPhone(phone: string): Promise<Prospect | undefined> {
  const [p] = await db.select().from(prospects).where(and(eq(prospects.organizationId, DEFAULT_ORG_ID), eq(prospects.phone, phone)));
  return p;
}

/** Adds a prospect, due for its first touch today. A phone already on the list is refused with the existing name. */
export async function quickAdd(input: ProspectInput, now = new Date()): Promise<Prospect> {
  const v = clean(input);
  if (!v.phone && !v.email) throw new ProspectError('Add a phone number or an email address');
  if (v.phone) {
    const existing = await findProspectByPhone(v.phone);
    if (existing) throw new ProspectError(`Already on your list: ${existing.name}`);
  }
  const [p] = await db.insert(prospects).values({ ...v, nextActionAt: now }).returning();
  return p;
}

export async function updateProspect(id: string, input: ProspectInput): Promise<void> {
  const v = clean(input);
  if (v.phone) {
    const existing = await findProspectByPhone(v.phone);
    if (existing && existing.id !== id) throw new ProspectError(`That phone number belongs to ${existing.name}`);
  }
  await db.update(prospects).set(v).where(eq(prospects.id, id));
}

export async function getProspect(id: string): Promise<Prospect> {
  const [p] = await db.select().from(prospects).where(eq(prospects.id, id));
  if (!p) throw new ProspectError('Prospect not found');
  return p;
}

export async function setStatus(id: string, status: ProspectStatus, opts: { lostReason?: string | null; now?: Date } = {}): Promise<void> {
  const p = await getProspect(id);
  const now = opts.now ?? new Date();
  const back = { ...p, status };
  // Back into the running statuses: pick the cadence up where it stopped. Anything else stops it.
  const nextActionAt = ACTIVE.includes(status) ? (currentStep(back) ? now : null) : null;
  await db
    .update(prospects)
    .set({ status, statusChangedAt: now, nextActionAt, lostReason: status === 'lost' ? (opts.lostReason ?? p.lostReason) : null })
    .where(eq(prospects.id, id));
}

/** Moves to the next reachable step and schedules it relative to the step just done. */
async function advance(p: Prospect, now: Date): Promise<void> {
  const cur = currentStep(p);
  const list = CADENCE[p.segment];
  const from = cur?.index ?? p.cadenceStep;
  const next = currentStep({ ...p, cadenceStep: from + 1, status: 'contacted' });
  const gap = next && cur ? next.step.day - cur.step.day : 0;
  await db
    .update(prospects)
    .set({
      cadenceStep: next ? next.index : list.length,
      nextActionAt: next ? new Date(now.getTime() + Math.max(gap, 1) * DAY_MS) : null,
      ...(p.status === 'new' ? { status: 'contacted' as const, statusChangedAt: now } : {}),
    })
    .where(eq(prospects.id, p.id));
}

export type Touch = { channel: 'call' | 'visit' | 'meeting' | 'whatsapp' | 'email'; outcome: string; note?: string | null; templateKey?: string; body?: string | null };

/** Records a manual touch (call, visit, WhatsApp sent from a phone…) and moves the cadence on. */
export async function logTouch(prospectId: string, touch: Touch, userId: string, now = new Date()): Promise<void> {
  const p = await getProspect(prospectId);
  await db.insert(messages).values({
    channel: touch.channel,
    purpose: 'outreach',
    status: 'logged',
    subjectType: 'prospect',
    subjectId: p.id,
    toAddress: touch.channel === 'email' ? p.email : p.phone,
    fromUserId: userId,
    templateKey: touch.templateKey,
    body: touch.body ?? touch.note ?? null,
    outcome: touch.outcome,
    sentAt: now,
  });
  const step = currentStep(p);
  // Only the touch the cadence asked for moves it on; extra calls or visits are just logged.
  if (step && (step.step.channel === touch.channel || touch.outcome === 'skipped')) await advance(p, now);
  else if (p.status === 'new') await db.update(prospects).set({ status: 'contacted', statusChangedAt: now }).where(eq(prospects.id, p.id));
}

export async function skipStep(prospectId: string, userId: string, now = new Date()): Promise<void> {
  const p = await getProspect(prospectId);
  const step = currentStep(p);
  if (!step) return;
  await logTouch(prospectId, { channel: step.step.channel, outcome: 'skipped' }, userId, now);
}

async function staffUser(userId: string) {
  const [u] = await db.select({ id: user.id, name: user.name, email: user.email }).from(user).where(eq(user.id, userId));
  if (!u) throw new ProspectError('Unknown staff member');
  return u;
}

/** Fingerprint of the exact copy a founder reviewed; a send with a different fingerprint is refused. */
export const copyHash = (subject: string, body: string) => createHash('sha256').update(`${subject}

${body}`).digest('hex');

/** Records how we may contact this prospect, against each address they gave. */
export async function recordProspectBasis(prospectId: string, basis: OutreachBasis, note: string | null, userId: string, now = new Date()): Promise<void> {
  const p = await getProspect(prospectId);
  const contacts = [p.phone, p.email].filter((c) => contactKey(c));
  if (!contacts.length) throw new ProspectError('Add a phone number or an email address first');
  for (const c of contacts) await recordOutreachBasis(c!, basis, { note, recordedByUserId: userId, at: now });
}

/** True if any of the prospect's addresses has a contact basis that has not been withdrawn. */
export async function hasContactBasis(p: Pick<Prospect, 'phone' | 'email'>): Promise<boolean> {
  for (const c of [p.phone, p.email]) if (contactKey(c) && (await canSend(c!, 'outreach'))) return true;
  return false;
}

/**
 * Sends the prospect's due cadence email from this founder. The cadence moves on only if it was sent.
 * With `reviewedHash`, the email goes only if its copy is exactly what the founder reviewed.
 */
export async function sendStepEmail(prospectId: string, userId: string, now = new Date(), reviewedHash?: string): Promise<SendResult> {
  const p = await getProspect(prospectId);
  const step = currentStep(p);
  if (!step || step.step.channel !== 'email' || !step.step.template) return { status: 'blocked', reason: 'No email is due for this prospect' };
  const t = await getTemplate(step.step.template, 'email');
  if (!t) return { status: 'blocked', reason: `Template ${step.step.template} is missing or switched off` };
  const sender = await staffUser(userId);
  const vars = templateVars(p, sender.name);
  const subject = render(t.subject ?? '', vars);
  const body = render(t.body, vars);
  if (reviewedHash && reviewedHash !== copyHash(subject, body)) return { status: 'blocked', reason: 'The email changed since you reviewed it. Reload and check it again' };
  const result = await sendTrackedEmail({
    to: p.email!,
    subject,
    body,
    purpose: 'outreach',
    fromUser: sender,
    subjectRef: { type: 'prospect', id: p.id },
    templateKey: t.key,
    dedupeKey: `outreach:${p.id}:${step.index}`,
    now,
  });
  if (result.status === 'sent') await advance(p, now);
  return result;
}

/**
 * The one-click batch: sends every chosen due email whose copy still matches what the founder reviewed,
 * stopping at the first limit so nothing is half-sent. Consent is rechecked per email at send time.
 */
export async function sendAllDue(reviewed: { id: string; hash: string }[], userId: string, now = new Date()): Promise<{ sent: number; problems: string[] }> {
  let sent = 0;
  const problems: string[] = [];
  for (const { id, hash } of reviewed) {
    const r = await sendStepEmail(id, userId, now, hash);
    if (r.status === 'sent') sent++;
    else {
      const [p] = await db.select({ name: prospects.name }).from(prospects).where(eq(prospects.id, id));
      problems.push(`${p?.name ?? id}: ${r.reason}`);
      if (/limit|hours/i.test(r.reason)) break;
    }
  }
  return { sent, problems };
}

export type QueueItem = {
  prospect: Prospect;
  step: CadenceStep;
  index: number;
  email?: { subject: string; body: string; hash: string };
  whatsapp?: { text: string; link: string | null };
  doNotContact: boolean;
  /** False until a founder records how we may contact them (or they wrote to us). */
  hasBasis: boolean;
};

const endOfToday = (now: Date) => new Date(sriLankaMidnight(sriLankaDay(now)).getTime() + DAY_MS);

/** Today's outreach for one founder: their prospects plus unassigned ones whose next step is due. */
export async function todayQueue(userId: string, now = new Date()): Promise<QueueItem[]> {
  const sender = await staffUser(userId);
  const due = await db
    .select()
    .from(prospects)
    .where(and(inArray(prospects.status, ACTIVE), lte(prospects.nextActionAt, endOfToday(now)), or(eq(prospects.ownerUserId, userId), isNull(prospects.ownerUserId))))
    .orderBy(asc(prospects.nextActionAt))
    .limit(100);
  const items: QueueItem[] = [];
  for (const p of due) {
    const cur = currentStep(p);
    if (!cur) continue;
    const doNotContact = (await isDoNotContact(p.phone)) || (await isDoNotContact(p.email));
    const vars = templateVars(p, sender.name);
    const item: QueueItem = { prospect: p, step: cur.step, index: cur.index, doNotContact, hasBasis: !doNotContact && (await hasContactBasis(p)) };
    if (cur.step.template) {
      const t = await getTemplate(cur.step.template, cur.step.channel === 'email' ? 'email' : 'whatsapp');
      if (t && cur.step.channel === 'email') {
        const subject = render(t.subject ?? '', vars);
        const body = render(t.body, vars);
        item.email = { subject, body, hash: copyHash(subject, body) };
      }
      if (t && cur.step.channel === 'whatsapp') {
        const text = render(t.body, vars);
        item.whatsapp = { text, link: await whatsappDraft(p.phone, text, 'outreach') };
      }
    }
    items.push(item);
  }
  return items;
}

/** Records that the pre-filled WhatsApp for the current step was sent from a phone. */
export async function markWhatsappSent(prospectId: string, userId: string, now = new Date()): Promise<void> {
  const p = await getProspect(prospectId);
  const cur = currentStep(p);
  if (!cur || cur.step.channel !== 'whatsapp') throw new ProspectError('No WhatsApp message is due for this prospect');
  const sender = await staffUser(userId);
  const t = cur.step.template ? await getTemplate(cur.step.template, 'whatsapp') : undefined;
  await logTouch(prospectId, { channel: 'whatsapp', outcome: 'sent', templateKey: t?.key, body: t ? render(t.body, templateVars(p, sender.name)) : null }, userId, now);
}

/** "Do not contact": every channel withdrawn, prospect closed as lost. */
export async function markDoNotContact(prospectId: string, userId: string, now = new Date()): Promise<void> {
  const p = await getProspect(prospectId);
  for (const c of [p.phone, p.email]) if (contactKey(c)) await withdrawAll(c!, 'studio_do_not_contact', userId);
  await db.update(prospects).set({ status: 'lost', statusChangedAt: now, nextActionAt: null, lostReason: 'Asked not to be contacted' }).where(eq(prospects.id, p.id));
}

export async function prospectTimeline(prospectId: string): Promise<(Message & { fromName: string | null })[]> {
  const rows = await db
    .select({ m: messages, fromName: user.name })
    .from(messages)
    .leftJoin(user, eq(messages.fromUserId, user.id))
    .where(and(eq(messages.subjectType, 'prospect'), eq(messages.subjectId, prospectId)))
    .orderBy(desc(messages.createdAt));
  return rows.map((r) => ({ ...r.m, fromName: r.fromName }));
}

const CLIENT_TYPE: Record<ProspectSegment, ClientType> = { dealer: 'dealer', developer: 'developer', agent: 'agent', private: 'private', overseas: 'overseas', other: 'private' };
const ENGAGEMENT_TYPE: Record<ProspectSegment, EngagementType> = { dealer: 'retainer', developer: 'project', agent: 'single', private: 'single', overseas: 'single', other: 'single' };

/**
 * Won: the prospect becomes a client with an engagement, entered once. Reuses a client with the same phone.
 * The package (if chosen) fills the engagement's terms.
 */
export async function convertToClient(prospectId: string, opts: { packageId?: string | null; now?: Date } = {}): Promise<{ clientId: string; engagementId: string }> {
  const p = await getProspect(prospectId);
  if (!p.phone) throw new ProspectError('Add a phone number before converting: clients are identified by phone');
  const { commission } = await getSettings();
  const now = opts.now ?? new Date();
  const type = ENGAGEMENT_TYPE[p.segment];
  const result = await db.transaction(async (tx) => {
    let [client] = await tx.select().from(clients).where(and(eq(clients.organizationId, DEFAULT_ORG_ID), eq(clients.phone, p.phone!)));
    client ??= (
      await tx
        .insert(clients)
        .values({ type: CLIENT_TYPE[p.segment], name: p.name, phone: p.phone!, email: p.email, source: p.source ?? `prospect:${p.segment}`, notes: p.stockNote })
        .returning()
    )[0];
    const retainer = type === 'retainer';
    const [e] = await tx
      .insert(engagements)
      .values({
        clientId: client.id,
        type,
        stage: 'call',
        commissionRateBp: retainer ? commission.vehicleBp : commission.propertyBp,
        commissionMinCents: retainer ? commission.vehicleMinCents : 0,
        billingDay: retainer ? 1 : null,
        exclusiveDays: commission.exclusiveDays,
        followOnMonths: commission.followOnMonths,
      })
      .returning();
    await tx.update(prospects).set({ clientId: client.id, status: 'won', statusChangedAt: now, nextActionAt: null }).where(eq(prospects.id, p.id));
    return { clientId: client.id, engagementId: e.id };
  });
  if (opts.packageId) await applyPackage(result.engagementId, opts.packageId);
  return result;
}

/** A seller who fills the public form with a prospect's phone: link the two so nothing is entered twice. */
export async function linkProspectToClient(phone: string, clientId: string, now = new Date()): Promise<void> {
  await db
    .update(prospects)
    .set({ clientId, status: 'won', statusChangedAt: now, nextActionAt: null })
    .where(and(eq(prospects.organizationId, DEFAULT_ORG_ID), eq(prospects.phone, phone), isNull(prospects.clientId)));
}

export async function listProspects(filter: { status?: ProspectStatus; q?: string } = {}) {
  const q = filter.q?.trim();
  return db
    .select()
    .from(prospects)
    .where(
      and(
        filter.status ? eq(prospects.status, filter.status) : undefined,
        q ? sql`(${prospects.name} ilike ${'%' + q + '%'} or ${prospects.phone} ilike ${'%' + q + '%'} or ${prospects.area} ilike ${'%' + q + '%'})` : undefined,
      ),
    )
    .orderBy(sql`${prospects.nextActionAt} asc nulls last`, desc(prospects.createdAt))
    .limit(300);
}
