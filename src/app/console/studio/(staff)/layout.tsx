import Link from 'next/link';
import { headers } from 'next/headers';
import { requireStaff } from '@/server/auth-guard';
import { auth } from '@/server/auth';

const NAV = [
  ['/studio/pipeline', 'Pipeline'],
  ['/studio/calendar', 'Calendar'],
  ['/studio/engagements', 'Engagements'],
  ['/studio/clients', 'Clients'],
  ['/studio/assets', 'Assets'],
  ['/studio/buyers', 'Buyers'],
  ['/studio/area-prices', 'Area prices'],
] as const;

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  const session = await auth.api.getSession({ headers: await headers() });
  const needs2fa = !session?.user.twoFactorEnabled;

  return (
    <div className="min-h-screen bg-muted/40">
      <header className="border-b bg-background print:hidden">
        <nav className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 text-sm">
          <Link href="/studio" className="font-semibold">
            Vikkaa Studio
          </Link>
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="text-muted-foreground hover:text-foreground">
              {label}
            </Link>
          ))}
        </nav>
      </header>
      {needs2fa && (
        <div className="bg-amber-100 px-4 py-2 text-center text-sm print:hidden">
          Two-factor sign-in is not on yet.{' '}
          <Link href="/studio/security" className="underline">
            Turn it on now
          </Link>
          .
        </div>
      )}
      <main className="mx-auto max-w-7xl p-4">{children}</main>
    </div>
  );
}
