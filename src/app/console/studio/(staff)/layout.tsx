import Link from 'next/link';
import { headers } from 'next/headers';
import { requireStaff } from '@/server/auth-guard';
import { auth } from '@/server/auth';
import { StudioNav } from '@/components/studio/StudioNav';

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  const session = await auth.api.getSession({ headers: await headers() });
  const needs2fa = !session?.user.twoFactorEnabled;

  return (
    <div className="min-h-screen bg-muted/40">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-foreground focus:px-3 focus:py-2 focus:text-background"
      >
        Skip to content
      </a>
      <header className="border-b bg-background print:hidden">
        <StudioNav />
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
      <main id="main" tabIndex={-1} className="mx-auto max-w-7xl p-4 focus:outline-none">
        {children}
      </main>
    </div>
  );
}
