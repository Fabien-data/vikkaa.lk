import type { Metadata } from 'next';
import { forbidden } from 'next/navigation';
import { getPortalClientId } from '@/server/portal-session';
import { getPortalDashboard } from '@/server/portal';
import { Drafts } from './drafts';

export const metadata: Metadata = { title: 'Your Vikkaa portal', robots: { index: false } };

const DOC_TEXT = { proposal: 'Proposal', invoice: 'Invoice', receipt: 'Ad deposit receipt', agreement_signed: 'Signed agreement' } as const;

export default async function PortalPage() {
  const clientId = await getPortalClientId();
  if (!clientId) forbidden();
  const { clientName, engagements } = await getPortalDashboard(clientId);

  return (
    <main className="pb-16">
      <section className="bg-glow grain relative mx-3 mt-3 overflow-hidden rounded-[2rem] px-6 pb-12 pt-6 text-white md:mx-6 md:px-12 md:pb-16">
        <div className="relative z-10 mx-auto max-w-4xl">
          <div className="flex items-center justify-between">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-white.png" alt="Vikkaa" width={112} height={56} className="h-8 w-auto" />
            <form action="/portal/logout" method="post">
              <button className="btn btn-ghost px-4 py-2 text-sm">Sign out</button>
            </form>
          </div>
          <p className="eyebrow mt-12 text-mint">Your portal</p>
          <h1 className="mt-4 font-display text-[clamp(40px,6vw,76px)] leading-[0.95] motion-safe:animate-rise">
            Hello <em className="text-mint">{clientName}</em>
          </h1>
          <p className="mt-4 max-w-[48ch] text-lg text-white/75">Everything we’re doing for you, in one place. Questions? Message us on WhatsApp.</p>
        </div>
      </section>

      <div className="mx-auto grid max-w-4xl gap-6 px-5 pt-10">
        {engagements.map((e) => (
          <section key={e.id} className="panel grid gap-6 p-6 md:p-8">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              Status <span className="chip bg-brand text-mint">{e.stage}</span>
            </p>
            <ul className="grid gap-4">
              {e.assets.map((a) => (
                <li key={a.title} className="rounded-[1.25rem] bg-mist/70 p-5 md:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-brand-ink">{a.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{a.status}</p>
                    </div>
                    <p className="text-right">
                      <span className="block font-display text-[52px] leading-none tabular-nums text-brand-ink">{a.enquiries}</span>
                      <span className="text-sm text-muted-foreground">buyer {a.enquiries === 1 ? 'enquiry' : 'enquiries'} so far</span>
                    </p>
                  </div>
                  {a.publicUrl && (
                    <a href={a.publicUrl} target="_blank" rel="noreferrer" className="btn btn-outline mt-4 px-4 py-2.5 text-sm">
                      See your listing
                    </a>
                  )}
                  <Drafts drafts={a.drafts} />
                </li>
              ))}
            </ul>
            <div className="grid gap-6 sm:grid-cols-2">
              {e.signatories.length > 0 && (
                <div>
                  <h2 className="eyebrow text-ink-soft">Signatures</h2>
                  <ul className="mt-3 grid gap-2 text-sm">
                    {e.signatories.map((s) => (
                      <li key={s.name} className="flex items-center justify-between gap-3">
                        {s.name}
                        <span className={`chip ${s.signed ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-950'}`}>{s.signed ? 'Signed' : 'Not signed yet'}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {e.documents.length > 0 && (
                <div>
                  <h2 className="eyebrow text-ink-soft">Documents</h2>
                  <ul className="mt-3 grid gap-2 text-sm">
                    {e.documents.map((d) => (
                      <li key={d.id}>
                        <a href={`/portal/documents/${d.id}`} target="_blank" rel="noreferrer" className="font-medium text-brand-green underline">
                          {DOC_TEXT[d.type as keyof typeof DOC_TEXT]} {d.number ?? ''}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        ))}
        {!engagements.length && <p className="panel p-8 text-center text-muted-foreground">Nothing here yet. We’ll add your campaign soon.</p>}
      </div>
    </main>
  );
}
