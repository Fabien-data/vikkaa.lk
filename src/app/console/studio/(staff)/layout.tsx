import Link from 'next/link';
import { headers } from 'next/headers';
import { ShieldAlert } from 'lucide-react';
import { requireStaff } from '@/server/auth-guard';
import { auth } from '@/server/auth';
import { StudioNav } from '@/components/studio/StudioNav';

export default async function StaffLayout({ children }: { children: React.ReactNode }) {
  await requireStaff();
  const session = await auth.api.getSession({ headers: await headers() });
  const needs2fa = !session?.user.twoFactorEnabled;

  return (
    <div className="min-h-screen lg:pl-64">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-50 focus:rounded-full focus:bg-brand focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to content
      </a>
      <StudioNav userName={session?.user.name} />
      {needs2fa && (
        <div className="mx-auto mt-4 w-[min(1280px,100%-32px)] print:hidden">
          <p className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-300/70 bg-amber-50 px-4 py-2.5 text-sm text-amber-950">
            <ShieldAlert aria-hidden="true" className="size-4 shrink-0" />
            Two-factor sign-in is not on yet.
            <Link href="/studio/security" className="font-semibold underline">
              Turn it on now
            </Link>
          </p>
        </div>
      )}
      <main id="main" tabIndex={-1} className="mx-auto w-[min(1280px,100%-32px)] py-6 focus:outline-none md:py-10">
        {children}
      </main>
    </div>
  );
}
