import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import {
  AMENITY_LABELS,
  AREA_UNIT_LABELS,
  FURNISHING_LABELS,
  PARKING_LABELS,
  PROPERTY_TYPE_LABELS,
  floorLabel,
  formatArea,
  formatIndianPhone,
  formatINR,
  formatRent,
  whatsappLink,
  type PublicProperty,
} from '@nexus/shared';
import { getProperty, getSettings } from '@/lib/api';
import { absoluteUrl } from '@/lib/site';
import {
  breadcrumbJsonLd,
  listingJsonLd,
  pageMetadata,
  propertyDescription,
  propertyHeadline,
} from '@/lib/seo';
import { Gallery } from '@/components/property/Gallery';
import { PropertyGrid } from '@/components/property/PropertyCard';
import { EnquiryForm } from '@/components/forms/EnquiryForm';
import { Breadcrumbs, DemoBadge, JsonLd } from '@/components/ui';
import {
  AreaIcon,
  BathIcon,
  BedIcon,
  CalendarIcon,
  CarIcon,
  CheckIcon,
  InfoIcon,
  LayersIcon,
  MapPinIcon,
  PhoneIcon,
  SofaIcon,
  WhatsAppIcon,
} from '@/components/icons';

type Props = { params: Promise<{ slug: string }> };


async function load(slug: string) {
  const res = await getProperty(slug);
  if (!res) notFound();
  if (res.redirectTo) permanentRedirect(`/properties/${res.redirectTo}`);
  return res as { property: PublicProperty; similar: NonNullable<typeof res.similar> };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const res = await getProperty(slug);
  if (!res || !res.property) return { title: 'Property not found', robots: { index: false } };
  const p = res.property;
  return pageMetadata({
    title: p.seoTitle || propertyHeadline(p),
    description: p.seoDescription || propertyDescription(p),
    path: `/properties/${p.slug}`,
    image: p.coverImage?.url,
    // Rented and demo listings stay reachable but are kept out of search indexes.
    index: p.status === 'published' && !p.isDemo,
  });
}

