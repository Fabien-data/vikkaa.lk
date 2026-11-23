'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  ['/studio', 'War room'],
  ['/studio/prospects', 'Prospects'],
  ['/studio/pipeline', 'Pipeline'],
  ['/studio/calendar', 'Calendar'],
  ['/studio/engagements', 'Engagements'],
  ['/studio/money', 'Money'],
  ['/studio/clients', 'Clients'],
  ['/studio/assets', 'Assets'],
  ['/studio/buyers', 'Buyers'],
  ['/studio/area-prices', 'Area prices'],
  ['/studio/settings', 'Settings'],
] as const;

/** The Studio's main navigation. The current section is marked for sighted and screen-reader users alike. */
export function StudioNav() {
  const path = usePathname();
  const isCurrent = (href: string) => (href === '/studio' ? path === '/studio' : path === href || path.startsWith(`${href}/`));
  return (
    <nav aria-label="Studio" className="mx-auto flex max-w-7xl items-center gap-x-1 overflow-x-auto px-4 py-2 text-sm [scrollbar-width:thin]">
      <span className="mr-3 shrink-0 font-semibold">Vikkaa Studio</span>
      {NAV.map(([href, label]) => {
        const current = isCurrent(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={current ? 'page' : undefined}
            className={`shrink-0 rounded-md px-2.5 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
              current ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
