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
  formatINR,
  formatINRShort,
  formatPrice,
  OWNERSHIP_LABELS,
  POSSESSION_LABELS,
  PREFERRED_TENANT_LABELS,
  TRANSACTION_LABELS,
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
import { ContactPanel } from '@/components/property/ContactPanel';
import { SaveButton } from '@/components/property/SaveButton';
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
  BadgeCheckIcon,
  MapPinIcon,
  SofaIcon,
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
    // Closed (rented/sold) and demo listings stay reachable but are kept out of search indexes.
    index: p.status === 'published' && !p.isDemo,
  });
}

export default async function PropertyPage({ params }: Props) {
  const { slug } = await params;
  const [{ property: p, similar }, settings] = await Promise.all([load(slug), getSettings()]);
  const isSale = p.listingType === 'sale';
  const dealRoot = isSale ? '/buy' : '/rent';
  const closed = p.status !== 'published';

  const crumbs = [
    { name: 'Home', href: '/' },
    { name: isSale ? 'Buy' : 'Rent', href: dealRoot },
    { name: p.city.name, href: `${dealRoot}/${p.city.slug}` },
    { name: p.locality.name, href: `${dealRoot}/${p.city.slug}/${p.locality.slug}` },
    { name: p.title, href: `/properties/${p.slug}` },
  ];
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const available = p.availableFrom ? new Date(p.availableFrom) : null;
  const availableLabel =
    !available || available <= new Date() ? 'Available now' : `From ${fmtDate(p.availableFrom!)}`;

  type Fact = { Icon: typeof BedIcon; label: string; value: string };
  const facts: Fact[] = [];
  if (p.bedrooms !== null)
    facts.push({
      Icon: BedIcon,
      label: 'Bedrooms',
      value: p.bedrooms === 0 ? 'Studio' : `${p.bedrooms} BHK`,
    });
  if (p.bathrooms !== null)
    facts.push({ Icon: BathIcon, label: 'Bathrooms', value: String(p.bathrooms) });
  if (p.washrooms !== null && p.category !== 'residential')
    facts.push({ Icon: BathIcon, label: 'Washrooms', value: String(p.washrooms) });
  facts.push({
    Icon: AreaIcon,
    label: `${cap(p.areaType.replace(/-/g, ' '))} area`,
    value: formatArea(p.areaValue, p.areaUnit),
  });
  if (p.propertyType !== 'plot')
    facts.push({
      Icon: SofaIcon,
      label: 'Furnishing',
      value: FURNISHING_LABELS[p.furnishingStatus],
    });
  const floor = floorLabel(p.floorNumber, p.totalFloors);
  if (floor) facts.push({ Icon: LayersIcon, label: 'Floor', value: floor });
  facts.push({ Icon: CarIcon, label: 'Parking', value: PARKING_LABELS[p.parking] });
  if (isSale) {
    facts.push({
      Icon: CalendarIcon,
      label: 'Possession',
      value:
        p.status === 'sold'
          ? 'Sold'
          : p.possessionStatus === 'under-construction' && p.possessionDate
            ? `By ${new Date(p.possessionDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}`
            : p.possessionStatus
              ? POSSESSION_LABELS[p.possessionStatus]
              : '—',
    });
  } else {
    facts.push({
      Icon: CalendarIcon,
      label: 'Availability',
      value: p.status === 'rented' ? 'Rented' : availableLabel,
    });
  }

  const row = (k: string, v: string | null | undefined): [string, string][] => (v ? [[k, v]] : []);
  const terms: [string, string][] = isSale
    ? [
        ...row('Asking price', `${formatINR(p.price)}${p.priceNegotiable ? ' (negotiable)' : ''}`),
        ...row('Price per sq ft', p.pricePerSqft ? `${formatINR(p.pricePerSqft)}` : null),
        ...row('Project', p.projectName),
        ...row('Transaction', p.transactionType ? TRANSACTION_LABELS[p.transactionType] : null),
        ...row('Ownership', p.ownershipType ? OWNERSHIP_LABELS[p.ownershipType] : null),
        ...row('Possession', p.possessionStatus ? POSSESSION_LABELS[p.possessionStatus] : null),
        ...row(
          'Expected possession',
          p.possessionStatus === 'under-construction' && p.possessionDate
            ? fmtDate(p.possessionDate)
            : null,
        ),
        ...row('RERA registration', p.reraId),
        ...row(
          'Maintenance',
          p.maintenanceCharges !== null ? `${formatINR(p.maintenanceCharges)}/month` : null,
        ),
      ]
    : [
        ...row('Monthly rent', `${formatINR(p.price)}${p.priceNegotiable ? ' (negotiable)' : ''}`),
        ...row(
          'Security deposit',
          p.securityDeposit !== null ? formatINR(p.securityDeposit) : null,
        ),
        ...row(
          'Maintenance',
          p.maintenanceIncluded
            ? 'Included in rent'
            : p.maintenanceCharges !== null
              ? `${formatINR(p.maintenanceCharges)}/month`
              : null,
        ),
        ...row('Lock-in period', p.lockInMonths ? `${p.lockInMonths} months` : null),
        ...row('Brokerage', p.brokerage),
        ...row(
          'Preferred tenants',
          p.preferredTenants.length
            ? p.preferredTenants.map((t) => PREFERRED_TENANT_LABELS[t]).join(', ')
            : null,
        ),
      ];
  const more: [string, string][] = [
    ...row('Balconies', p.balconies ? String(p.balconies) : null),
    ...row('Facing', p.facing),
    ...row(
      'Property age',
      p.ageOfPropertyYears !== null
        ? p.ageOfPropertyYears === 0
          ? 'New'
          : `${p.ageOfPropertyYears} years`
        : null,
    ),
    ...row(
      'Area in sq ft',
      p.areaUnit !== 'sqft'
        ? `≈ ${p.areaSqft.toLocaleString('en-IN')} sq ft (${AREA_UNIT_LABELS[p.areaUnit]})`
        : null,
    ),
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
      {closed && (
        <div
          role="note"
          className="mt-4 flex items-start gap-2 rounded-lg border border-line bg-surface p-3 text-sm text-ink-soft"
        >
          <InfoIcon size={18} className="mt-0.5 shrink-0" />
          {p.status === 'sold'
            ? 'This property has been sold.'
            : 'This property has been rented out.'}{' '}
          See similar properties below or tell us what you need.
        </div>
      )}

      <div className="mt-5">
        <Gallery images={p.images} title={p.title} />
      </div>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_24rem]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full bg-brand-900 px-3 py-1 font-semibold text-white">
              For {isSale ? 'sale' : 'rent'}
            </span>
            <span className="rounded-full border border-line px-3 py-1 text-ink-soft">
              {PROPERTY_TYPE_LABELS[p.propertyType]}
            </span>
            {p.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-accent-50 px-3 py-1 font-medium text-accent-700">
                <BadgeCheckIcon size={15} /> Verified
              </span>
            )}
            {p.isDemo && <DemoBadge />}
          </div>
          <h1 className="mt-4 text-[2rem] leading-[1.15] sm:text-[2.6rem]">{p.title}</h1>
          <p className="mt-3 flex items-start gap-1.5 text-ink-soft">
            <MapPinIcon size={18} className="mt-0.5 shrink-0 text-brand" />
            {[p.projectName, p.approvedAddress, `${p.locality.name}, ${p.city.name}`]
              .filter(Boolean)
              .join(', ')}
          </p>

          <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-y border-line py-5">
            <div>
              <p className="tabular font-display text-[2.4rem] leading-none text-brand-900">
                {formatPrice(p.price, p.listingType)}
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                {isSale
                  ? [
                      p.pricePerSqft ? `${formatINRShort(p.pricePerSqft)} per sq ft` : null,
                      p.priceNegotiable ? 'Negotiable' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Asking price'
                  : [
                      p.securityDeposit ? `Deposit ${formatINRShort(p.securityDeposit)}` : null,
                      p.priceNegotiable ? 'Negotiable' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Monthly rent'}
              </p>
            </div>
            <SaveButton propertyId={p.id} title={p.title} variant="button" />
          </div>

          <section aria-labelledby="facts" className="mt-8">
            <h2 id="facts" className="sr-only">
              Key facts
            </h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
              {facts.map(({ Icon, label, value }) => (
                <div key={label}>
                  <dt className="flex items-center gap-1.5 text-sm text-ink-muted">
                    <Icon size={16} /> {label}
                  </dt>
                  <dd className="mt-1 font-semibold">{value}</dd>
                </div>
              ))}
            </dl>
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
              About this property
            </h2>
            <div className="prose-nexus mt-3 max-w-[70ch] whitespace-pre-line">{p.description}</div>
          </section>

          <section aria-labelledby="terms" className="mt-12">
            <h2 id="terms" className="text-2xl">
              {isSale ? 'Price and legal' : 'Rent and terms'}
            </h2>
            <dl className="mt-4 divide-y divide-line border-y border-line">
              {[...terms, ...more].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-3 text-sm">
                  <dt className="text-ink-muted">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
            {!isSale && p.rentalTerms && (
              <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-ink-soft">
                {p.rentalTerms}
              </p>
            )}
            <p className="mt-3 text-xs text-ink-muted">
              Details are as shared by the {p.poster.type === 'nexus' ? 'owner' : 'poster'}. Confirm
              everything, including documents{isSale ? ' and RERA status' : ''}, before you pay or
              sign.
            </p>
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

          {p.suitableFor.length > 0 && (
            <section aria-labelledby="suitable" className="mt-12">
              <h2 id="suitable" className="text-2xl">
                Suitable for
              </h2>
              <p className="mt-3 text-ink-soft">{p.suitableFor.join(', ')}</p>
            </section>
          )}
        </div>

        <aside
          aria-label="Contact about this property"
          className="lg:sticky lg:top-24 lg:self-start"
        >
          <ContactPanel
            propertyId={p.id}
            propertyTitle={p.title}
            slug={p.slug}
            poster={p.poster}
            closed={closed}
            office={{ phone: settings.phone, whatsapp: settings.whatsapp }}
            shareUrl={absoluteUrl(`/properties/${p.slug}`)}
          />
        </aside>
      </div>

      {similar.length > 0 && (
        <section aria-labelledby="similar" className="mt-24">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <h2 id="similar" className="text-[2rem]">
              Similar properties
            </h2>
            <Link
              href={`${dealRoot}/${p.city.slug}/${p.locality.slug}`}
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
