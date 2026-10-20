import Link from 'next/link';
import type { Category } from '@nexus/shared';
import { getFaqs, getLocations, getSettings } from '@/lib/api';
import { parseSearch, type RawSearchParams } from '@/lib/search-params';
import { breadcrumbJsonLd } from '@/lib/seo';
import { ListingResults } from './ListingResults';
import { Breadcrumbs, FaqList, JsonLd, faqJsonLd } from '../ui';

type Copy = {
  h1: string;
  intro: string;
  types: { label: string; text: string }[];
  faqCategory: 'tenants' | 'commercial';
};

export async function CategoryPage({
  category,
  raw,
  copy,
}: {
  category: Category;
  raw: RawSearchParams;
  copy: Copy;
}) {
  const path = `/${category}`;
  const search = parseSearch(raw, { category });
  const [cities, settings, faqs] = await Promise.all([
    getLocations(),
    getSettings(),
    getFaqs({ category: copy.faqCategory }),
  ]);
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: category === 'residential' ? 'Residential rentals' : 'Commercial rentals', href: path },
  ];
  const city = cities[0];

  return (
    <div className="container-page pt-8">
      <JsonLd data={[breadcrumbJsonLd(crumbs), ...(faqs.length ? [faqJsonLd(faqs)] : [])]} />
      <Breadcrumbs items={crumbs} />
      <header className="mb-8 mt-4">
        <h1 className="text-3xl font-bold sm:text-4xl">{copy.h1}</h1>
        <p className="mt-2 max-w-3xl text-ink-soft">{copy.intro}</p>
      </header>

      <ListingResults
        search={search}
        cities={cities}
        basePath={path}
        fixed={{ category }}
        phone={settings.phone}
      />

      <section className="mt-20 grid gap-10 lg:grid-cols-2" aria-labelledby="types-heading">
        <div>
          <h2 id="types-heading" className="text-2xl font-bold">
            {category === 'residential'
              ? 'Homes we help you find'
              : 'Business spaces we help you find'}
          </h2>
          <dl className="mt-5 space-y-4">
            {copy.types.map((t) => (
              <div key={t.label}>
                <dt className="font-semibold text-ink">{t.label}</dt>
                <dd className="mt-1 text-ink-soft">{t.text}</dd>
              </div>
            ))}
          </dl>
          {city && (
            <p className="mt-6 text-ink-soft">
              Looking in a specific area? Browse{' '}
              <Link
                href={`/rentals/${city.slug}`}
                className="font-semibold text-brand underline-offset-2 hover:underline"
              >
                rentals by locality in {city.name}
              </Link>
              .
            </p>
          )}
        </div>
        {faqs.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold">Common questions</h2>
            <div className="mt-5">
              <FaqList faqs={faqs} />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
