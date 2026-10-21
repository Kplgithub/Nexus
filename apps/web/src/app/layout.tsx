import type { Metadata, Viewport } from 'next';
import { Manrope, Newsreader } from 'next/font/google';
import { SITE_NOINDEX, SITE_URL } from '@/lib/site';
import './globals.css';

/** Editorial serif for headlines; geometric sans (close to the logo's lettering) for everything else. */
const heading = Newsreader({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
});
const body = Manrope({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'NEXUS Estate | Buy, Rent & Sell Property',
    template: '%s | NEXUS Estate',
  },
  description:
    'Homes, offices and shops to buy or rent. Search listings from owners, agents and builders, or post your property free on NEXUS Estate.',
  applicationName: 'NEXUS Estate',
  icons: {
    icon: [
      { url: '/brand/favicon.ico', sizes: 'any' },
      { url: '/brand/icon-32.png', type: 'image/png', sizes: '32x32' },
      { url: '/brand/icon-192.png', type: 'image/png', sizes: '192x192' },
    ],
    apple: [{ url: '/brand/icon-180.png', sizes: '180x180' }],
  },
  manifest: '/manifest.webmanifest',
  robots: SITE_NOINDEX ? { index: false, follow: false } : undefined,
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#02667B',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-IN" className={`${heading.variable} ${body.variable}`}>
      <body className="min-h-dvh bg-bg text-ink">{children}</body>
    </html>
  );
}
