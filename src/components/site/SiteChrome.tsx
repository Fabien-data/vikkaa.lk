import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { config } from '@/lib/config';
import { whatsappLink } from '@/lib/whatsapp';
import { publicChannels } from '@/server/channels';
import { HeaderBar } from './HeaderBar';
import { NAV } from './nav';
import { TickLine } from './motion/TickLine';

export const prettyPhone = (e164: string) =>
  e164.startsWith('+94') ? `0${e164.slice(3, 5)} ${e164.slice(5, 8)} ${e164.slice(8)}` : e164;

export function SiteHeader() {
  return <HeaderBar />;
}

export async function SiteFooter() {
  const channels = await publicChannels();
  return (
    <footer className="bg-glow grain relative mt-auto overflow-hidden text-white">
      <TickLine className="pointer-events-none absolute -right-32 -top-36 w-[min(640px,80vw)] text-glow/35" />
      <div className="relative mx-auto w-[min(1320px,100%-40px)] pb-10 pt-24 md:pt-32">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr] md:items-end">
          <div>
            <p className="eyebrow text-mint">Selling something worth showing?</p>
            <h2 className="mt-5 max-w-[14ch] font-display text-[clamp(48px,7vw,104px)] leading-[0.95]">
              Let’s give it the campaign it <em className="text-mint">deserves.</em>
            </h2>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link href="/sell" className="btn btn-light">
              Get a marketing plan <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
            <a href={whatsappLink(config.vikkaaWhatsapp, 'Hi Vikkaa, I’d like to talk about selling.')} className="btn btn-ghost">
              WhatsApp us
            </a>
          </div>
        </div>

        <div className={`mt-20 grid gap-10 border-t border-white/15 pt-10 text-[15px] sm:grid-cols-2 ${channels.length ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
          <nav aria-label="Footer">
            <p className="eyebrow text-white/50">Explore</p>
            <ul className="mt-4 grid gap-2.5">
              {[...NAV, ['/dealers', 'For car dealers'] as const, ['/developers', 'For developers'] as const].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-white/80 transition-colors hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <p className="eyebrow text-white/50">Talk to us</p>
            <ul className="mt-4 grid gap-2.5 text-white/80">
              <li>
                Call <a href={`tel:${config.vikkaaPhone}`} className="text-white underline-offset-4 hover:underline">{prettyPhone(config.vikkaaPhone)}</a>
              </li>
              <li>
                WhatsApp{' '}
                <a href={whatsappLink(config.vikkaaWhatsapp, 'Hi Vikkaa')} className="text-white underline-offset-4 hover:underline">
                  {prettyPhone(config.vikkaaWhatsapp)}
                </a>
              </li>
              <li>Western Province, Sri Lanka</li>
            </ul>
          </div>
          {channels.length > 0 && (
            <nav aria-label="Follow Vikkaa">
              <p className="eyebrow text-white/50">Follow</p>
              <ul className="mt-4 grid gap-2.5">
                {channels.map((c) => (
                  <li key={c.key}>
                    <a href={c.url} target="_blank" rel="noopener noreferrer me" className="text-white/80 transition-colors hover:text-white">
                      {c.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          )}
          <nav aria-label="Legal">
            <p className="eyebrow text-white/50">Legal</p>
            <ul className="mt-4 grid gap-2.5">
              {[
                ['/privacy', 'Privacy'],
                ['/terms', 'Terms'],
                ['/cookies', 'Cookies'],
              ].map(([href, label]) => (
                <li key={href}>
                  <Link href={href} className="text-white/80 transition-colors hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <p aria-hidden="true" className="text-outline mt-16 select-none text-center text-[clamp(80px,24vw,360px)] font-black leading-[0.8] tracking-tighter [--outline:rgb(255_255_255/0.16)]">
          Vikkaa
        </p>
        <div className="mt-8 flex flex-wrap justify-between gap-3 text-[13px] text-white/50">
          <span>© {new Date().getFullYear()} Vikkaa.lk</span>
          <span>Some photography from Unsplash until our own shoots replace it.</span>
          <span>Film music: Sascha Ende, ende.app (CC BY 4.0)</span>
        </div>
      </div>
    </footer>
  );
}
