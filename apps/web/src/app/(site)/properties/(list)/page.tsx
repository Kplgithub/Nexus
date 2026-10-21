import type { Metadata } from 'next';
import {
  ListingPage,
  listingMetadata,
  type RawSearchParams,
} from '@/components/search/ListingPage';

type Props = { searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return listingMetadata({}, await searchParams);
}

export default async function PropertiesPage({ searchParams }: Props) {
  return (
    <ListingPage
      scope={{}}
      raw={await searchParams}
      intro="Every live listing in one place — homes and commercial spaces, for sale and for rent."
    />
  );
}
