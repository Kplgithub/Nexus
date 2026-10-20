import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { FloatingContact } from '@/components/layout/FloatingContact';
import { JsonLd } from '@/components/ui';
import { getLocations, getSettings } from '@/lib/api';
import { organizationJsonLd } from '@/lib/seo';

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, cities] = await Promise.all([getSettings(), getLocations()]);
  return (
    <>
      <JsonLd data={organizationJsonLd(settings)} />
      <Header settings={settings} />
      <main id="main" className="pb-20">
        {children}
      </main>
      <Footer settings={settings} cities={cities} />
      <FloatingContact phone={settings.phone} whatsapp={settings.whatsapp} />
    </>
  );
}
