import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, Inter } from 'next/font/google';
import type { ReactNode } from 'react';
import { Header, TabBar } from '@/components/Nav';
import './globals.css';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const mono = IBM_Plex_Mono({ subsets: ['latin'], weight: '400', variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'CRX Sniffer',
  description: 'Check browser extensions: what they can reach, what their code does, and the math behind it.',
};

export const viewport: Viewport = { themeColor: '#15171a', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body>
        <Header />
        <main>{children}</main>
        <TabBar />
      </body>
    </html>
  );
}
