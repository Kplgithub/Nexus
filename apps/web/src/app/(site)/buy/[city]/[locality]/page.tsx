import type { Metadata } from 'next';
import {
  ListingPage,
  listingMetadata,
  type RawSearchParams,
} from '@/components/search/ListingPage';

type Props = {
  params: Promise<{ city: string; locality: string }>;
  searchParams: Promise<RawSearchParams>;
};

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { city, locality } = await params;
  return listingMetadata({ deal: 'sale', city, locality }, await searchParams);
}

export default async function Page({ params, searchParams }: Props) {
  const { city, locality } = await params;
  return <ListingPage scope={{ deal: 'sale', city, locality }} raw={await searchParams} />;
}
