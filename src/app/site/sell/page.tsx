import type { Metadata } from 'next';
import { ArrowDown } from 'lucide-react';
import { FormSplit } from '@/components/site/FormSplit';
import { PageHero } from '@/components/site/PageHero';
import { STOCK } from '@/components/site/stock';
import { SellForm } from './sell-form';

export const metadata: Metadata = {
  title: 'Sell with Vikkaa',
  description: 'Tell us about your property or vehicle. If it is a fit, we visit, price it and show you the plan.',
};

export default function SellPage() {
  return (
    <main>
      <PageHero
        eyebrow="Sell with Vikkaa"
        title={['Tell us what', <>you’re <em>selling</em></>]}
        sub="It takes about three minutes. If it’s a fit, we’ll call within a day, visit, price it and show you the plan before you pay anything."
        photo={STOCK.villaAhangama}
        outline="Sell"
      >
        <a href="#form" className="btn btn-light">
          Start the form <ArrowDown className="size-4" aria-hidden="true" />
        </a>
      </PageHero>
      <FormSplit
        heading={<>Three minutes now. <em>We do the rest.</em></>}
        points={[
          'We call you within one working day to talk it through.',
          'One of us visits, checks the documents and prepares a market report with real comparable prices.',
          'You see the content plan, the quote and the agreement.',
          'We film it, run the campaign and handle every buyer enquiry for 30 days.',
        ]}
        photo={STOCK.openAirLiving}
        note="Nothing is paid until you agree to the plan."
        formTitle="Your details"
        formNote="About three minutes"
      >
        <SellForm />
      </FormSplit>
    </main>
  );
}
