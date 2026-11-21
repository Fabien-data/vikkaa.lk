import type { Metadata } from 'next';
import { Instrument_Serif, Hanken_Grotesk } from 'next/font/google';
import { config } from '@/lib/config';
import './globals.css';

const body = Hanken_Grotesk({ variable: '--font-sans', subsets: ['latin'] });
const display = Instrument_Serif({ variable: '--font-display-face', subsets: ['latin'], weight: '400', style: ['normal', 'italic'] });

// Every page reads live data (and Docker builds have no database), so nothing is prerendered at build time.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  metadataBase: new URL(config.publicUrl),
  title: { default: 'Vikkaa.lk: property and vehicle marketing in Sri Lanka', template: '%s | Vikkaa.lk' },
  description:
    'Vikkaa prices your property or vehicle with real market data, films it with our own crew, runs it on every platform at once and handles every buyer until it sells.',
  openGraph: {
    siteName: 'Vikkaa.lk',
    locale: 'en_LK',
    type: 'website',
    images: [{ url: '/brand/og.jpg', width: 1200, height: 630, alt: 'Vikkaa' }],
  },
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
