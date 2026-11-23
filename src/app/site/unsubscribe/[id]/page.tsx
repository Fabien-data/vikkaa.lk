import type { Metadata } from 'next';
import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { db } from '@/db';
import { messages } from '@/db/schema';
import { config } from '@/lib/config';
import { verifySignedPath } from '@/lib/signed-url';
import { whatsappLink } from '@/lib/whatsapp';
import { PageHero } from '@/components/site/PageHero';
import { confirmUnsubscribe } from '../actions';

export const metadata: Metadata = { title: 'Unsubscribe', robots: { index: false, follow: false } };

/** "jane.perera@gmail.com" → "ja•••@gmail.com", so a forwarded link does not reveal the full address. */
const mask = (to: string) => (to.includes('@') ? to.replace(/^(.{0,2}).*(@.*)$/, '$1•••$2') : `•••${to.slice(-3)}`);

export default async function Unsubscribe({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const { id } = await params;
  const q = await searchParams;
  const state = q.invalid ? 'invalid' : verifySignedPath(`/unsubscribe/${id}`, new URLSearchParams({ exp: q.exp ?? '', sig: q.sig ?? '' }));
  const [m] = state === 'invalid' ? [] : await db.select({ to: messages.toAddress }).from(messages).where(eq(messages.id, id));
  const help = whatsappLink(config.vikkaaWhatsapp, 'Please stop sending me messages.');

  if (q.done) {
    return (
      <main>
        <PageHero light mark eyebrow="Unsubscribed" title={['You will not hear', <>from us <em>again</em></>]} sub="We have recorded your choice. You will still receive messages about a sale or purchase you are part of.">
          <Link href="/" className="btn btn-primary">
            Back to Vikkaa.lk
          </Link>
        </PageHero>
      </main>
    );
  }
  if (state === 'invalid' || !m?.to) {
    return (
      <main>
        <PageHero light mark eyebrow="Unsubscribe" title={['This link does', <>not <em>work</em></>]} sub="Message us on WhatsApp or reply to the email with STOP, and we will stop at once.">
          <a href={help} className="btn btn-primary">
            Ask us on WhatsApp
          </a>
        </PageHero>
      </main>
    );
  }
  return (
    <main>
      <PageHero light mark eyebrow="Unsubscribe" title={['Stop messages', <>from <em>Vikkaa?</em></>]} sub={`We will stop all marketing and outreach to ${mask(m.to)}.`}>
        <form action={confirmUnsubscribe}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="exp" value={q.exp ?? ''} />
          <input type="hidden" name="sig" value={q.sig ?? ''} />
          <button type="submit" className="btn btn-primary">
            Yes, unsubscribe me
          </button>
        </form>
      </PageHero>
    </main>
  );
}
