import type { Metadata } from 'next';
import { hasUserFilters, type RawSearchParams } from '@/lib/search-params';
import { pageMetadata } from '@/lib/seo';
import { CategoryPage } from '@/components/search/CategoryPage';

type Props = { searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return pageMetadata({
    title: 'Residential Property for Rent in Jaipur — Flats, Houses & Villas',
    description:
      'Flats, apartments, builder floors, independent houses and villas for rent in Jaipur. Filter by locality, budget, BHK and furnishing.',
    path: '/residential',
    index: !hasUserFilters(await searchParams),
  });
}

export default async function ResidentialPage({ searchParams }: Props) {
  return (
    <CategoryPage
      category="residential"
      raw={await searchParams}
      copy={{
        h1: 'Residential property for rent',
        intro:
          'Flats, builder floors, independent houses and villas — unfurnished, semi-furnished or fully furnished. Filter by locality, budget and number of bedrooms.',
        faqCategory: 'tenants',
        types: [
          {
            label: 'Apartments and flats',
            text: 'From compact 1 BHKs near offices and colleges to larger family flats in gated societies with lifts, security and power backup.',
          },
          {
            label: 'Builder floors',
            text: 'A full floor in a low-rise building, often with more space and privacy than an apartment at a similar rent.',
          },
          {
            label: 'Independent houses',
            text: 'Houses with their own entrance and parking, suited to larger families or anyone who wants room to grow.',
          },
          {
            label: 'Villas and bungalows',
            text: 'Premium standalone homes with gardens and multiple parking spaces in established neighbourhoods.',
          },
          {
            label: 'Furnished and semi-furnished homes',
            text: 'Move-in-ready options with appliances and furniture, useful for relocations and shorter stays.',
          },
          {
            label: 'PG and shared accommodation',
            text: 'Listed when available — ask our team about current options for students and working professionals.',
          },
        ],
      }}
    />
  );
}
