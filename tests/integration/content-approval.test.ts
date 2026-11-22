import { describe, it, expect } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { clients, engagements, assets, contentDrafts } from '@/db/schema';
import { submitDraft, decideDraft, isReadyToGoLive, withdrawDraft, addDraftToListing, ContentError } from '@/server/content-approval';
import { advanceAsset, InvalidTransitionError } from '@/server/pipeline';
import { getPortalDashboard } from '@/server/portal';

const photo = { src: '/media/drafts/x-1600.webp', srcSet: 'x' };

async function seed() {
  const [c] = await db.insert(clients).values({ type: 'private', name: 'Perera', phone: `+9477${Math.floor(1e7 + Math.random() * 9e7)}` }).returning();
  const [e] = await db.insert(engagements).values({ clientId: c.id, type: 'single', commissionRateBp: 300, exclusiveDays: 90, followOnMonths: 6 }).returning();
  const [a] = await db
    .insert(assets)
    .values({
      engagementId: e.id, category: 'property', kind: 'house', status: 'production', title: 'House', description: 'Nice', slug: `h-${crypto.randomUUID()}`,
      district: 'Colombo', area: 'Nugegoda', askingPriceCents: 100, photos: [photo],
    })
    .returning();
  return { clientId: c.id, assetId: a.id };
}
const statusOf = async (id: string) => (await db.select().from(contentDrafts).where(eq(contentDrafts.id, id)))[0];

describe('content approval', () => {
  it('client approves own draft', async () => {
    const { clientId, assetId } = await seed();
    const draft = await submitDraft(assetId, { kind: 'photo_set', files: [photo], note: 'First edit' });
    expect(draft.status).toBe('pending');
    await decideDraft(clientId, draft.id, 'approved');
    const after = await statusOf(draft.id);
    expect(after.status).toBe('approved');
    expect(after.decidedAt).toBeInstanceOf(Date);
    // A second click changes nothing.
    await expect(decideDraft(clientId, draft.id, 'changes_requested', 'too late')).rejects.toBeInstanceOf(ContentError);
    expect((await statusOf(draft.id)).status).toBe('approved');
  });

  it('changes require a comment', async () => {
    const { clientId, assetId } = await seed();
    const draft = await submitDraft(assetId, { kind: 'video', youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ' });
    await expect(decideDraft(clientId, draft.id, 'changes_requested', '   ')).rejects.toBeInstanceOf(ContentError);
    expect((await statusOf(draft.id)).status).toBe('pending');
    await decideDraft(clientId, draft.id, 'changes_requested', '  Less music, more garden  ');
    expect(await statusOf(draft.id)).toMatchObject({ status: 'changes_requested', clientComment: 'Less music, more garden' });
  });

  it("cannot decide another client's draft", async () => {
    const mine = await seed();
    const theirs = await seed();
    const draft = await submitDraft(theirs.assetId, { kind: 'photo_set', files: [photo] });
    await expect(decideDraft(mine.clientId, draft.id, 'approved')).rejects.toThrow(/404/);
    await expect(decideDraft(mine.clientId, crypto.randomUUID(), 'approved')).rejects.toThrow(/404/);
    expect((await statusOf(draft.id)).status).toBe('pending');
  });

  it('ready when all drafts approved', async () => {
    const { clientId, assetId } = await seed();
    expect(await isReadyToGoLive(assetId)).toBe(true); // approved on WhatsApp before the portal had this

    const photos = await submitDraft(assetId, { kind: 'photo_set', files: [photo] });
    expect(await isReadyToGoLive(assetId)).toBe(false);
    await decideDraft(clientId, photos.id, 'changes_requested', 'Brighter please');
    expect(await isReadyToGoLive(assetId)).toBe(false);

    // The re-edit replaces the rejected set.
    const reedit = await submitDraft(assetId, { kind: 'photo_set', files: [photo] });
    const reel = await submitDraft(assetId, { kind: 'reel', youtubeUrl: 'https://www.youtube.com/shorts/dQw4w9WgXcQ' });
    await decideDraft(clientId, reedit.id, 'approved');
    expect(await isReadyToGoLive(assetId)).toBe(false);
    await expect(advanceAsset(assetId, 'live')).rejects.toBeInstanceOf(InvalidTransitionError);

    await decideDraft(clientId, reel.id, 'approved');
    expect(await isReadyToGoLive(assetId)).toBe(true);
    await advanceAsset(assetId, 'live');
  });

  it('a draft needs photos or a YouTube link to match its kind', async () => {
    const { assetId } = await seed();
    await expect(submitDraft(assetId, { kind: 'photo_set', files: [] })).rejects.toBeInstanceOf(ContentError);
    await expect(submitDraft(assetId, { kind: 'video' })).rejects.toBeInstanceOf(ContentError);
    await expect(submitDraft(assetId, { kind: 'reel', youtubeUrl: 'https://vimeo.com/123' })).rejects.toBeInstanceOf(ContentError);
  });

  it("the portal shows a client only their own drafts, with a privacy-friendly embed", async () => {
    const mine = await seed();
    const theirs = await seed();
    await submitDraft(mine.assetId, { kind: 'video', youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', note: 'Cut 1' });
    await submitDraft(theirs.assetId, { kind: 'photo_set', files: [photo] });
    const { engagements: list } = await getPortalDashboard(mine.clientId);
    const drafts = list.flatMap((e) => e.assets).flatMap((a) => a.drafts);
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toMatchObject({ kind: 'video', note: 'Cut 1', status: 'pending', embed: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' });
  });

  it('staff can withdraw a draft the client asked to drop or never answered, and the client can no longer answer it', async () => {
    const { clientId, assetId } = await seed();
    const reel = await submitDraft(assetId, { kind: 'reel', youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ' });
    await decideDraft(clientId, reel.id, 'changes_requested', 'Skip the reel');
    const photos = await submitDraft(assetId, { kind: 'photo_set', files: [photo] });
    expect(await isReadyToGoLive(assetId)).toBe(false);

    await withdrawDraft(reel.id);
    await withdrawDraft(photos.id);
    expect(await statusOf(photos.id)).toMatchObject({ status: 'withdrawn' });
    expect(await isReadyToGoLive(assetId)).toBe(true);
    await expect(decideDraft(clientId, photos.id, 'approved')).rejects.toBeInstanceOf(ContentError);
    const { engagements: list } = await getPortalDashboard(clientId);
    expect(list.flatMap((e) => e.assets).flatMap((a) => a.drafts)).toEqual([]);
    await advanceAsset(assetId, 'live');
  });

  it('an approved draft goes onto the listing without uploading it again', async () => {
    const { clientId, assetId } = await seed();
    const extra = { src: '/media/drafts/y-1600.webp', srcSet: 'y' };
    const set = await submitDraft(assetId, { kind: 'photo_set', files: [photo, extra] });
    const video = await submitDraft(assetId, { kind: 'video', youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ' });
    await expect(addDraftToListing(set.id)).rejects.toBeInstanceOf(ContentError); // not approved yet

    await decideDraft(clientId, set.id, 'approved');
    await decideDraft(clientId, video.id, 'approved');
    await addDraftToListing(set.id);
    await addDraftToListing(set.id); // twice adds nothing new
    await addDraftToListing(video.id);
    const [a] = await db.select().from(assets).where(eq(assets.id, assetId));
    expect(a.photos.map((p) => p.src)).toEqual([photo.src, extra.src]); // seed already had `photo`
    expect(a.youtubeUrl).toBe('https://youtu.be/dQw4w9WgXcQ');
  });
});
