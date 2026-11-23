import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { db } from '@/db';
import { messages, packages, prospects, user, type Package, type Prospect, type ProspectSegment } from '@/db/schema';
import { config } from '@/lib/config';
import { normalisePhone } from '@/lib/phone';
import { addTask } from '@/server/notes-tasks';
import { sendEmail } from '@/server/email';
import { recordConsent, recordOutreachBasis } from '@/server/consent';
import { findProspectByPhone, quickAdd } from '@/server/prospects';

/** Link-preview fetchers and crawlers: WhatsApp and Facebook fetch a link the moment it is sent. */
const BOT = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|linkedin|skype|curl|wget|python|headless|lighthouse/i;

const PACKAGE_SEGMENT: Record<ProspectSegment, string> = { dealer: 'dealer', developer: 'developer', private: 'private', overseas: 'overseas', agent: 'private', other: 'private' };

export type Pitch = { prospect: Prospect; offers: Package[]; founding: Package | undefined };

export async function getPitch(token: string): Promise<Pitch | null> {
  if (!/^[a-f0-9]{32}$/.test(token)) return null;
  const [prospect] = await db.select().from(prospects).where(eq(prospects.pitchToken, token));
  if (!prospect) return null;
  const all = await db
    .select()
    .from(packages)
    .where(and(eq(packages.active, true), eq(packages.segment, PACKAGE_SEGMENT[prospect.segment])))
    .orderBy(asc(packages.sortOrder), asc(packages.priceCents));
  return { prospect, offers: all.filter((p) => !p.founding), founding: all.find((p) => p.founding) };
}

/**
 * Counts a real view of a pitch page. The first view creates a follow-up task for the owner:
 * a view is interest, not permission to call, so the task points back to what was agreed.
 * Returns `first: true` only once, so the caller can send one alert.
 */
export async function recordPitchView(token: string, opts: { userAgent?: string | null; preview?: boolean } = {}, now = new Date()): Promise<{ first: boolean; prospect: Prospect } | null> {
  if (opts.preview || BOT.test(opts.userAgent ?? '')) return null;
  const [firstHit] = await db
    .update(prospects)
    .set({ pitchFirstViewedAt: now })
    .where(and(eq(prospects.pitchToken, token), isNull(prospects.pitchFirstViewedAt)))
    .returning({ id: prospects.id });
  const [prospect] = await db
    .update(prospects)
    .set({ pitchViews: sql`${prospects.pitchViews} + 1`, pitchLastViewedAt: now })
    .where(eq(prospects.pitchToken, token))
    .returning();
  if (!prospect) return null;
  if (firstHit) {
    await addTask({ type: 'prospect', id: prospect.id }, { title: `${prospect.name} opened their pitch page: follow up as agreed`, dueAt: now, assignedUserId: prospect.ownerUserId, dedupeKey: `pitch-view:${prospect.id}` });
  }
  return { first: Boolean(firstHit), prospect };
}

async function staffInbox(ownerUserId: string | null): Promise<string[]> {
  if (ownerUserId) {
    const [u] = await db.select({ email: user.email }).from(user).where(eq(user.id, ownerUserId));
    if (u?.email) return [u.email];
  }
  return config.staffNotifyEmails;
}

/** Internal alert to the founders. A failure is logged, never thrown: the visitor's action already succeeded. */
export async function alertStaff(prospect: Pick<Prospect, 'id' | 'ownerUserId'>, subject: string, text: string): Promise<void> {
  const to = await staffInbox(prospect.ownerUserId);
  if (!to.length) return;
  try {
    await sendEmail({ to, subject, text: `${text}\n\n${config.appUrl}/studio/prospects/${prospect.id}` });
  } catch (err) {
    console.error('Staff alert failed', err);
  }
}

/** A prospect pressed "Request a call" on their page: they replied, so the cadence stops and a call task appears. */
export async function requestCall(token: string, input: { phone?: string | null; note?: string | null }, now = new Date()): Promise<Prospect | null> {
  const [p] = await db.select().from(prospects).where(eq(prospects.pitchToken, token));
  if (!p) return null;
  const phone = input.phone?.trim() ? normalisePhone(input.phone) : null;
  await db.insert(messages).values({
    channel: 'call',
    direction: 'in',
    purpose: 'outreach',
    status: 'logged',
    subjectType: 'prospect',
    subjectId: p.id,
    toAddress: phone ?? p.phone,
    outcome: 'call_requested',
    body: input.note?.trim() || null,
    sentAt: now,
  });
  if (!p.phone && phone && !(await findProspectByPhone(phone))) await db.update(prospects).set({ phone }).where(eq(prospects.id, p.id));
  if (phone ?? p.phone) await recordOutreachBasis((phone ?? p.phone)!, 'inbound_request', { note: 'Pressed "Request a call" on their pitch page', at: now });
  await db
    .update(prospects)
    .set({ status: 'replied', statusChangedAt: now, nextActionAt: null })
    .where(and(eq(prospects.id, p.id), inArray(prospects.status, ['new', 'contacted', 'nurture'])));
  await addTask({ type: 'prospect', id: p.id }, { title: `${p.name} asked for a call${phone ? ` on ${phone}` : ''}`, dueAt: now, assignedUserId: p.ownerUserId });
  return p;
}

export type InboundInput = {
  segment: 'dealer' | 'developer';
  name: string;
  contactName?: string | null;
  phone: string;
  email?: string | null;
  area?: string | null;
  note?: string | null;
  utm?: Record<string, string>;
  updatesConsent?: boolean;
};

/** A dealer or developer filled in a form on the site. New ones join the prospect list as "replied"; known ones get a task. */
export async function recordInbound(input: InboundInput, now = new Date()): Promise<Prospect> {
  const phone = normalisePhone(input.phone);
  if (!phone) throw new Error('Invalid phone');
  let p = await findProspectByPhone(phone);
  if (!p) {
    p = await quickAdd({ name: input.name, segment: input.segment, contactName: input.contactName, phone, email: input.email, area: input.area, stockNote: input.note, source: 'website', utm: input.utm ?? null }, now);
  }
  await db.insert(messages).values({
    channel: 'email',
    direction: 'in',
    purpose: 'outreach',
    status: 'logged',
    subjectType: 'prospect',
    subjectId: p.id,
    toAddress: phone,
    outcome: 'website_form',
    body: input.note?.trim() || null,
    sentAt: now,
  });
  if (p.status === 'new' || p.status === 'contacted' || p.status === 'nurture') {
    await db.update(prospects).set({ status: 'replied', statusChangedAt: now, nextActionAt: null }).where(eq(prospects.id, p.id));
  }
  await recordOutreachBasis(phone, 'inbound_request', { note: `${input.segment} page form`, at: now });
  if (input.email) await recordOutreachBasis(input.email, 'inbound_request', { note: `${input.segment} page form`, at: now });
  if (input.updatesConsent) {
    await recordConsent({ contact: phone, purpose: 'marketing', granted: true, source: `${input.segment}_page`, at: now });
    if (input.email) await recordConsent({ contact: input.email, purpose: 'marketing', granted: true, source: `${input.segment}_page`, at: now });
  }
  await addTask({ type: 'prospect', id: p.id }, { title: `New ${input.segment} enquiry from the website: call within the day`, dueAt: now, assignedUserId: p.ownerUserId });
  return p;
}
