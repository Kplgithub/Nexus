import type { Metadata } from 'next';
import { HomeView, defaultCity } from '@/components/home/HomeView';
import { getLocations } from '@/lib/api';
import { generateMetadata as homeMetadata } from '../../page';

/**
 * The home page for a visitor from another city. Visitors never see this URL: src/proxy.ts
 * serves it at `/` from their IP or their city choice. Google always gets the main city at `/`,
 * and this page's canonical is `/` too.
 *
 *   /homecity/<slug>  → that city, or the main city with a "coming soon" note if it has no listings
 *   /homecity/soon    → the main city with the note (visitor's city isn't on the site yet)
 */
export const revalidate = 60;
export const dynamicParams = true;

export function generateStaticParams() {
  return [];
}

export async function generateMetadata(): Promise<Metadata> {
  return homeMetadata();
}

export default async function CityHomePage({ params }: { params: Promise<{ city: string }> }) {
  const { city: slug } = await params;
  const cities = await getLocations();
  const main = defaultCity(cities);
  const city = cities.find((c) => c.slug === slug);
  // A city added in admin with nothing listed yet still shows something useful.
  const empty = city && city !== main && (city.publishedCount ?? 1) === 0;
  if (!city || empty) return <HomeView cities={cities} city={main} comingSoon />;
  return <HomeView cities={cities} city={city} />;
}
