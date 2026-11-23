'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Banknote,
  Building2,
  CalendarDays,
  Car,
  ChartNoAxesColumn,
  Handshake,
  LayoutGrid,
  LogOut,
  MapPinned,
  Menu,
  Radar,
  Settings,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { authClient } from '@/lib/auth-client';

type Item = { href: string; label: string; icon: LucideIcon };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: 'Sell',
    items: [
      { href: '/studio', label: 'War room', icon: Radar },
      { href: '/studio/prospects', label: 'Prospects', icon: Users },
      { href: '/studio/pipeline', label: 'Pipeline', icon: ChartNoAxesColumn },
      { href: '/studio/calendar', label: 'Calendar', icon: CalendarDays },
    ],
  },
  {
    title: 'Deliver',
    items: [
      { href: '/studio/engagements', label: 'Engagements', icon: Handshake },
      { href: '/studio/assets', label: 'Assets', icon: Car },
      { href: '/studio/buyers', label: 'Buyers', icon: LayoutGrid },
      { href: '/studio/clients', label: 'Clients', icon: Building2 },
    ],
  },
  {
    title: 'Run',
    items: [
      { href: '/studio/money', label: 'Money', icon: Banknote },
      { href: '/studio/area-prices', label: 'Area prices', icon: MapPinned },
      { href: '/studio/settings', label: 'Settings', icon: Settings },
    ],
  },
];

function useIsCurrent() {
  const path = usePathname();
  return (href: string) => (href === '/studio' ? path === '/studio' : path === href || path.startsWith(`${href}/`));
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const isCurrent = useIsCurrent();
  return (
    <div className="grid gap-6">
      {GROUPS.map((g) => (
        <div key={g.title} className="grid gap-1">
          <p className="eyebrow px-3 pb-1 text-[10px] text-white/45">{g.title}</p>
          {g.items.map(({ href, label, icon: Icon }) => {
            const current = isCurrent(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={current ? 'page' : undefined}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-medium transition-[background-color,color] duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mint ${
                  current ? 'bg-white/[0.12] text-white' : 'text-white/70 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                {/* The active mark: a mint bar that slides in, echoing the tick. */}
                <span
                  aria-hidden="true"
                  className={`absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-mint transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${current ? 'opacity-100' : 'scale-y-0 opacity-0'}`}
                />
                <Icon aria-hidden="true" className={`size-[18px] shrink-0 transition-colors ${current ? 'text-mint' : 'text-white/50 group-hover:text-white/80'}`} />
                {label}
              </Link>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function SignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await authClient.signOut();
        router.push('/login');
      }}
      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[14px] font-medium text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white focus-visible:outline-2 focus-visible:outline-mint disabled:opacity-50"
    >
      <LogOut aria-hidden="true" className="size-[18px]" />
      {busy ? 'Signing out…' : 'Sign out'}
    </button>
  );
}

function Brand() {
  return (
    <Link href="/studio" className="flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-mint">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-white.png" alt="Vikkaa" width={96} height={48} className="h-7 w-auto" />
      <span className="eyebrow rounded-full border border-white/20 px-2 py-1 text-[9px] text-mint">Studio</span>
    </Link>
  );
}

/** Desktop: a fixed cinematic sidebar. Mobile: a top bar with a drawer. The current section is marked for sighted and screen-reader users alike. */
export function StudioNav({ userName }: { userName?: string }) {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const opener = menuRef.current;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      opener?.focus();
    };
  }, [open]);

  const footer = (
    <div className="grid gap-2 border-t border-white/10 pt-4">
      {userName && (
        <p className="flex items-center gap-3 px-3 text-sm text-white/80">
          <span aria-hidden="true" className="grid size-8 place-items-center rounded-full bg-mint font-semibold text-brand">
            {userName.trim().charAt(0).toUpperCase()}
          </span>
          {userName}
        </p>
      )}
      <SignOut />
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="bg-glow grain fixed inset-y-0 left-0 z-30 hidden w-64 flex-col gap-8 overflow-y-auto px-4 py-6 text-white lg:flex print:hidden">
        <div className="relative z-10 px-2">
          <Brand />
        </div>
        <nav aria-label="Studio" className="relative z-10 flex-1">
          <NavLinks />
        </nav>
        <div className="relative z-10">{footer}</div>
      </aside>

      {/* Mobile top bar */}
      <header className="bg-glow sticky top-0 z-30 flex items-center justify-between px-4 py-3 text-white lg:hidden print:hidden">
        <Brand />
        <button
          ref={menuRef}
          type="button"
          aria-expanded={open}
          aria-controls="studio-drawer"
          aria-label="Open menu"
          onClick={() => setOpen(true)}
          className="grid size-10 place-items-center rounded-full border border-white/20 bg-white/5 focus-visible:outline-2 focus-visible:outline-mint"
        >
          <Menu aria-hidden="true" className="size-5" />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Studio menu" id="studio-drawer">
          <div className="absolute inset-0 bg-night/60 backdrop-blur-sm motion-safe:animate-in motion-safe:fade-in" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="bg-glow grain absolute inset-y-0 left-0 flex w-[min(300px,85vw)] flex-col gap-8 overflow-y-auto px-4 py-5 text-white shadow-2xl motion-safe:animate-in motion-safe:slide-in-from-left motion-safe:duration-300">
            <div className="relative z-10 flex items-center justify-between px-2">
              <Brand />
              <button
                ref={closeRef}
                type="button"
                aria-label="Close menu"
                onClick={() => setOpen(false)}
                className="grid size-9 place-items-center rounded-full border border-white/20 focus-visible:outline-2 focus-visible:outline-mint"
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
            <nav aria-label="Studio" className="relative z-10 flex-1">
              <NavLinks onNavigate={() => setOpen(false)} />
            </nav>
            <div className="relative z-10">{footer}</div>
          </div>
        </div>
      )}
    </>
  );
}
