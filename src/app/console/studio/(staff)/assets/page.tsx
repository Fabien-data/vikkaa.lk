import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets } from '@/db/schema';
import { ASSET_STATUSES, statusLabel, type AssetStatus } from '@/lib/enums';
import { formatLkr } from '@/lib/money';

export default async function AssetsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const filter = ASSET_STATUSES.includes(status as AssetStatus) ? (status as AssetStatus) : undefined;
  const rows = await db.select().from(assets).where(filter ? eq(assets.status, filter) : undefined).orderBy(desc(assets.createdAt)).limit(200);

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Assets</h1>
      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Filter by status">
        <Link href="/studio/assets" className={`rounded px-3 py-1 ${!filter ? 'bg-foreground text-background' : 'border bg-background'}`}>
          All
        </Link>
        {ASSET_STATUSES.map((s) => (
          <Link key={s} href={`/studio/assets?status=${s}`} className={`rounded px-3 py-1 ${filter === s ? 'bg-foreground text-background' : 'border bg-background'}`}>
            {statusLabel(s)}
          </Link>
        ))}
      </nav>
      <table className="w-full rounded-md border bg-background text-sm">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th className="p-3">Title</th>
            <th className="p-3">Area</th>
            <th className="p-3">Status</th>
            <th className="p-3">Asking</th>
            <th className="p-3">Photos</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className="border-t">
              <td className="p-3">
                <Link href={`/studio/assets/${a.id}`} className="font-medium hover:underline">
                  {a.title}
                </Link>
              </td>
              <td className="p-3">{a.area}</td>
              <td className="p-3">{statusLabel(a.status)}</td>
              <td className="p-3">{formatLkr(a.askingPriceCents)}</td>
              <td className="p-3">{a.photos.length}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={5} className="p-6 text-center text-muted-foreground">
                No assets yet. Add one from an engagement.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
