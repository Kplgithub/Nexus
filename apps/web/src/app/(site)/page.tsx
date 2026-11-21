import type { Metadata } from 'next';
import { HomeView, defaultCity } from '@/components/home/HomeView';
import { getLocations } from '@/lib/api';
import { pageMetadata } from '@/lib/seo';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const cities = await getLocations();
  const where = cities.length === 1 ? ` in ${cities[0]!.name}` : '';
  // Keyword first, brand once: `absolute` skips the "%s | NEXUS Estate" template,
  // which used to give "NEXUS Estate | ... | NEXUS Estate".
  const title = where
    ? `Property${where}: Flats & Houses to Buy and Rent | NEXUS Estate`
    : 'NEXUS Estate | Buy, Rent & Sell Property';
  const meta = pageMetadata({
    title,
    description: `Flats, houses, villas, plots, offices and shops for sale and rent${where}. Every listing is reviewed before it goes live. Owners, agents and builders can list property here.`,
    path: '/',
  });
  return { ...meta, title: { absolute: title } };
}

/** The main city's home page. Visitors from other cities are routed by src/proxy.ts. */
export default async function HomePage() {
  const cities = await getLocations();
  return <HomeView cities={cities} city={defaultCity(cities)} />;
}
