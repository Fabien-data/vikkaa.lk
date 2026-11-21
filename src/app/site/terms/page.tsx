import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/LegalPage';

export const metadata: Metadata = { title: 'Terms' };

export default function Terms() {
  return (
    <LegalPage title="Terms">
      <p>These terms cover use of the Vikkaa.lk website. Marketing and sale services are governed by the written agreement each seller signs with Vikkaa.</p>
      <p>Listing details are checked on our visit and provided in good faith. Buyers should make their own checks before buying.</p>
    </LegalPage>
  );
}
