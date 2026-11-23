import { requireStaff } from '@/server/auth-guard';
import Link from 'next/link';
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '@/db';
import { assets, engagements } from '@/db/schema';
import { FitBadge } from '@/components/studio/FitBadge';
import { nextStage, stageLabel, statusLabel, type AssetStatus, type EngagementStage } from '@/lib/enums';
import { formatLkr } from '@/lib/money';
import { moveAsset, moveEngagement } from './actions';

// shortcut: buttons only; add drag-and-drop when card volume makes clicking slow.
const ENGAGEMENT_COLUMNS: EngagementStage[] = ['intake', 'call', 'visit', 'proposal'];
const ASSET_COLUMNS: AssetStatus[] = ['production', 'live', 'under_offer', 'sold'];
const NEXT_ASSET: Partial<Record<AssetStatus, AssetStatus>> = { production: 'live', live: 'under_offer' };

function Column({ title, count, children }: { title: string; count: number; children: React.ReactNode }) {
  return (
    <section className="flex w-72 shrink-0 flex-col gap-2.5 rounded-[1.25rem] border border-brand/6 bg-mist/80 p-2.5">
      <h2 className="flex items-center justify-between px-1.5 pt-1 text-sm font-semibold">
        {title}
        <span className="chip bg-white text-ink-soft tabular-nums shadow-sm">{count}</span>
      </h2>
      {children}
    </section>
  );
}

export default async function PipelinePage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireStaff();
  const { error } = await searchParams;
  const early = await db.query.engagements.findMany({
    where: inArray(engagements.stage, ENGAGEMENT_COLUMNS),
    orderBy: desc(engagements.createdAt),
    with: { client: true, assets: true },
  });
  const awaitingPayment = await db.query.engagements.findMany({
    where: and(eq(engagements.stage, 'signed'), isNull(engagements.paidAt)),
    with: { client: true, assets: true },
  });
  const later = await db.select().from(assets).where(inArray(assets.status, ASSET_COLUMNS)).orderBy(desc(assets.updatedAt));

  return (
    <div className="grid gap-4">
      <h1 className="page-title">Pipeline</h1>
      {error && (
        <p role="alert" className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}
      <div className="flex gap-3 overflow-x-auto pb-4">
        {ENGAGEMENT_COLUMNS.map((stage) => {
          const cards = early.filter((e) => e.stage === stage);
          const next = nextStage(stage);
          return (
            <Column key={stage} title={stageLabel(stage)} count={cards.length}>
              {cards.map((e) => {
                const red = e.fitFlags.length > 0;
                async function forward() {
                  'use server';
                  if (next) await moveEngagement(e.id, next);
                }
                return (
                  <article key={e.id} className="grid gap-2 rounded-xl border border-brand/8 bg-white p-3 text-sm shadow-[0_6px_18px_-12px_rgb(11_40_30/0.35)] transition-transform duration-300 hover:-translate-y-0.5">
                    <Link href={`/studio/engagements/${e.id}`} className="font-medium hover:underline">
                      {e.client.name}
                    </Link>
                    <p className="text-muted-foreground">{e.assets.map((a) => a.title).join(', ') || 'No assets yet'}</p>
                    <FitBadge score={e.fitScore} flags={red ? e.fitFlags : []} />
                    <div className="flex gap-3 text-xs">
                      {next && (
                        <form action={forward}>
                          <button className="underline">Move to {stageLabel(next)}</button>
                        </form>
                      )}
                      <Link href={`/studio/engagements/${e.id}#no-go`} className="text-destructive underline">
                        No-go
                      </Link>
                    </div>
                  </article>
                );
              })}
            </Column>
          );
        })}

        <Column title="Signed, awaiting payment" count={awaitingPayment.length}>
          {awaitingPayment.map((e) => (
            <article key={e.id} className="grid gap-1 rounded-xl border border-brand/8 bg-white p-3 text-sm shadow-[0_6px_18px_-12px_rgb(11_40_30/0.35)] transition-transform duration-300 hover:-translate-y-0.5">
              <Link href={`/studio/engagements/${e.id}`} className="font-medium hover:underline">
                {e.client.name}
              </Link>
              <p className="text-muted-foreground">{e.assets.map((a) => a.title).join(', ')}</p>
            </article>
          ))}
        </Column>

        {ASSET_COLUMNS.map((status) => {
          const cards = later.filter((a) => a.status === status);
          const next = NEXT_ASSET[status];
          return (
            <Column key={status} title={statusLabel(status)} count={cards.length}>
              {cards.map((a) => {
                async function forward() {
                  'use server';
                  if (next) await moveAsset(a.id, next);
                }
                return (
                  <article key={a.id} className="grid gap-1 rounded-xl border border-brand/8 bg-white p-3 text-sm shadow-[0_6px_18px_-12px_rgb(11_40_30/0.35)] transition-transform duration-300 hover:-translate-y-0.5">
                    <Link href={`/studio/assets/${a.id}`} className="font-medium hover:underline">
                      {a.title}
                    </Link>
                    <p className="text-muted-foreground">{formatLkr(a.soldPriceCents ?? a.askingPriceCents)}</p>
                    <div className="flex gap-3 text-xs">
                      {next && (
                        <form action={forward}>
                          <button className="underline">Move to {statusLabel(next)}</button>
                        </form>
                      )}
                      {status === 'under_offer' && (
                        <Link href={`/studio/assets/${a.id}#status`} className="underline">
                          Mark sold
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </Column>
          );
        })}
      </div>
    </div>
  );
}
