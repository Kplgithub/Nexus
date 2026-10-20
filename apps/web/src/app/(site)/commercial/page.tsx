import type { Metadata } from 'next';
import { hasUserFilters, type RawSearchParams } from '@/lib/search-params';
import { pageMetadata } from '@/lib/seo';
import { CategoryPage } from '@/components/search/CategoryPage';

type Props = { searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return pageMetadata({
    title: 'Commercial Property for Rent in Jaipur — Offices, Shops & Showrooms',
    description:
      'Office spaces, retail shops, showrooms and co-working space for rent in Jaipur. Compare area, rent, parking, power backup and lock-in.',
    path: '/commercial',
    index: !hasUserFilters(await searchParams),
  });
}

export default async function CommercialPage({ searchParams }: Props) {
  return (
    <CategoryPage
      category="commercial"
      raw={await searchParams}
      copy={{
        h1: 'Commercial property for rent',
        intro:
          'Offices, retail shops, showrooms and co-working space. Filter by area, budget, furnishing, parking and facilities such as power backup.',
        faqCategory: 'commercial',
        types: [
          {
            label: 'Office spaces',
            text: 'Bare-shell, warm-shell and plug-and-play offices for teams of every size, with details on workstations, cabins and washrooms.',
          },
          {
            label: 'Retail shops',
            text: 'Ground-floor and high-street shops where frontage, footfall and visibility matter most.',
          },
          {
            label: 'Showrooms',
            text: 'Large-format spaces with display frontage for automobiles, furniture, electronics and lifestyle brands.',
          },
          {
            label: 'Commercial buildings',
            text: 'Entire buildings or floors for institutions, clinics, training centres and corporate offices.',
          },
          {
            label: 'Co-working spaces',
            text: 'Flexible desks and private cabins with shared meeting rooms, listed when available.',
          },
          {
            label: 'Other commercial units',
            text: 'Tell us how you plan to use the space and we will check suitability, permissions and terms with the owner.',
          },
        ],
      }}
    />
  );
}
