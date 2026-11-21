import { Info } from 'lucide-react';
import { PageHero } from './PageHero';

/** Placeholder legal text until the lawyer's versions arrive (pre-launch checklist). */
export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main>
      <PageHero light eyebrow="Legal" title={[title]} outline="Legal" />
      <div className="mx-auto grid w-[min(1320px,100%-40px)] gap-10 border-t border-brand/10 pb-24 pt-10 md:grid-cols-[minmax(0,280px)_minmax(0,1fr)] md:gap-20 md:pb-32 md:pt-14">
        <aside className="self-start md:sticky md:top-28">
          <p className="flex items-start gap-3 rounded-2xl border border-brand-green/20 bg-brand-green/[0.06] p-4 text-sm font-medium text-brand-ink">
            <Info className="mt-px size-4 shrink-0 text-brand-green" aria-hidden="true" />
            Draft. Final wording is being reviewed by our lawyer.
          </p>
        </aside>
        <div className="grid max-w-[66ch] gap-5 text-[17px] leading-[1.8] text-ink-soft [&>p:first-child]:text-[20px] [&>p:first-child]:leading-relaxed [&>p:first-child]:text-brand-ink [&_h2]:mt-8 [&_h2]:font-display [&_h2]:text-[clamp(28px,3vw,36px)] [&_h2]:leading-tight [&_h2]:text-brand-ink">
          {children}
        </div>
      </div>
    </main>
  );
}
