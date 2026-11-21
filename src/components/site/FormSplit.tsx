import { ShieldCheck } from 'lucide-react';
import { config } from '@/lib/config';
import { whatsappLink } from '@/lib/whatsapp';
import { prettyPhone } from './SiteChrome';
import type { StockPhoto } from './stock';
import { TickList } from './TickList';

type Props = {
  heading: React.ReactNode;
  points: React.ReactNode[];
  photo: StockPhoto;
  note: React.ReactNode;
  formTitle: string;
  formNote?: string;
  children: React.ReactNode;
};

/** Sell and Buy: the reasons on the left, the form card on the right (stacked on mobile, form second). */
export function FormSplit({ heading, points, photo, note, formTitle, formNote, children }: Props) {
  return (
    <section
      aria-labelledby="split-h"
      className="mx-auto grid w-[min(1320px,100%-40px)] gap-12 py-16 md:py-24 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16 xl:gap-24"
    >
      <div className="self-start motion-safe:animate-rise lg:top-28 lg:[@media(min-height:880px)]:sticky" style={{ animationDelay: '500ms' }}>
        <p className="eyebrow text-brand-green">What happens next</p>
        <h2 id="split-h" className="mt-5 max-w-[17ch] font-display text-[clamp(38px,3.8vw,56px)] leading-[1] text-brand-ink [&_em]:text-brand-green">
          {heading}
        </h2>
        <TickList items={points} className="mt-8 text-brand-ink" />
        <div className="mt-10 overflow-hidden rounded-[1.5rem] bg-mist">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.src} srcSet={photo.srcSet} sizes="(min-width: 1024px) 36vw, 100vw" alt={photo.alt} loading="lazy" className="aspect-[21/9] w-full object-cover" />
        </div>
        <p className="mt-6 flex items-start gap-3 rounded-2xl border border-brand-green/20 bg-brand-green/[0.06] p-4 text-[15px] font-semibold text-brand-ink">
          <ShieldCheck className="mt-px size-5 shrink-0 text-brand-green" aria-hidden="true" />
          {note}
        </p>
        <p className="mt-5 text-[15px] text-ink-soft">
          Rather talk? Call{' '}
          <a href={`tel:${config.vikkaaPhone}`} className="font-semibold text-brand-green underline-offset-4 hover:underline">
            {prettyPhone(config.vikkaaPhone)}
          </a>{' '}
          or{' '}
          <a href={whatsappLink(config.vikkaaWhatsapp, 'Hi Vikkaa')} className="font-semibold text-brand-green underline-offset-4 hover:underline">
            WhatsApp us
          </a>
          .
        </p>
      </div>

      <div
        id="form"
        className="scroll-mt-28 rounded-[2rem] border border-brand/[0.08] bg-white p-6 shadow-[0_40px_90px_-50px_rgb(11_40_30/0.35)] motion-safe:animate-rise sm:p-10"
        style={{ animationDelay: '600ms' }}
      >
        <div className="mb-9 flex items-baseline justify-between gap-4 border-b border-brand/10 pb-6">
          <p className="font-display text-[30px] leading-none text-brand-ink">{formTitle}</p>
          {formNote && <p className="text-sm text-ink-soft">{formNote}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}