export default async function PropertyPage({ params }: Props) {
  const { slug } = await params;
  const [{ property: p, similar }, settings] = await Promise.all([load(slug), getSettings()]);

  const crumbs = [
    { name: 'Home', href: '/' },
    { name: p.category === 'residential' ? 'Residential' : 'Commercial', href: `/${p.category}` },
    { name: p.locality.name, href: `/rentals/${p.city.slug}/${p.locality.slug}` },
    { name: p.title, href: `/properties/${p.slug}` },
  ];
  const waText = `Hello NEXUS Estate, I'm interested in "${p.title}" (${absoluteUrl(`/properties/${p.slug}`)}). Is it available?`;
  const available = p.availableFrom ? new Date(p.availableFrom) : null;
  const availableLabel =
    !available || available <= new Date()
      ? 'Available now'
      : `From ${available.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const facts: { Icon: typeof BedIcon; label: string; value: string }[] = [
    ...(p.bedrooms !== null
      ? [
          {
            Icon: BedIcon,
            label: 'Bedrooms',
            value: p.bedrooms === 0 ? 'Studio' : `${p.bedrooms} BHK`,
          },
        ]
      : []),
    ...(p.bathrooms !== null
      ? [{ Icon: BathIcon, label: 'Bathrooms', value: String(p.bathrooms) }]
      : []),
    ...(p.washrooms !== null && p.category !== 'residential'
      ? [{ Icon: BathIcon, label: 'Washrooms', value: String(p.washrooms) }]
      : []),
    {
      Icon: AreaIcon,
      label: `${cap(p.areaType.replace(/-/g, ' '))} area`,
      value: formatArea(p.areaValue, p.areaUnit),
    },
    { Icon: SofaIcon, label: 'Furnishing', value: FURNISHING_LABELS[p.furnishingStatus] },
    ...(floorLabel(p.floorNumber, p.totalFloors)
      ? [{ Icon: LayersIcon, label: 'Floor', value: floorLabel(p.floorNumber, p.totalFloors)! }]
      : []),
    { Icon: CarIcon, label: 'Parking', value: PARKING_LABELS[p.parking] },
    {
      Icon: CalendarIcon,
      label: 'Availability',
      value: p.status === 'rented' ? 'Rented' : availableLabel,
    },
  ];

  const terms: [string, string][] = [
    ['Monthly rent', `${formatINR(p.monthlyRent)}${p.rentNegotiable ? ' (negotiable)' : ''}`],
    ...(p.securityDeposit !== null
      ? [['Security deposit', formatINR(p.securityDeposit)] as [string, string]]
      : []),
    ...(p.maintenanceIncluded
      ? [['Maintenance', 'Included in rent'] as [string, string]]
      : p.maintenanceCharges !== null
        ? [['Maintenance', `${formatINR(p.maintenanceCharges)}/month`] as [string, string]]
        : []),
    ...(p.lockInMonths ? [['Lock-in period', `${p.lockInMonths} months`] as [string, string]] : []),
    ...(p.brokerage ? [['Brokerage', p.brokerage] as [string, string]] : []),
    ...(p.balconies !== null && p.balconies > 0
      ? [['Balconies', String(p.balconies)] as [string, string]]
      : []),
    ...(p.facing ? [['Facing', p.facing] as [string, string]] : []),
    ...(p.ageOfPropertyYears !== null
      ? [
          [
            'Property age',
            p.ageOfPropertyYears === 0 ? 'New' : `${p.ageOfPropertyYears} years`,
          ] as [string, string],
        ]
      : []),
    [
      'Area unit',
      `${AREA_UNIT_LABELS[p.areaUnit]} (≈ ${p.areaSqft.toLocaleString('en-IN')} sq ft)`,
    ],
  ];

  return (
    <div className="container-page pt-6">
      <JsonLd
        data={[
          breadcrumbJsonLd(crumbs),
          ...(!p.isDemo && p.status === 'published' ? [listingJsonLd(p)] : []),
        ]}
      />
      <Breadcrumbs items={crumbs} />

      {p.isDemo && (
        <div
          role="note"
          className="mt-4 flex items-start gap-2 rounded-lg border border-warn/30 bg-warn-50 p-3 text-sm text-warn"
        >
          <InfoIcon size={18} className="mt-0.5 shrink-0" />
          This is a demo listing used for testing the website. It is not a real, currently available
          property.
        </div>
      )}
      {p.status === 'rented' && (
        <div
          role="note"
          className="mt-4 flex items-start gap-2 rounded-lg border border-line bg-surface p-3 text-sm text-ink-soft"
        >
          <InfoIcon size={18} className="mt-0.5 shrink-0" />
          This property has been rented out. See similar properties below or tell us what you need.
        </div>
      )}

      <div className="mt-5">
        <Gallery images={p.images} title={p.title} />
      </div>

      <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_24rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-800">
              {PROPERTY_TYPE_LABELS[p.propertyType]}
            </span>
            <span className="rounded-md bg-surface px-2.5 py-1 text-xs font-semibold text-ink-soft">
              {cap(p.category)}
            </span>
            {p.isDemo && <DemoBadge />}
          </div>
          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl">{p.title}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-ink-soft">
            <MapPinIcon size={18} className="shrink-0 text-brand" />
            {[p.approvedAddress, `${p.locality.name}, ${p.city.name}`].filter(Boolean).join(' · ')}
          </p>
          <p className="mt-5 text-3xl font-bold text-brand-800">
            {formatRent(p.monthlyRent)}
            {p.rentNegotiable && (
              <span className="ml-2 align-middle text-sm font-medium text-ink-muted">
                Negotiable
              </span>
            )}
          </p>

          <section aria-labelledby="facts" className="mt-8">
            <h2 id="facts" className="sr-only">
              Key facts
            </h2>
            <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-[var(--radius-card)] border border-line bg-line sm:grid-cols-3">
              {facts.map(({ Icon, label, value }) => (
                <div key={label} className="bg-white p-4">
                  <dt className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-muted">
                    <Icon size={15} /> {label}
                  </dt>
                  <dd className="mt-1 font-semibold text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {p.highlights.length > 0 && (
            <section aria-labelledby="highlights" className="mt-10">
              <h2 id="highlights" className="text-xl font-bold">
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

          <section aria-labelledby="about" className="mt-10">
            <h2 id="about" className="text-xl font-bold">
              About this property
            </h2>
            <div className="prose-nexus mt-3 whitespace-pre-line">{p.description}</div>
          </section>

          {p.amenities.length > 0 && (
            <section aria-labelledby="amenities" className="mt-10">
              <h2 id="amenities" className="text-xl font-bold">
                Amenities
              </h2>
              <ul className="mt-4 flex flex-wrap gap-2">
                {p.amenities.map((a) => (
                  <li
                    key={a}
                    className="rounded-full border border-line bg-white px-3 py-1.5 text-sm text-ink-soft"
                  >
                    {AMENITY_LABELS[a]}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {p.suitableFor.length > 0 && (
            <section aria-labelledby="suitable" className="mt-10">
              <h2 id="suitable" className="text-xl font-bold">
                Suitable for
              </h2>
              <p className="mt-3 text-ink-soft">{p.suitableFor.join(', ')}</p>
            </section>
          )}

          <section aria-labelledby="terms" className="mt-10">
            <h2 id="terms" className="text-xl font-bold">
              Rent and terms
            </h2>
            <dl className="mt-4 divide-y divide-line rounded-[var(--radius-card)] border border-line">
              {terms.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 px-4 py-3 text-sm">
                  <dt className="text-ink-muted">{k}</dt>
                  <dd className="text-right font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            {p.rentalTerms && (
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                {p.rentalTerms}
              </p>
            )}
            <p className="mt-3 text-xs text-ink-muted">
              All terms are as shared by the owner and are confirmed before any agreement.
            </p>
          </section>
        </div>

        <aside
          aria-label="Enquire about this property"
          className="lg:sticky lg:top-24 lg:self-start"
        >
          <div className="card p-6">
            <h2 className="text-lg font-bold">Interested in this property?</h2>
            <p className="mt-1 text-sm text-ink-soft">
              Ask about availability or schedule a visit.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <a href={`tel:${settings.phone}`} className="btn btn-outline">
                <PhoneIcon size={18} /> Call
              </a>
              <a
                href={whatsappLink(settings.whatsapp, waText)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline"
              >
                <WhatsAppIcon size={18} /> WhatsApp
              </a>
            </div>
            <p className="mt-2 text-center text-xs text-ink-muted">
              {formatIndianPhone(settings.phone)}
            </p>
            <div className="my-5 border-t border-line" />
            <EnquiryForm
              type="property"
              propertyId={p.id}
              propertyTitle={p.title}
              sourcePage={`/properties/${p.slug}`}
              submitLabel="Send enquiry"
            />
          </div>
        </aside>
      </div>

      {similar.length > 0 && (
        <section aria-labelledby="similar" className="mt-20">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <h2 id="similar" className="text-2xl font-bold">
              Similar properties
            </h2>
            <Link
              href={`/rentals/${p.city.slug}/${p.locality.slug}`}
              className="font-semibold text-brand hover:underline"
            >
              More in {p.locality.name}
            </Link>
          </div>
          <PropertyGrid items={similar} />
        </section>
      )}
    </div>
  );
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
