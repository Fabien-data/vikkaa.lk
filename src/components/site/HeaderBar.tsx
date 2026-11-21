'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { lenis } from './motion/SmoothScroll';
import { NAV } from './nav';

/** Floating frosted-glass bar: hides while scrolling down, returns on scroll up. */
export function HeaderBar() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const firstLink = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    let last = scrollY;
    const onScroll = () => {
      setHidden(scrollY > 140 && scrollY > last);
      last = scrollY;
    };
    addEventListener('scroll', onScroll, { passive: true });
    return () => removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    lenis?.stop();
    document.documentElement.style.overflow = 'hidden';
    firstLink.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    addEventListener('keydown', onKey);
    return () => {
      lenis?.start();
      document.documentElement.style.overflow = '';
      removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <>
      <header
        className={`fixed inset-x-3 top-3 z-50 transition-transform duration-500 ease-[var(--ease-out-expo)] md:inset-x-6 md:top-5 ${
          hidden && !open ? '-translate-y-[140%]' : ''
        }`}
      >
        <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-6 rounded-2xl border border-white/50 bg-white/70 py-2.5 pl-4 pr-2.5 shadow-[0_18px_50px_-24px_rgb(3_21_15/0.45)] backdrop-blur-xl md:pl-6">
          <Link href="/" aria-label="Vikkaa.lk home" className="shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.png" alt="Vikkaa" width={136} height={68} className="h-9 w-auto md:h-10" />
          </Link>
          <nav aria-label="Main" className="hidden items-center gap-1 text-[15px] font-medium text-brand md:flex">
            {NAV.map(([href, label]) => (
              <Link
                key={href}
                href={href}
                aria-current={pathname === href ? 'page' : undefined}
                className="rounded-full px-4 py-2 transition-colors hover:bg-brand/5 aria-[current=page]:bg-brand/8 aria-[current=page]:text-brand-green"
              >
                {label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/sell" className="btn btn-primary hidden !px-5 !py-3 text-sm sm:inline-flex">
              Get a marketing plan <ArrowUpRight className="size-4" aria-hidden="true" />
            </Link>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls="site-menu"
              className="grid size-11 place-items-center rounded-full bg-brand text-white md:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
              <span className="sr-only">Open menu</span>
            </button>
          </div>
        </div>
      </header>

      {open && (
        <div id="site-menu" role="dialog" aria-modal="true" aria-label="Menu" className="bg-glow grain fixed inset-0 z-[60] flex flex-col p-6 text-white">
          <div className="flex items-center justify-between">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-white.png" alt="Vikkaa" width={136} height={68} className="h-9 w-auto" />
            <button type="button" onClick={() => setOpen(false)} className="grid size-11 place-items-center rounded-full border border-white/30">
              <X className="size-5" aria-hidden="true" />
              <span className="sr-only">Close menu</span>
            </button>
          </div>
          <nav aria-label="Main" className="mt-auto grid gap-2">
            {[['/', 'Home'] as const, ...NAV].map(([href, label], i) => (
              <Link
                key={href}
                ref={i === 0 ? firstLink : undefined}
                href={href}
                onClick={() => setOpen(false)}
                style={{ animationDelay: `${80 + i * 70}ms` }}
                className="justify-self-start rounded-lg font-display text-[clamp(44px,13vw,64px)] leading-[1.05] outline-mint focus-visible:outline-2 focus-visible:outline-offset-4 motion-safe:animate-rise"
              >
                {label}
              </Link>
            ))}
          </nav>
          <Link href="/sell" onClick={() => setOpen(false)} className="btn btn-light mt-10 w-full">
            Get a marketing plan <ArrowUpRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      )}
    </>
  );
}
