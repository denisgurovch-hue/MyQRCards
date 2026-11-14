import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  // Avoid sending /u/{slug} to third parties via Referer on outbound clicks.
  referrer: 'no-referrer',
};

export default function PublicCardLayout({ children }: { children: ReactNode }) {
  return children;
}
