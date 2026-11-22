import { and, desc, eq, ne } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { db } from '@/db';
import { assets, contentDrafts, engagements, type ContentDraft, type Photo } from '@/db/schema';
import { youtubeEmbed } from '@/lib/youtube';

export type DraftKind = ContentDraft['kind'];
export type Decision = 'approved' | 'changes_requested';

/** A problem the client or staff member can fix, shown on the page. */
export class ContentError extends Error {}

export async function submitDraft(
  assetId: string,
  input: { kind: DraftKind; files?: Photo[]; youtubeUrl?: string | null; note?: string | null },
): Promise<ContentDraft> {
  const photos = input.kind === 'photo_set';
  if (photos && !input.files?.length) throw new ContentError('Add at least one photo');
  if (!photos && !youtubeEmbed(input.youtubeUrl)) throw new ContentError('Add the YouTube link (an unlisted video is fine)');
  const [draft] = await db
    .insert(contentDrafts)
    .values({
      assetId,
      kind: input.kind,
      files: photos ? input.files : [],
      youtubeUrl: photos ? null : input.youtubeUrl,
      note: input.note?.trim() || null,
    })
    .returning();
  return draft;
}

/** The client's answer. A draft on someone else's asset is a 404; each draft is answered once. */
export async function decideDraft(clientId: string, draftId: string, decision: Decision, comment?: string): Promise<void> {
  const [own] = await db
    .select({ id: contentDrafts.id })
    .from(contentDrafts)
    .innerJoin(assets, eq(contentDrafts.assetId, assets.id))
    .innerJoin(engagements, eq(assets.engagementId, engagements.id))
    .where(and(eq(contentDrafts.id, draftId), eq(engagements.clientId, clientId)));
  if (!own) notFound();
  if (decision !== 'approved' && decision !== 'changes_requested') throw new ContentError('Choose approve or request changes');
  const text = comment?.trim() || null;
  if (decision === 'changes_requested' && !text) throw new ContentError('Tell us what you would like changed');

  const [updated] = await db
    .update(contentDrafts)
    .set({ status: decision, clientComment: text, decidedAt: new Date() })
    .where(and(eq(contentDrafts.id, draftId), eq(contentDrafts.status, 'pending')))
    .returning({ id: contentDrafts.id });
  if (!updated) throw new ContentError('You have already answered this one. Message us on WhatsApp to change it.');
}

/** Staff take a draft back (the client dropped it, or never answered): it stops blocking go-live and can't be answered. */
export async function withdrawDraft(draftId: string): Promise<void> {
  const [row] = await db.update(contentDrafts).set({ status: 'withdrawn' }).where(eq(contentDrafts.id, draftId)).returning({ id: contentDrafts.id });
  if (!row) throw new ContentError('That draft no longer exists');
}

/** Puts approved content on the listing itself, so what goes live is what the client approved. */
export async function addDraftToListing(draftId: string): Promise<void> {
  const [draft] = await db.select().from(contentDrafts).where(eq(contentDrafts.id, draftId));
  if (!draft) throw new ContentError('That draft no longer exists');
  if (draft.status !== 'approved') throw new ContentError('Only content the client approved can go on the listing');
  const [asset] = await db.select({ photos: assets.photos }).from(assets).where(eq(assets.id, draft.assetId));
  if (draft.kind === 'photo_set') {
    const have = new Set(asset.photos.map((p) => p.src));
    await db.update(assets).set({ photos: [...asset.photos, ...draft.files.filter((f) => !have.has(f.src))] }).where(eq(assets.id, draft.assetId));
  } else {
    await db.update(assets).set({ youtubeUrl: draft.youtubeUrl }).where(eq(assets.id, draft.assetId));
  }
}

/**
 * True when the newest draft of each kind is approved (a re-edit replaces the one sent back; withdrawn drafts don't count).
 * No drafts at all is also ready: content may have been approved on WhatsApp.
 */
export async function isReadyToGoLive(assetId: string): Promise<boolean> {
  const latest = await db
    .selectDistinctOn([contentDrafts.kind], { status: contentDrafts.status })
    .from(contentDrafts)
    .where(and(eq(contentDrafts.assetId, assetId), ne(contentDrafts.status, 'withdrawn')))
    .orderBy(contentDrafts.kind, desc(contentDrafts.createdAt));
  return latest.every((d) => d.status === 'approved');
}
