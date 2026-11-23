import Link from 'next/link';
import { requireStaff } from '@/server/auth-guard';
import { AGREEMENT_TITLES, listTemplateVersions } from '@/server/agreement-templates';
import { AGREEMENT_KINDS } from '@/db/schema';
import { SettingsNav } from '../settings-nav';

export default async function AgreementsPage() {
  await requireStaff();
  const versions = await listTemplateVersions();
  return (
    <div className="grid gap-6">
      <header className="grid gap-3">
        <h1 className="text-2xl font-semibold">Agreement wording</h1>
        <SettingsNav current="/studio/settings/agreements" />
        <p className="max-w-3xl text-sm text-muted-foreground">
          Nobody can sign until the lawyer approves the wording. Type in the lawyer&rsquo;s text, send them the preview, and once they confirm in
          writing, stamp the version as approved. Approved wording never changes; changes need a new version.
        </p>
      </header>
      {AGREEMENT_KINDS.map((kind) => {
        const list = versions.filter((v) => v.kind === kind);
        const live = list.find((v) => v.approvedAt);
        return (
          <section key={kind} className="rounded-md border bg-background p-5">
            <h2 className="flex flex-wrap items-center gap-3 font-semibold">
              {AGREEMENT_TITLES[kind]}
              {live ? (
                <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900">Signable: version {live.version}</span>
              ) : (
                <span className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900">Not signable yet</span>
              )}
            </h2>
            <ul className="mt-3 grid gap-1 text-sm">
              {list.map((v) => (
                <li key={v.id}>
                  <Link href={`/studio/settings/agreements/${v.id}`} className="underline">
                    Version {v.version}
                  </Link>{' '}
                  <span className="text-muted-foreground">
                    {v.approvedAt ? `approved by ${v.approvedBy} on ${v.approvedAt.toLocaleDateString('en-GB')}` : 'draft'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
