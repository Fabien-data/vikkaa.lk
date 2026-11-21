import type { Metadata } from 'next';
import { LegalPage } from '@/components/site/LegalPage';

export const metadata: Metadata = { title: 'Cookies' };

export default function Cookies() {
  return (
    <LegalPage title="Cookies">
      <p>The public site uses no tracking or advertising cookies. The client portal and staff Studio use one essential cookie to keep you signed in.</p>
    </LegalPage>
  );
}
