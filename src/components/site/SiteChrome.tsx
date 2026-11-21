import Link from 'next/link';
import { config } from '@/lib/config';

const NAV = [
  ['/how-it-works', 'How it works'],
  ['/portfolio', 'Portfolio'],
  ['/sell', 'Sell with us'],
  ['/buy', 'Find a property'],
] as const;

export const prettyPhone = (e164: string) =>
  e164.startsWith('+94') ? `0${e164.slice(3, 5)} ${e164.slice(5, 8)} ${e164.slice(8)}` : e164;

export function SiteHeader() {
  return (
    <header className="bg-brand text-white">
      <div className="mx-auto flex w-[min(1160px,100%-40px)] items-center justify-between py-5">
        <Link href="/" className="font-display text-[28px] leading-none">
          Vikkaa<span className="text-accent">.lk</span>
        </Link>
        <nav aria-label="Main" className="hidden gap-7 text-[15px] md:flex">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="opacity-90 hover:underline hover:underline-offset-4 hover:opacity-100">
              {label}
            </Link>
          ))}
        </nav>
        <Link href="/sell" className="rounded-sm bg-accent px-4 py-2 text-sm font-semibold text-brand-ink md:hidden">
          Sell with us
        </Link>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-accent/40 bg-brand-ink text-[15px] text-white/75">
      <div className="mx-auto flex w-[min(1160px,100%-40px)] flex-wrap justify-between gap-4 py-8">
        <span>
          Call or WhatsApp Vikkaa on <a href={`tel:${config.vikkaaPhone}`} className="underline">{prettyPhone(config.vikkaaPhone)}</a>
        </span>
        <nav aria-label="Legal" className="flex gap-5">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/cookies">Cookies</Link>
        </nav>
      </div>
    </footer>
  );
}
