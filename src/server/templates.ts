import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { messageTemplates, type MessageChannel, type MessageTemplate } from '@/db/schema';

/** Placeholders a template may use. Anything else is rejected when saving, so a typo never reaches a client. */
export const TEMPLATE_VARS = ['firstName', 'company', 'founderName', 'pitchLink', 'area'] as const;
export type TemplateVars = Record<(typeof TEMPLATE_VARS)[number], string>;

/** A template problem staff can fix. */
export class TemplateError extends Error {}

const PLACEHOLDER = /\{(\w+)\}/g;

export function unknownPlaceholders(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER)].map((m) => m[1]).filter((v) => !(TEMPLATE_VARS as readonly string[]).includes(v));
}

export function render(text: string, vars: Partial<TemplateVars>): string {
  return text.replace(PLACEHOLDER, (_, k: string) => (vars as Record<string, string | undefined>)[k] ?? '').replace(/[ \t]+\n/g, '\n');
}

type Seed = { key: string; channel: MessageChannel; label: string; subject?: string; body: string };

/** Starter copy in the positioning voice: verified, specific, no hype. Founders edit it in Settings → Templates. */
export const DEFAULT_TEMPLATES: Seed[] = [
  {
    key: 'dealer_intro',
    channel: 'email',
    label: 'Dealer: first email',
    subject: 'Moving {company} stock faster',
    body: `Hi {firstName},

I'm {founderName} from Vikkaa. We film and market vehicles for dealers in the Western Province: proper photos, a walkaround film and reels, run on Facebook, Instagram, TikTok and YouTube at the same time, with every enquiry answered and logged for you.

Since the duty changes, buyers take longer to decide. Clear, honest presentation is what makes them pick up the phone.

I put together a short page showing what we would do for {company}:
{pitchLink}

Could I drop by for ten minutes this week?

{founderName}
Vikkaa.lk`,
  },
  {
    key: 'dealer_whatsapp',
    channel: 'whatsapp',
    label: 'Dealer: WhatsApp follow-up',
    body: `Hi {firstName}, {founderName} from Vikkaa here. I emailed about filming and marketing {company}'s stock. Here is the page I made for you: {pitchLink}
Could I visit for ten minutes this week?`,
  },
  {
    key: 'dealer_followup',
    channel: 'email',
    label: 'Dealer: last follow-up',
    subject: 'Last note from Vikkaa',
    body: `Hi {firstName},

Last note from me. If the timing is wrong, just reply "later" and I will check back next month. If you would like to see how we would present your stock, the page is here:

{pitchLink}

{founderName}
Vikkaa.lk`,
  },
  {
    key: 'developer_intro',
    channel: 'email',
    label: 'Developer: first email',
    subject: 'Selling {company} units with less waiting',
    body: `Hi {firstName},

I'm {founderName} from Vikkaa. We market property in the Western Province end to end: a market-priced plan, our own photo, drone and film shoot, one campaign across every platform, and every buyer handled and logged for you.

Sales have slowed even as prices rise, so each enquiry matters more. Our clients see every enquiry, viewing and rupee of ad spend live in their own portal.

Here is a page showing what a one-month pilot would look like for {company}:
{pitchLink}

Would a short visit this week work?

{founderName}
Vikkaa.lk`,
  },
  {
    key: 'developer_whatsapp',
    channel: 'whatsapp',
    label: 'Developer: WhatsApp follow-up',
    body: `Hi {firstName}, {founderName} from Vikkaa. I sent a short page about a one-month marketing pilot for {company}: {pitchLink}
Could we meet for ten minutes this week?`,
  },
  {
    key: 'developer_followup',
    channel: 'email',
    label: 'Developer: last follow-up',
    subject: 'A pilot you can measure',
    body: `Hi {firstName},

Last note from me. A pilot is one project page and one month of campaigning at a fixed price, with every enquiry counted in your portal. If it doesn't earn its place, you walk away.

{pitchLink}

{founderName}
Vikkaa.lk`,
  },
  {
    key: 'general_intro',
    channel: 'email',
    label: 'Others: first email',
    subject: 'Selling property properly, {firstName}',
    body: `Hi {firstName},

I'm {founderName} from Vikkaa. We price, film, market and sell property in the Western Province, and you can see every enquiry, viewing and offer live while we work.

Here is what that looks like: {pitchLink}

Would a short call this week help?

{founderName}
Vikkaa.lk`,
  },
  {
    key: 'general_whatsapp',
    channel: 'whatsapp',
    label: 'Others: WhatsApp follow-up',
    body: `Hi {firstName}, {founderName} from Vikkaa. Following up on my note about selling with us: {pitchLink}
Happy to answer anything here.`,
  },
  {
    key: 'general_followup',
    channel: 'email',
    label: 'Others: last follow-up',
    subject: 'Still here if you need us',
    body: `Hi {firstName},

Last note from me. Whenever you are ready to sell, we can start with a free price read for your property.

{pitchLink}

{founderName}
Vikkaa.lk`,
  },
];

export async function ensureDefaultTemplates(): Promise<void> {
  await db
    .insert(messageTemplates)
    .values(DEFAULT_TEMPLATES.map((t) => ({ key: t.key, channel: t.channel, label: t.label, subject: t.subject ?? null, body: t.body })))
    .onConflictDoNothing();
}

const ORDER = new Map(DEFAULT_TEMPLATES.map((t, i) => [t.key, i]));

/** In sending order: each segment's first email, WhatsApp, then last follow-up. */
export async function listTemplates(): Promise<MessageTemplate[]> {
  await ensureDefaultTemplates();
  const rows = await db.select().from(messageTemplates).orderBy(asc(messageTemplates.key));
  return rows.sort((a, b) => (ORDER.get(a.key) ?? 99) - (ORDER.get(b.key) ?? 99));
}

export async function getTemplate(key: string, channel: MessageChannel): Promise<MessageTemplate | undefined> {
  await ensureDefaultTemplates();
  const [t] = await db
    .select()
    .from(messageTemplates)
    .where(and(eq(messageTemplates.key, key), eq(messageTemplates.channel, channel), eq(messageTemplates.language, 'en'), eq(messageTemplates.active, true)));
  return t;
}

export async function saveTemplate(id: string, input: { subject: string | null; body: string; active: boolean }): Promise<void> {
  if (!input.body.trim()) throw new TemplateError('The message cannot be empty');
  const bad = unknownPlaceholders(`${input.subject ?? ''} ${input.body}`);
  if (bad.length) throw new TemplateError(`Unknown placeholder: ${bad.map((b) => `{${b}}`).join(', ')}. Use ${TEMPLATE_VARS.map((v) => `{${v}}`).join(' ')}`);
  await db.update(messageTemplates).set(input).where(eq(messageTemplates.id, id));
}
