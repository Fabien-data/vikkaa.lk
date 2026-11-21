import Link from 'next/link';
import { NextSteps } from '@/components/site/NextSteps';
import { PageHero } from '@/components/site/PageHero';

export default function BuyThanks() {
  return (
    <main>
      <PageHero
        light
        mark
        eyebrow="Brief received"
        title={['Thanks, we’ll be', <>in <em>touch</em></>]}
        sub="When something that fits comes in, you’ll hear from us first."
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
          ['We match your brief', 'We check new listings against what you told us as they come in.'],
          ['You hear first', 'If you joined Vikkaa Circle, you see new listings two days before they go public.'],
          ['We arrange the viewing', 'Viewings and test drives are run by us, and every question comes to us, not the seller.'],
        ]}
      />
    </main>
  );
}
