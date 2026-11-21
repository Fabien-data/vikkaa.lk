import type { Metadata } from 'next';
import { forbidden } from 'next/navigation';
import { getPortalClientId } from '@/server/portal-session';
import { getPortalDashboard } from '@/server/portal';

export const metadata: Metadata = { title: 'Your Vikkaa portal', robots: { index: false } };

const DOC_TEXT = { proposal: 'Proposal', invoice: 'Invoice', receipt: 'Ad deposit receipt', agreement_signed: 'Signed agreement' } as const;

export default async function PortalPage() {
  const clientId = await getPortalClientId();
  if (!clientId) forbidden();
  const { clientName, engagements } = await getPortalDashboard(clientId);

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Vikkaa.lk</p>
        <form action="/portal/logout" method="post">
          <button className="text-sm underline">Sign out</button>
        </form>
      </div>
      <h1 className="mt-4 text-3xl font-semibold">Hello {clientName}</h1>
      <p className="mt-2 text-muted-foreground">Everything we’re doing for you, in one place. Questions? Message us on WhatsApp.</p>

      {engagements.map((e) => (
        <section key={e.id} className="mt-8 grid gap-5 rounded-lg border p-5">
          <p className="text-sm">
            Status: <span className="font-semibold">{e.stage}</span>
          </p>
          <ul className="grid gap-3">
            {e.assets.map((a) => (
              <li key={a.title} className="rounded-md bg-muted p-4">
                <p className="font-semibold">{a.title}</p>
                <p className="text-sm text-muted-foreground">{a.status}</p>
                <p className="mt-2 text-2xl font-semibold">
                  {a.enquiries} <span className="text-sm font-normal">buyer {a.enquiries === 1 ? 'enquiry' : 'enquiries'} so far</span>
                </p>
                {a.publicUrl && (
                  <a href={a.publicUrl} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm underline">
                    See your listing
                  </a>
                )}
              </li>
            ))}
          </ul>
          {e.signatories.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold">Signatures</h2>
              <ul className="mt-1 text-sm">
                {e.signatories.map((s) => (
                  <li key={s.name}>
                    {s.name}: {s.signed ? 'signed' : 'not signed yet'}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {e.documents.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold">Documents</h2>
              <ul className="mt-1 grid gap-1 text-sm">
                {e.documents.map((d) => (
                  <li key={d.id}>
                    <a href={`/portal/documents/${d.id}`} target="_blank" rel="noreferrer" className="underline">
                      {DOC_TEXT[d.type as keyof typeof DOC_TEXT]} {d.number ?? ''}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ))}
      {!engagements.length && <p className="mt-8 text-muted-foreground">Nothing here yet. We’ll add your campaign soon.</p>}
    </main>
  );
}
