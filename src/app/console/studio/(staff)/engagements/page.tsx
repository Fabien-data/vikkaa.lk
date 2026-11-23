import { requireStaff } from '@/server/auth-guard';
import Link from 'next/link';
import { desc, eq } from 'drizzle-orm';
import { db } from '@/db';
import { engagements } from '@/db/schema';
import { FitBadge } from '@/components/studio/FitBadge';
import { ENGAGEMENT_STAGES, stageLabel, type EngagementStage } from '@/lib/enums';

export default async function EngagementsPage({ searchParams }: { searchParams: Promise<{ stage?: string }> }) {
  await requireStaff();
  const { stage } = await searchParams;
  const filter = ENGAGEMENT_STAGES.includes(stage as EngagementStage) ? (stage as EngagementStage) : undefined;
  const rows = await db.query.engagements.findMany({
    where: filter ? eq(engagements.stage, filter) : undefined,
    orderBy: desc(engagements.createdAt),
    with: { client: true, assets: true },
    limit: 200,
  });

  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">Engagements</h1>
      <nav className="flex flex-wrap gap-2 text-sm" aria-label="Filter by stage">
        <Link href="/studio/engagements" className={`rounded px-3 py-1 ${!filter ? 'bg-foreground text-background' : 'bg-background border'}`}>
          All
        </Link>
        {ENGAGEMENT_STAGES.map((s) => (
          <Link
            key={s}
            href={`/studio/engagements?stage=${s}`}
            className={`rounded px-3 py-1 ${filter === s ? 'bg-foreground text-background' : 'bg-background border'}`}
          >
            {stageLabel(s)}
          </Link>
        ))}
      </nav>
      <table className="w-full rounded-md border bg-background text-sm">
        <thead className="text-left text-muted-foreground">
          <tr>
            <th scope="col" className="p-3">Client</th>
            <th scope="col" className="p-3">Assets</th>
            <th scope="col" className="p-3">Stage</th>
            <th scope="col" className="p-3">Fit</th>
            <th scope="col" className="p-3">Received</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={e.id} className="border-t">
              <td className="p-3">
                <Link href={`/studio/engagements/${e.id}`} className="font-medium hover:underline">
                  {e.client.name}
                </Link>
              </td>
              <td className="p-3">{e.assets.map((a) => a.title).join(', ') || '—'}</td>
              <td className="p-3">{stageLabel(e.stage)}</td>
              <td className="p-3">
                <FitBadge score={e.fitScore} flags={e.fitFlags} />
              </td>
              <td className="p-3">{e.createdAt.toLocaleDateString('en-GB')}</td>
            </tr>
          ))}
          {!rows.length && (
            <tr>
              <td colSpan={5} className="p-6 text-center text-muted-foreground">
                Nothing here yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
