import Link from 'next/link';
import { NextSteps } from '@/components/site/NextSteps';
import { PageHero } from '@/components/site/PageHero';

export default function SellThanks() {
  return (
    <main>
      <PageHero
        light
        mark
        eyebrow="Details received"
        title={['Thanks, we’ve got', <>your <em>details</em></>]}
        sub="One of us will call you within one working day to talk it through and arrange a visit."
      >
        <Link href="/" className="btn btn-primary">
          Back to Vikkaa.lk
        </Link>
        <Link href="/portfolio" className="btn btn-outline">
          See the portfolio
        </Link>
      </PageHero>
      <NextSteps
        steps={[
          ['We call you', 'Within one working day, to talk it through and arrange a visit.'],
          ['We visit and price it', 'We check the documents and prepare a market report with real comparable prices.'],
          ['You see the plan', 'The content plan, the quote and our agreement. Nothing is paid until you agree.'],
        ]}
      />
    </main>
  );
}
