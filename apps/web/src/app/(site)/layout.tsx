import { Suspense } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { FloatingContact } from '@/components/layout/FloatingContact';
import { JsonLd } from '@/components/ui';
import { getLocations, getSettings } from '@/lib/api';
import { organizationJsonLd } from '@/lib/seo';
import { SessionProvider } from '@/components/session/SessionProvider';
import { Analytics } from '@/components/Analytics';
import { JourneyTracker } from '@/components/JourneyTracker';
import { SectionsProvider } from '@/components/session/SectionsProvider';
import { sectionsOn } from '@/lib/sections';

// Public pages are cached and rebuilt in the background at most once a minute (ISR),
// so a traffic spike is served from cache instead of rendering every request.
// Pages that read searchParams (filters, pagination) still render per request.
export const revalidate = 60;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, cities] = await Promise.all([getSettings(), getLocations()]);
  return (
    <SessionProvider>
      <SectionsProvider value={sectionsOn(settings)}>
        <Analytics />
        <Suspense fallback={null}>
          <JourneyTracker />
        </Suspense>
        <JsonLd data={organizationJsonLd(settings, cities)} />
        <Header settings={settings} cities={cities} />
        <main id="main" className="pb-20">
          {children}
        </main>
        <Footer settings={settings} cities={cities} />
        <FloatingContact phone={settings.phone} whatsapp={settings.whatsapp} />
      </SectionsProvider>
    </SessionProvider>
  );
}
