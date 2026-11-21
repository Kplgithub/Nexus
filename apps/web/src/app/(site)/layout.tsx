import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { FloatingContact } from '@/components/layout/FloatingContact';
import { JsonLd } from '@/components/ui';
import { getLocations, getSettings } from '@/lib/api';
import { organizationJsonLd } from '@/lib/seo';
import { SessionProvider } from '@/components/session/SessionProvider';
import { Analytics } from '@/components/Analytics';

// Render public pages per request so they always reflect current listings and settings.
// API responses are still cached for REVALIDATE_SECONDS by fetch(), so this stays fast.
export const dynamic = 'force-dynamic';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, cities] = await Promise.all([getSettings(), getLocations()]);
  return (
    <SessionProvider>
      <Analytics />
      <JsonLd data={organizationJsonLd(settings, cities)} />
      <Header settings={settings} cities={cities} />
      <main id="main" className="pb-20">
        {children}
      </main>
      <Footer settings={settings} cities={cities} />
      <FloatingContact phone={settings.phone} whatsapp={settings.whatsapp} />
    </SessionProvider>
  );
}
