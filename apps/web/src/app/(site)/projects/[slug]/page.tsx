import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  AMENITY_LABELS,
  PROJECT_STAGE_LABELS,
  formatINRShort,
  formatPriceRange,
} from '@nexus/shared';
import { getProject, getSettings, searchProperties } from '@/lib/api';
import { LoanCta } from '@/components/loan/LoanCta';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { absoluteUrl } from '@/lib/site';
import { Gallery } from '@/components/property/Gallery';
import { PropertyGrid } from '@/components/property/PropertyCard';
import { EmiCalculator } from '@/components/property/EmiCalculator';
import { VideoTour } from '@/components/property/VideoTour';
import { ViewBeacon } from '@/components/property/ViewBeacon';
import { EnquiryForm } from '@/components/forms/EnquiryForm';
import { MapView } from '@/components/map/Map';
import { Breadcrumbs, JsonLd } from '@/components/ui';
import { BadgeCheckIcon, CheckIcon, MapPinIcon } from '@/components/icons';

// Cache each page after its first visit and refresh it in the background once a minute (ISR).
// No paths are built ahead of time, so builds stay fast and do not need the API.
export const revalidate = 60;
export async function generateStaticParams() {
  return [];
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getProject((await params).slug);
  if (!p) return { title: 'Project not found', robots: { index: false } };
  return pageMetadata({
    title: p.seoTitle || `${p.name}, ${p.locality.name}: price, floor plans and possession`,
    description:
      p.seoDescription ||
      `${p.name} by ${p.builder.companyName || p.builder.name} in ${p.locality.name}, ${p.city.name}. ${formatPriceRange(p.priceRange.min, p.priceRange.max)}. ${PROJECT_STAGE_LABELS[p.stage]}.`,
    path: `/projects/${p.slug}`,
    image: p.coverImage?.url,
  });
}

