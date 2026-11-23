import type { Metadata } from 'next';
import { ArrowDown } from 'lucide-react';
import { FormSplit } from '@/components/site/FormSplit';
import { PageHero } from '@/components/site/PageHero';
import { STOCK } from '@/components/site/stock';
import { InboundForm } from '@/components/site/inbound/InboundForm';
import { utmFrom } from '@/components/site/inbound/utm';

export const metadata: Metadata = {
  title: 'For car dealers',
  description: 'Vikkaa films and markets your stock on every platform at once and answers every enquiry, for a fixed monthly fee. Western Province dealers.',
};

export default async function DealersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const utm = utmFrom(await searchParams);
  return (
    <main>
      <PageHero
        eyebrow="For car dealers"
        title={['Move your stock', <>without <em>chasing</em> buyers</>]}
        sub="We film every car properly, run it on Facebook, Instagram, TikTok and YouTube at once, and answer every enquiry for you. One monthly fee, cars included."
        photo={STOCK.carBlack}
        outline="Dealers"
      >
        <a href="#form" className="btn btn-light">
          Ask for a call back <ArrowDown className="size-4" aria-hidden="true" />
        </a>
      </PageHero>
      <FormSplit
        heading={<>Your yard filmed. <em>Your phone quieter.</em></>}
        points={[
          'Photos, a walkaround film and reels for each car, shot at your yard.',
          'One campaign per car on every platform, from an ad budget you set.',
          'Every enquiry answered by us within the day. You get real buyers, not tyre-kickers.',
          'A live portal with every enquiry, test drive and rupee of ad spend.',
        ]}
        photo={STOCK.carShowroom}
        note="A fixed monthly retainer covers a set number of cars a month."
        formTitle="Tell us about your yard"
        formNote="One minute"
      >
        <InboundForm segment="dealer" utm={utm} />
      </FormSplit>
    </main>
  );
}
