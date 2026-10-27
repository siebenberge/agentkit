import type { Metadata } from 'next';

import { GeistMono } from 'geist/font/mono';
import { GeistSans } from 'geist/font/sans';

import './globals.css';

const kit = process.env.NEXT_PUBLIC_DEMO_KIT;

export const metadata: Metadata = {
  title:
    kit === 'shop'
      ? 'shopkit Demo – agentkit'
      : kit === 'sub'
        ? 'subkit Demo – agentkit'
        : 'agentkit Demos',
  description:
    'Probiere die agentkit-Kits im Browser aus: Shop und Abos mit QR-Rechnung, TWINT und MWST.',
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="de-CH"
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="font-sans">{children}</body>
    </html>
  );
}
