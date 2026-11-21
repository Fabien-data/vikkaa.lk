import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { assets } from '@/db/schema';
import { requireStaff } from '@/server/auth-guard';
import { CheckinForm } from './checkin-form';

export default async function CheckinPage({ params }: { params: Promise<{ assetId: string }> }) {
  await requireStaff();
  const { assetId } = await params;
  const [asset] = await db.select().from(assets).where(eq(assets.id, assetId));
  if (!asset) notFound();

  return (
    <main className="mx-auto max-w-md px-5 py-10">
      <p className="text-sm font-semibold">Vikkaa.lk</p>
      <h1 className="mt-2 text-2xl font-semibold">Welcome to the {asset.category === 'vehicle' ? 'test drive' : 'viewing'}</h1>
      <p className="mt-2 text-muted-foreground">{asset.title}</p>
      <CheckinForm assetId={asset.id} kind={asset.category} />
    </main>
  );
}
