import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets } from '@/db/schema';
import { requireStaff } from '@/server/auth-guard';
import { config } from '@/lib/config';
import { CheckinForm } from './checkin-form';

export default async function CheckinPage({ params }: { params: Promise<{ assetId: string }> }) {
  await requireStaff();
  const { assetId } = await params;
  const [asset] = await db.select().from(assets).where(eq(assets.id, assetId));
  if (!asset) notFound();

  return (
    <main className="mx-auto w-full max-w-md px-5 py-10 motion-safe:animate-rise">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo.png" alt="Vikkaa" width={112} height={56} className="h-9 w-auto" />
      <p className="eyebrow mt-10 text-brand-green">Welcome</p>
      <h1 className="page-title mt-3">
        Welcome to the <em className="text-brand-green">{asset.category === 'vehicle' ? 'test drive' : 'viewing'}</em>
      </h1>
      <p className="mt-2 text-muted-foreground">{asset.title}</p>
      <CheckinForm assetId={asset.id} kind={asset.category} privacyUrl={`${config.publicUrl}/privacy`} />
    </main>
  );
}
