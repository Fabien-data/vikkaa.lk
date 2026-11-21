'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireStaff } from '@/server/auth-guard';
import { advanceAsset, advanceEngagement, InvalidTransitionError } from '@/server/pipeline';
import type { AssetStatus, EngagementStage } from '@/lib/enums';

async function run(move: () => Promise<void>): Promise<void> {
  try {
    await move();
  } catch (err) {
    if (err instanceof InvalidTransitionError) redirect(`/studio/pipeline?error=${encodeURIComponent(err.message)}`);
    throw err;
  }
  revalidatePath('/studio/pipeline');
}

export async function moveEngagement(id: string, to: EngagementStage): Promise<void> {
  await requireStaff();
  await run(() => advanceEngagement(id, to));
}

export async function moveAsset(id: string, to: AssetStatus): Promise<void> {
  await requireStaff();
  await run(() => advanceAsset(id, to));
}
