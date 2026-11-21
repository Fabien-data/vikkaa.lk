import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/LegalPage';
import { config } from '@/lib/config';

export const metadata: Metadata = { title: 'Privacy notice' };

export default function Privacy() {
  return (
    <LegalPage title="Privacy notice">
      <p>Vikkaa.lk collects the details you give us (name, phone, email, what you are buying or selling) so we can reply to you and arrange viewings, test drives and sales.</p>
      <h2 className="mt-4 text-xl font-semibold">If you enquire about a listing</h2>
      <p>
        We keep a record of every buyer we introduce to a property or vehicle, with the date and how you contacted us. The seller may be
        told which buyers Vikkaa introduced to their asset. This record protects the agreement between Vikkaa and the seller.
      </p>
      <h2 className="mt-4 text-xl font-semibold">Vikkaa Circle</h2>
      <p>If you join Vikkaa Circle, we send you new listings that match what you are looking for, two days before they go public. You can leave at any time by replying STOP or telling us.</p>
      <h2 className="mt-4 text-xl font-semibold">Your rights</h2>
      <p>
        You can ask to see the data we hold about you or ask us to delete it by messaging us on WhatsApp or calling {config.vikkaaPhone}.
        Records we need for an active agreement are deleted when that agreement and its follow-on period end.
      </p>
    </LegalPage>
  );
}
