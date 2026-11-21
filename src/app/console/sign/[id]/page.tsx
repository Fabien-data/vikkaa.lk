import type { Metadata } from 'next';
import { forbidden } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { signatories } from '@/db/schema';
import { verifySignedPath } from '@/lib/signed-url';
import { SignForm } from './sign-form';

export const metadata: Metadata = { title: 'Sign your Vikkaa agreement', robots: { index: false } };

export default async function SignPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ exp?: string; sig?: string }>;
}) {
  const { id } = await params;
  const { exp = '', sig = '' } = await searchParams;
  if (verifySignedPath(`/sign/${id}`, new URLSearchParams({ exp, sig })) !== 'ok') forbidden();

  const s = await db.query.signatories.findFirst({
    where: eq(signatories.id, id),
    with: { engagement: { with: { assets: true } } },
  });
  if (!s) forbidden();

  return (
    <main className="mx-auto max-w-lg px-5 py-12">
      <p className="text-sm font-semibold">Vikkaa.lk</p>
      <h1 className="mt-2 text-3xl font-semibold">Your agreement</h1>
      <p className="mt-3 text-muted-foreground">
        For {s.engagement.assets.map((a) => a.title).join(', ')}. Signing as {s.name}.
      </p>
      {s.signedAt ? (
        <p role="status" className="mt-8 rounded-md bg-emerald-50 p-4 text-emerald-900">
          You have already signed this agreement on {s.signedAt.toLocaleDateString('en-GB')}. Thank you.
        </p>
      ) : (
        <>
          <a
            href={`/sign/${id}/agreement?exp=${exp}&sig=${sig}`}
            target="_blank"
            rel="noreferrer"
            className="mt-6 inline-block underline"
          >
            Read the agreement (PDF)
          </a>
          <SignForm id={id} exp={exp} sig={sig} />
        </>
      )}
    </main>
  );
}
