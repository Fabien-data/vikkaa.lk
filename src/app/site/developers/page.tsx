import type { Metadata } from 'next';
import { ArrowDown } from 'lucide-react';
import { FormSplit } from '@/components/site/FormSplit';
import { PageHero } from '@/components/site/PageHero';
import { STOCK } from '@/components/site/stock';
import { InboundForm } from '@/components/site/inbound/InboundForm';
import { utmFrom } from '@/components/site/inbound/utm';

export const metadata: Metadata = {
  title: 'For developers and projects',
  description: 'A project page, our own photo, drone and film shoot, and one campaign across every platform, with every buyer qualified and logged. Start with a one-month pilot.',
};

export default async function DevelopersPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const utm = utmFrom(await searchParams);
  return (
    <main>
      <PageHero
        eyebrow="For developers and projects"
        title={['Sell your units', <>with less <em>waiting</em></>]}
        sub="A project page, our own shoot and one campaign across every platform, with every buyer qualified before they reach you. Start with a fixed-price, one-month pilot."
        photo={STOCK.tropicalHouse}
        outline="Projects"
      >
        <a href="#form" className="btn btn-light">
          Ask about a pilot <ArrowDown className="size-4" aria-hidden="true" />
        </a>
      </PageHero>
      <FormSplit
        heading={<>One month. <em>Every enquiry counted.</em></>}
        points={[
          'A project page listing every available unit or plot.',
          'Photos, drone footage, a walkthrough film and reels from our own crew.',
          'Every buyer qualified by budget, timeline and financing.',
          'A weekly report of enquiries, viewings and ad spend, so the pilot speaks for itself.',
        ]}
        photo={STOCK.villaAhangama}
        note="A fixed price for the pilot. Continue on a retainer only if it earns its place."
        formTitle="Tell us about the project"
        formNote="One minute"
      >
        <InboundForm segment="developer" utm={utm} />
      </FormSplit>
    </main>
  );
}
