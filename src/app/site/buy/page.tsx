import type { Metadata } from 'next';
import { ArrowDown } from 'lucide-react';
import { FormSplit } from '@/components/site/FormSplit';
import { PageHero } from '@/components/site/PageHero';
import { STOCK } from '@/components/site/stock';
import { BuyForm } from './buy-form';

export const metadata: Metadata = {
  title: 'Find a property or vehicle with Vikkaa',
  description: 'Tell us what you are looking for. Vikkaa Circle members see new listings two days before everyone else.',
};

export default function BuyPage() {
  return (
    <main>
      <PageHero
        eyebrow="Find a property or vehicle"
        title={['Tell us what', <>you’re <em>looking for</em></>]}
        sub="We’ll match you with listings as they come in. Join Vikkaa Circle to see new ones two days before they go public."
        photo={STOCK.tropicalHouse}
        outline="Buy"
      >
        <a href="#form" className="btn btn-light">
          Start your brief <ArrowDown className="size-4" aria-hidden="true" />
        </a>
      </PageHero>
      <FormSplit
        heading={<>Tell us once. <em>We keep looking.</em></>}
        points={[
          'Tell us what you want, where, and your budget.',
          'We match you with listings as they come in.',
          'Vikkaa Circle members see new listings two days before they go public.',
          'Every listing is visited, priced and filmed by us. Viewings and test drives are arranged by us too.',
        ]}
        photo={STOCK.livingRoom}
        note="You’ll be contacted by Vikkaa, not the seller."
        formTitle="Your brief"
      >
        <BuyForm />
      </FormSplit>
    </main>
  );
}
