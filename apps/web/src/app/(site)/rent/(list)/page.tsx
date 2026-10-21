import type { Metadata } from 'next';
import {
  ListingPage,
  listingMetadata,
  type RawSearchParams,
} from '@/components/search/ListingPage';

type Props = { searchParams: Promise<RawSearchParams> };
const scope = { deal: 'rent' } as const;

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return listingMetadata(scope, await searchParams);
}

export default async function Page({ searchParams }: Props) {
  return (
    <ListingPage
      scope={scope}
      raw={await searchParams}
      intro="Flats, houses, offices and shops for rent. Compare rent, deposit, furnishing and availability, then contact the owner or agent directly."
    />
  );
}
