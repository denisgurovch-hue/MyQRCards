import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Manrope, Unbounded } from 'next/font/google';
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

export const metadata: Metadata = {
  title: 'MyQRCards',
  description: 'Цифровые визитки с QR-кодом и vCard',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru" className={`${display.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
