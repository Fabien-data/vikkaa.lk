import Link from 'next/link';

const LINKS = [
  ['/studio/settings', 'Business'],
  ['/studio/settings/prices', 'Price book'],
  ['/studio/settings/connections', 'Channels & connections'],
  ['/studio/settings/templates', 'Message templates'],
  ['/studio/settings/agreements', 'Agreement wording'],
] as const;

export function SettingsNav({ current }: { current: (typeof LINKS)[number][0] }) {
  return (
    <nav className="flex flex-wrap gap-2 text-sm">
      {LINKS.map(([href, label]) => (
        <Link
          key={href}
          href={href}
          aria-current={href === current ? 'page' : undefined}
          className={`rounded-full px-3 py-1 ${href === current ? 'bg-foreground text-background' : 'border bg-background'}`}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
