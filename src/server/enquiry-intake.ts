import { and, eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets, enquiries, evidenceEntries, type Channel } from '@/db/schema';
import { config } from '@/lib/config';
import { upsertBuyerByPhone } from '@/server/buyers';
import { appendEvidence } from '@/server/evidence-log';
import { sendEmail } from '@/server/email';

/** A buyer enquiry about an asset: buyer record, enquiry row, evidence entry, staff email. Phone must be E.164. */
export async function recordEnquiry(
  assetId: string,
  input: { name: string; phone: string; email?: string; message?: string; circle?: boolean },
  channel: Channel = 'web_form',
): Promise<{ enquiryId: string; type: 'first_contact' | 'contact' }> {
  const now = new Date();
  const buyer = await upsertBuyerByPhone(input.phone, {
    name: input.name,
    email: input.email,
    source: channel,
    privacyAcceptedAt: now,
    circleConsentAt: input.circle ? now : undefined,
  });
  const [enquiry] = await db.insert(enquiries).values({ assetId, buyerId: buyer.id, channel, message: input.message || null }).returning();

  const [seen] = await db
    .select({ id: evidenceEntries.id })
    .from(evidenceEntries)
    .where(and(eq(evidenceEntries.assetId, assetId), eq(evidenceEntries.buyerId, buyer.id)))
    .limit(1);
  const type = seen ? 'contact' : 'first_contact';
  await appendEvidence({ assetId, buyerId: buyer.id, type, channel, happenedAt: now, data: { enquiryId: enquiry.id } });

  if (config.staffNotifyEmails.length) {
    const [asset] = await db.select({ title: assets.title }).from(assets).where(eq(assets.id, assetId));
    try {
      await sendEmail({
        to: config.staffNotifyEmails,
        subject: `New enquiry: ${asset?.title ?? 'listing'}`,
        text: `${input.name} (${input.phone}) asked about ${asset?.title}:\n\n${input.message ?? ''}\n\nReply within the day.`,
      });
    } catch (err) {
      console.error('New enquiry email failed', err);
    }
  }
  return { enquiryId: enquiry.id, type };
}
