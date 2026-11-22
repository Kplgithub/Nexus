import Script from 'next/script';
import { GA_ID, GTM_ID } from '@/lib/site';

/**
 * Google Tag Manager (GTM_ID) and, optionally, a direct Google Analytics 4 tag
 * (GA_ID). Both come from build-time env vars; see lib/site.ts.
 * Rendered only in the public site layout, so the admin area is never tracked.
 *
 * Speed: both load with lazyOnload, after the page is ready, so they never
 * compete with the first paint. When GTM is set, the direct GA tag is skipped:
 * the GTM container already fires the same GA4 tag, so loading it again would
 * add ~180KB of script and count every page view twice.
 */
export function Analytics() {
  return (
    <>
      {GTM_ID && (
        <>
          <Script id="gtm-init" strategy="lazyOnload">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer',${JSON.stringify(GTM_ID)});`}
          </Script>
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${encodeURIComponent(GTM_ID)}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
              title="Google Tag Manager"
            />
          </noscript>
        </>
      )}
      {GA_ID && !GTM_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`}
            strategy="lazyOnload"
          />
          <Script id="ga4-init" strategy="lazyOnload">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config',${JSON.stringify(GA_ID)});`}
          </Script>
        </>
      )}
    </>
  );
}
