import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Manrope, Unbounded } from 'next/font/google';
import { getPublicAppUrl } from '../lib/public-url';
import './globals.css';

const display = Unbounded({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-display',
  display: 'swap',
});

const sans = Manrope({
  subsets: ['latin', 'cyrillic'],
  variable: '--font-sans',
  display: 'swap',
});

const appUrl = getPublicAppUrl();
const defaultDescription = 'Цифровые визитки с QR-кодом и vCard';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'Signet',
    template: '%s · Signet',
  },
  description: defaultDescription,
  openGraph: {
    type: 'website',
    locale: 'ru_RU',
    siteName: 'Signet',
    title: 'Signet',
    description: defaultDescription,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Signet',
    description: defaultDescription,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
