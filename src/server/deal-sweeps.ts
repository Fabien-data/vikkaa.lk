import { and, eq, gt, inArray, isNotNull, lte, ne, sql } from 'drizzle-orm';
import { db } from '@/db';
import { assets, clients, deals, engagements } from '@/db/schema';
import { DAY_MS, sriLankaDay, sriLankaMidnight } from '@/lib/sl-time';
import { addTask } from '@/server/notes-tasks';
import { sendTrackedEmail } from '@/server/messaging';
import { advanceAsset } from '@/server/pipeline';
import { portalUrl } from '@/server/billing';

const addMonths = (d: Date, months: number) => {
  const out = new Date(d);
  out.setUTCMonth(out.getUTCMonth() + months);
  return out;
};

/**
 * The end of each exclusive period, handled on time:
 * - 14 days before: a task to review the price or plan a refresh, and an email to the client with their options.
 * - At the end: live listings become "agreement ended"; listings under offer get a task instead.
 * - 14 days before the follow-on window closes: a task to check for sales to introduced buyers.
 * - Retainers: a renewal task 14 days before the retainer's end date.
 */
export async function expiryWatch(now: Date): Promise<void> {
  const soon = new Date(now.getTime() + 14 * DAY_MS);
  const ending = await db
    .select({ e: engagements, clientName: clients.name, clientEmail: clients.email, clientId: clients.id })
    .from(engagements)
    .innerJoin(clients, eq(engagements.clientId, clients.id))
    .where(and(isNotNull(engagements.endsAt), ne(engagements.stage, 'closed'), sql`${engagements.monthlyFeeCents} = 0`));

  for (const { e, clientName, clientEmail, clientId } of ending) {
    const endsAt = e.endsAt!;
    if (endsAt > now && endsAt <= soon) {
      await addTask({ type: 'engagement', id: e.id }, { title: `${clientName}: agreement ends ${sriLankaDay(endsAt)}. Review the price or plan a refresh.`, dueAt: now, dedupeKey: `expiry-14:${e.id}` });
      if (clientEmail) {
        await sendTrackedEmail({
          to: clientEmail,
          subject: 'Your Vikkaa agreement ends in two weeks',
          body: `Hello ${clientName},\n\nYour exclusive agreement with Vikkaa ends on ${sriLankaDay(endsAt)}. We will call you to talk through the options: a price review, a refresh campaign, or closing the file.\n\nYour portal (link valid for 7 days): ${portalUrl(clientId)}\n\nVikkaa`,
          purpose: 'transactional',
          subjectRef: { type: 'client', id: clientId },
          dedupeKey: `expiry-14-email:${e.id}`,
          now,
        });
      }
    }
    if (endsAt <= now) {
      const list = await db.select().from(assets).where(and(eq(assets.engagementId, e.id), inArray(assets.status, ['live', 'under_offer'])));
      for (const a of list) {
        if (a.status === 'live') await advanceAsset(a.id, 'expired');
        else await addTask({ type: 'asset', id: a.id }, { title: `${a.title} is under offer but the agreement has ended. Agree an extension or complete the sale.`, dueAt: now, dedupeKey: `expiry-underoffer:${a.id}` });
      }
      const followOnEnd = addMonths(endsAt, e.followOnMonths);
      if (followOnEnd > now && followOnEnd.getTime() - now.getTime() <= 14 * DAY_MS) {
        await addTask({ type: 'engagement', id: e.id }, { title: `${clientName}: follow-on period ends ${sriLankaDay(followOnEnd)}. Check whether any introduced buyer bought.`, dueAt: now, dedupeKey: `followon-14:${e.id}` });
      }
    }
  }

  const today = sriLankaDay(now);
  const renewals = await db
    .select({ id: engagements.id, ends: engagements.retainerEndsOn, clientName: clients.name })
    .from(engagements)
    .innerJoin(clients, eq(engagements.clientId, clients.id))
    .where(and(isNotNull(engagements.retainerEndsOn), sql`${engagements.monthlyFeeCents} > 0`, ne(engagements.stage, 'closed'), gt(engagements.retainerEndsOn, today)));
  for (const r of renewals) {
    if (sriLankaMidnight(r.ends!).getTime() - now.getTime() <= 14 * DAY_MS) {
      await addTask({ type: 'engagement', id: r.id }, { title: `${r.clientName}: retainer ends ${r.ends}. Agree the renewal.`, dueAt: now, dedupeKey: `retainer-renewal:${r.id}:${r.ends}` });
    }
  }
}

/** Three days before a deed signing or transfer: confirm the appointment and bring the commission invoice. */
export async function completionReminders(now: Date): Promise<void> {
  const inThreeDays = sriLankaDay(new Date(now.getTime() + 3 * DAY_MS));
  const due = await db
    .select({ d: deals, title: assets.title })
    .from(deals)
    .innerJoin(assets, eq(deals.assetId, assets.id))
    .where(and(eq(deals.status, 'agreed'), isNotNull(deals.completionDueOn), lte(deals.completionDueOn, inThreeDays)));
  for (const { d, title } of due) {
    await addTask({ type: 'asset', id: d.assetId }, { title: `${title}: completion due ${d.completionDueOn}. Confirm the appointment and bring the commission invoice.`, dueAt: now, dedupeKey: `completion-3:${d.id}` });
  }
}
