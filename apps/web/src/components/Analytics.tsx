import Script from 'next/script';
import { GA_ID } from '@/lib/site';

/**
 * Google Analytics 4. Renders nothing until NEXT_PUBLIC_GA_ID (e.g. G-XXXXXXX)
 * is set at build time. IP anonymisation is on by default in GA4.
 */
export function Analytics() {
  if (!GA_ID) return null;
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(GA_ID)});`}
      </Script>
    </>
  );
}