const fmtMonth = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const p = await getProject(slug);
  if (!p) notFound();
  const [units, settings] = await Promise.all([
    searchProperties(`project=${p.slug}&limit=6`).catch(() => null),
    getSettings(),
  ]);
  const builderName = p.builder.companyName || p.builder.name;

  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'New projects', href: '/projects' },
    { name: p.locality.name, href: `/projects?city=${p.city.slug}&locality=${p.locality.slug}` },
    { name: p.name, href: `/projects/${p.slug}` },
  ];
  const facts: [string, string][] = [
    ['Stage', PROJECT_STAGE_LABELS[p.stage]],
    ...(p.possessionDate ? [['Possession', fmtMonth(p.possessionDate)] as [string, string]] : []),
    ...(p.launchDate ? [['Launched', fmtMonth(p.launchDate)] as [string, string]] : []),
    ...(p.totalUnits ? [['Units', p.totalUnits.toLocaleString('en-IN')] as [string, string]] : []),
    ...(p.totalTowers ? [['Towers', String(p.totalTowers)] as [string, string]] : []),
    ...(p.landAreaAcres ? [['Land area', `${p.landAreaAcres} acres`] as [string, string]] : []),
    ...(p.reraId ? [['RERA', p.reraId] as [string, string]] : []),
  ];

  return (
    <div className="container-page pt-6">
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          {
            '@context': 'https://schema.org',
            '@type': 'ApartmentComplex',
            name: p.name,
            url: absoluteUrl(`/projects/${p.slug}`),
            description: p.description.slice(0, 300),
            address: {
              '@type': 'PostalAddress',
              addressLocality: `${p.locality.name}, ${p.city.name}`,
              addressCountry: 'IN',
            },
            ...(p.location
              ? {
                  geo: {
                    '@type': 'GeoCoordinates',
                    latitude: p.location.lat,
                    longitude: p.location.lng,
                  },
                }
              : {}),
          },
        ]}
      />
      <ViewBeacon path={`/projects/${p.id}/view`} />
      <Breadcrumbs items={crumbs} />

      <div className="mt-5">
        <Gallery images={p.images} title={p.name} />
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_24rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-brand-900 px-3 py-1 font-semibold text-white">
              {PROJECT_STAGE_LABELS[p.stage]}
            </span>
            {p.reraId && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-3 py-1 font-medium text-accent-700">
                <BadgeCheckIcon size={15} /> RERA registered
              </span>
            )}
          </div>
          <h1 className="mt-4 text-[2rem] leading-[1.15] sm:text-[2.6rem]">{p.name}</h1>
          <p className="mt-2 text-ink-soft">
            By{' '}
            {p.builder.profilePath ? (
              <Link
                href={p.builder.profilePath}
                className="font-semibold text-brand hover:underline"
              >
                {builderName}
              </Link>
            ) : (
              <span className="font-semibold">{builderName}</span>
            )}
            {p.builder.verified && (
              <BadgeCheckIcon
                size={16}
                className="ml-1 inline text-accent-700"
                aria-label="Verified"
              />
            )}
          </p>
          <p className="mt-2 flex items-start gap-1.5 text-ink-soft">
            <MapPinIcon size={18} className="mt-0.5 shrink-0 text-brand" />
            {[p.address, `${p.locality.name}, ${p.city.name}`].filter(Boolean).join(', ')}
          </p>

          <div className="mt-6 border-y border-line py-5">
            <p className="tabular font-display text-[2.4rem] leading-none text-brand-900">
              {formatPriceRange(p.priceRange.min, p.priceRange.max)}
            </p>
            <p className="mt-2 text-sm text-ink-muted">Price range as shared by the builder</p>
          </div>

          <dl className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
            {facts.map(([k, v]) => (
              <div key={k}>
                <dt className="text-sm text-ink-muted">{k}</dt>
                <dd className="mt-1 break-words font-semibold">{v}</dd>
              </div>
            ))}
          </dl>

          <section aria-labelledby="configs" className="mt-12">
            <h2 id="configs" className="text-2xl">
              Unit types and prices
            </h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-ink-muted">
                    <th className="py-2 font-medium">Type</th>
                    <th className="py-2 font-medium">Size (sq ft)</th>
                    <th className="py-2 text-right font-medium">Price</th>
                    <th className="py-2 text-right font-medium">Floor plan</th>
                  </tr>
                </thead>
                <tbody>
                  {p.configurations.map((c, i) => (
                    <tr key={i} className="border-b border-line">
                      <td className="py-3 font-medium">{c.label}</td>
                      <td className="tabular py-3">
                        {c.minAreaSqft === c.maxAreaSqft
                          ? c.minAreaSqft.toLocaleString('en-IN')
                          : `${c.minAreaSqft.toLocaleString('en-IN')} – ${c.maxAreaSqft.toLocaleString('en-IN')}`}
                      </td>
                      <td className="tabular py-3 text-right">
                        {formatPriceRange(c.minPrice, c.maxPrice)}
                      </td>
                      <td className="py-3 text-right">
                        {c.floorPlanUrl ? (
                          <a
                            href={c.floorPlanUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-brand hover:underline"
                          >
                            View
                          </a>
                        ) : (
                          <span className="text-ink-muted">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {p.configurations.some((c) => c.floorPlanUrl) && (
              <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
                {p.configurations
                  .filter((c) => c.floorPlanUrl)
                  .map((c, i) => (
                    <li key={i}>
                      <a
                        href={c.floorPlanUrl!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block overflow-hidden rounded-xl border border-line bg-white"
                      >
                        <span className="relative block aspect-square">
                          <Image
                            src={c.floorPlanUrl!}
                            alt={`Floor plan: ${c.label}`}
                            fill
                            sizes="(min-width: 640px) 220px, 45vw"
                            unoptimized
                            className="object-contain p-2"
                          />
                        </span>
                        <span className="block border-t border-line px-3 py-2 text-sm font-medium">
                          {c.label}
                        </span>
                      </a>
                    </li>
                  ))}
              </ul>
            )}
            {p.brochureUrl && (
              <a
                href={p.brochureUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline mt-6"
              >
                Download brochure
              </a>
            )}
          </section>

          {p.highlights.length > 0 && (
            <section aria-labelledby="highlights" className="mt-12">
              <h2 id="highlights" className="text-2xl">
                Highlights
              </h2>
              <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
                {p.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2 text-ink-soft">
                    <CheckIcon size={18} className="mt-0.5 shrink-0 text-accent-700" /> {h}
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section aria-labelledby="about" className="mt-12">
            <h2 id="about" className="text-2xl">
              About {p.name}
            </h2>
            <div className="prose-nexus mt-3 max-w-[70ch] whitespace-pre-line">{p.description}</div>
          </section>

          {p.amenities.length > 0 && (
            <section aria-labelledby="amenities" className="mt-12">
              <h2 id="amenities" className="text-2xl">
                Amenities
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {p.amenities.map((a) => (
                  <li key={a} className="chip">
                    {AMENITY_LABELS[a]}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {p.videoUrl && (
            <section aria-labelledby="video" className="mt-12">
              <h2 id="video" className="text-2xl">
                Video
              </h2>
              <div className="mt-4">
                <VideoTour url={p.videoUrl} title={p.name} />
              </div>
            </section>
          )}

          <section aria-labelledby="location" className="mt-12">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="location" className="text-2xl">
                Location
              </h2>
              <Link
                href={`/buy/${p.city.slug}/${p.locality.slug}`}
                className="text-sm font-semibold text-brand hover:underline"
              >
                About {p.locality.name}: prices and nearby places
              </Link>
            </div>
            {p.location ? (
              <div className="mt-4">
                <MapView
                  markers={[{ ...p.location, title: p.name, kind: 'project' }]}
                  zoom={15}
                  label={`Map showing ${p.name}`}
                  className="h-80"
                />
              </div>
            ) : (
              <p className="mt-3 text-ink-soft">
                {[p.address, p.locality.name, p.city.name].filter(Boolean).join(', ')}
              </p>
            )}
          </section>

          <section aria-labelledby="emi" className="mt-12">
            <h2 id="emi" className="text-2xl">
              Home loan EMI
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Starting price {formatINRShort(p.priceRange.min)}. Adjust to your unit.
            </p>
            <div className="mt-4">
              <EmiCalculator price={p.priceRange.min} rate={settings.homeLoan?.exampleRate} />
              {settings.homeLoan?.enabled && (
                <LoanCta
                  propertyTitle={p.name}
                  price={p.priceRange.min}
                  sourcePage={`/projects/${p.slug}`}
                />
              )}
            </div>
          </section>

          <p className="mt-10 text-xs text-ink-muted">
            Details are as shared by the builder and checked by NEXUS Estate before going live.
            Confirm RERA registration on rera.rajasthan.gov.in and read the agreement before you
            book.
          </p>
        </div>

        <aside
          aria-label="Enquire about this project"
          className="lg:sticky lg:top-24 lg:self-start"
        >
          <div className="card p-6">
            <h2 className="font-sans text-lg font-semibold">Get the price list and offers</h2>
            <p className="mt-1 text-sm text-ink-muted">{builderName} will contact you.</p>
            <div className="mt-5">
              <EnquiryForm
                type="property"
                projectId={p.id}
                propertyTitle={p.name}
                sourcePage={`/projects/${p.slug}`}
                submitLabel="Request call back"
                recipient={builderName}
              />
            </div>
          </div>
        </aside>
      </div>

      {units && units.items.length > 0 && (
        <section aria-labelledby="units" className="mt-24">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <h2 id="units" className="text-[2rem]">
              Available units in {p.name}
            </h2>
            {units.meta.total > units.items.length && (
              <Link
                href={`/properties?project=${p.slug}`}
                className="font-semibold text-brand hover:underline"
              >
                All {units.meta.total} units
              </Link>
            )}
          </div>
          <PropertyGrid items={units.items} />
        </section>
      )}
    </div>
  );
}
