import type { Metadata } from 'next';
import {
  ListingPage,
  listingMetadata,
  type RawSearchParams,
} from '@/components/search/ListingPage';

type Props = { searchParams: Promise<RawSearchParams> };
const scope = { deal: 'sale' } as const;

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return listingMetadata(scope, await searchParams);
}

export default async function Page({ searchParams }: Props) {
  return (
    <ListingPage
      scope={scope}
      raw={await searchParams}
      intro="Apartments, independent houses, villas, plots and commercial spaces listed by owners, agents and builders. Every listing is reviewed by our team before it goes live."
    />
  );
}
