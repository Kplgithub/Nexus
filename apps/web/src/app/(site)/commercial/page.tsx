import type { Metadata } from 'next';
import {
  ListingPage,
  listingMetadata,
  type RawSearchParams,
} from '@/components/search/ListingPage';

type Props = { searchParams: Promise<RawSearchParams> };
const scope = { category: 'commercial' } as const;

const TYPES = [
  [
    'Office spaces',
    'Bare-shell, warm-shell and plug-and-play offices, with workstations, cabins and washrooms listed.',
  ],
  ['Retail shops', 'Ground-floor and high-street shops where frontage and footfall matter most.'],
  [
    'Showrooms',
    'Large-format spaces with display frontage for automobiles, furniture and lifestyle brands.',
  ],
  [
    'Commercial buildings',
    'Entire buildings or floors for clinics, institutes and corporate offices.',
  ],
  ['Co-working', 'Flexible desks and private cabins with shared meeting rooms.'],
] as const;

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return listingMetadata(scope, await searchParams);
}

export default async function CommercialPage({ searchParams }: Props) {
  return (
    <ListingPage
      scope={scope}
      raw={await searchParams}
      intro="Offices, shops, showrooms and commercial buildings to buy or lease. Use the deal filter to switch between sale and rent."
      after={
        <section className="mt-20 border-t border-line pt-12" aria-labelledby="types-heading">
          <h2 id="types-heading" className="text-2xl">
            Spaces listed here
          </h2>
          <dl className="mt-6 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {TYPES.map(([label, text]) => (
              <div key={label}>
                <dt className="font-semibold">{label}</dt>
                <dd className="mt-1 text-ink-soft">{text}</dd>
              </div>
            ))}
          </dl>
        </section>
      }
    />
  );
}
