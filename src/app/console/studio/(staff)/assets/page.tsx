import { requireStaff } from '@/server/auth-guard';
import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets } from '@/db/schema';
import { ASSET_STATUSES, statusLabel, type AssetStatus } from '@/lib/enums';
import { formatLkr } from '@/lib/money';

export default async function AssetsPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireStaff();
  const { status } = await searchParams;
  const filter = ASSET_STATUSES.includes(status as AssetStatus) ? (status as AssetStatus) : undefined;
  const rows = await db.select().from(assets).where(filter ? eq(assets.status, filter) : undefined).orderBy(desc(assets.createdAt)).limit(200);

  return (
    <div className="grid gap-6">
      <h1 className="page-title">Assets</h1>
      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Filter by status">
        <Link href="/studio/assets" className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${!filter ? 'bg-brand text-white shadow-sm' : 'border bg-white hover:border-brand/30'}`}>
          All
        </Link>
        {ASSET_STATUSES.map((s) => (
          <Link key={s} href={`/studio/assets?status=${s}`} className={`rounded-full px-3.5 py-1.5 text-sm transition-colors ${filter === s ? 'bg-brand text-white shadow-sm' : 'border bg-white hover:border-brand/30'}`}>
            {statusLabel(s)}
          </Link>
        ))}
      </nav>
      <table className="w-full panel text-sm">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th scope="col" className="p-3">Title</th>
            <th scope="col" className="p-3">Area</th>
            <th scope="col" className="p-3">Status</th>
            <th scope="col" className="p-3">Asking</th>
            <th scope="col" className="p-3">Photos</th>
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
