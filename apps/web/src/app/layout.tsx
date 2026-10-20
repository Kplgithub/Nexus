import type { Metadata, Viewport } from 'next';
import { Outfit, Plus_Jakarta_Sans } from 'next/font/google';
import { SITE_NOINDEX, SITE_URL } from '@/lib/site';
import './globals.css';

const heading = Outfit({
  subsets: ['latin'],
  variable: '--font-heading',
  display: 'swap',
  weight: ['500', '600', '700'],
});
const body = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'NEXUS Estate | Rentals | Properties in Jaipur',
    template: '%s | NEXUS Estate',
  },
  description:
    'Residential homes and commercial spaces for rent in Jaipur. Browse verified listings and talk to the NEXUS Estate team.',
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
