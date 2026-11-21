import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { engagements } from '@/db/schema';
import { ActionForm } from '@/components/studio/ActionForm';
import { AssetFields } from '../asset-fields';
import { saveAsset } from '../actions';

export default async function NewAssetPage({ searchParams }: { searchParams: Promise<{ engagement?: string }> }) {
  const { engagement: engagementId } = await searchParams;
  if (!engagementId) notFound();
  const [e] = await db.select({ id: engagements.id }).from(engagements).where(eq(engagements.id, engagementId));
  if (!e) notFound();

  return (
    <div className="grid max-w-3xl gap-6">
      <Link href={`/studio/engagements/${e.id}`} className="text-sm text-muted-foreground">
        Back to engagement
      </Link>
      <h1 className="text-2xl font-semibold">Add an asset</h1>
      <section className="rounded-md border bg-background p-5">
        <ActionForm action={saveAsset} submitLabel="Create asset">
          <AssetFields engagementId={e.id} />
        </ActionForm>
      </section>
    </div>
  );
}
