import { requireStaff } from '@/server/auth-guard';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets } from '@/db/schema';
import { SHOT_LISTS } from '@/lib/shot-lists';

export default async function ShotListPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const asset = await db.query.assets.findFirst({ where: eq(assets.id, id), with: { engagement: true } });
  if (!asset) notFound();

  return (
    <div className="mx-auto grid max-w-2xl gap-5 bg-background p-6 print:max-w-none print:p-0">
      <Link href={`/studio/assets/${asset.id}`} className="text-sm text-muted-foreground print:hidden">
        Back to the asset
      </Link>
      <header>
        <p className="text-sm capitalize text-muted-foreground">
          Shot list · {asset.kind} · {asset.area}, {asset.district}
        </p>
        <h1 className="text-2xl font-semibold">{asset.title}</h1>
      </header>
      {asset.engagement.contentPlan && (
        <section>
          <h2 className="mb-1 font-semibold">Content plan for this client</h2>
          <p className="whitespace-pre-line text-sm">{asset.engagement.contentPlan}</p>
        </section>
      )}
      <ol className="grid gap-2">
        {SHOT_LISTS[asset.kind].map((shot) => (
          <li key={shot}>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" className="mt-0.5 size-4 shrink-0" />
              {shot}
            </label>
          </li>
        ))}
      </ol>
      <p className="text-xs text-muted-foreground print:hidden">Print it (Ctrl+P), or tick it off on your phone during the shoot. Ticks are not saved.</p>
    </div>
  );
}
