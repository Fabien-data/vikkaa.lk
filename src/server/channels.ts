import { cache } from 'react';
import { and, asc, eq, isNotNull } from 'drizzle-orm';
import { db } from '@/db';
import { channelConnections, type ChannelConnection, type ChannelStatus } from '@/db/schema';

type ChannelDef = { key: string; label: string; group: 'social' | 'listing' | 'messaging' | 'ads' | 'trust' | 'infra'; public: boolean };

/** Every account Vikkaa runs. `public` channels may appear in the site footer once they have a URL. */
export const CHANNELS: readonly ChannelDef[] = [
  { key: 'facebook_page', label: 'Facebook Page', group: 'social', public: true },
  { key: 'instagram', label: 'Instagram', group: 'social', public: true },
  { key: 'tiktok', label: 'TikTok', group: 'social', public: true },
  { key: 'youtube', label: 'YouTube', group: 'social', public: true },
  { key: 'linkedin_company', label: 'LinkedIn (company)', group: 'social', public: true },
  { key: 'linkedin_founder_a', label: 'LinkedIn (founder A)', group: 'social', public: false },
  { key: 'linkedin_founder_b', label: 'LinkedIn (founder B)', group: 'social', public: false },
  { key: 'whatsapp_business', label: 'WhatsApp Business number', group: 'messaging', public: false },
  { key: 'whatsapp_channel', label: 'WhatsApp Channel', group: 'messaging', public: true },
  { key: 'google_business_profile', label: 'Google Business Profile', group: 'trust', public: true },
  { key: 'meta_business', label: 'Meta Business account', group: 'ads', public: false },
  { key: 'meta_ad_account', label: 'Meta ad account', group: 'ads', public: false },
  { key: 'ikman', label: 'ikman.lk', group: 'listing', public: false },
  { key: 'lankapropertyweb', label: 'LankaPropertyWeb', group: 'listing', public: false },
  { key: 'riyasewana', label: 'Riyasewana', group: 'listing', public: false },
  { key: 'email_domain', label: 'Email sending domain', group: 'infra', public: false },
  { key: 'sms_sender_id', label: 'SMS sender ID', group: 'infra', public: false },
];

const DEF = new Map(CHANNELS.map((c) => [c.key, c]));
export const channelDef = (key: string) => DEF.get(key);

/** A channel value staff can fix. */
export class ChannelError extends Error {}

export async function ensureChannels(): Promise<void> {
  await db
    .insert(channelConnections)
    .values(CHANNELS.map((c, i) => ({ key: c.key, sortOrder: i })))
    .onConflictDoNothing();
}

export async function listChannels(): Promise<ChannelConnection[]> {
  await ensureChannels();
  return db.select().from(channelConnections).orderBy(asc(channelConnections.sortOrder));
}

export type ChannelInput = { handle: string | null; url: string | null; status: ChannelStatus; showInFooter: boolean; notes: string | null; externalId?: string | null };

export async function saveChannel(key: string, input: ChannelInput): Promise<void> {
  if (!DEF.has(key)) throw new ChannelError('Unknown channel');
  if (input.url) {
    let parsed: URL;
    try {
      parsed = new URL(input.url);
    } catch {
      throw new ChannelError('Enter the full link, starting with https://');
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') throw new ChannelError('Links must start with https://');
  }
  // A saved handle or link moves a blank channel along, so the list shows real progress.
  const status = input.status === 'not_set' && (input.handle || input.url) ? 'handle_saved' : input.status;
  await ensureChannels();
  await db
    .update(channelConnections)
    .set({ handle: input.handle, url: input.url, status, showInFooter: input.showInFooter, notes: input.notes, externalId: input.externalId ?? null })
    .where(eq(channelConnections.key, key));
}

/** Channels shown on the public site: public kind, has a link, and not hidden by staff. */
export const publicChannels = cache(async (): Promise<{ key: string; label: string; url: string }[]> => {
  const rows = await db
    .select({ key: channelConnections.key, url: channelConnections.url })
    .from(channelConnections)
    .where(and(isNotNull(channelConnections.url), eq(channelConnections.showInFooter, true)))
    .orderBy(asc(channelConnections.sortOrder));
  return rows.flatMap((r) => {
    const def = DEF.get(r.key);
    return def?.public && r.url ? [{ key: r.key, label: def.label.replace(/ \(company\)| Page| Profile/g, ''), url: r.url }] : [];
  });
});
