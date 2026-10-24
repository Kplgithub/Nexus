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
  PG_GENDER_LABELS,
  PG_SHARING_LABELS,
  PLOT_APPROVAL_LABELS,
  type PublicProperty,
} from '@nexus/shared';
import { getLocalityInsights, getProperty, getSettings } from '@/lib/api';
import { absoluteUrl } from '@/lib/site';
import {
  breadcrumbJsonLd,
  listingJsonLd,
  pageMetadata,
  propertyDescription,
  propertyHeadline,
} from '@/lib/seo';
import { AiSummary } from '@/components/property/AiSummary';
import { Gallery } from '@/components/property/Gallery';
import { StickyBar } from '@/components/property/StickyBar';
import { PropertyGrid } from '@/components/property/PropertyCard';
import { ContactPanel } from '@/components/property/ContactPanel';
import { SaveButton } from '@/components/property/SaveButton';
import { EmiCalculator } from '@/components/property/EmiCalculator';
import { ReportListing } from '@/components/property/ReportListing';
import { VideoTour } from '@/components/property/VideoTour';
import { ViewBeacon } from '@/components/property/ViewBeacon';
import { MapView } from '@/components/map/Map';
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
  const insights = await getLocalityInsights(p.city.slug, p.locality.slug);
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
    ...row('Approved by', p.plotApproval ? PLOT_APPROVAL_LABELS[p.plotApproval] : null),
    ...row('Road in front', p.roadWidthFt ? `${p.roadWidthFt} ft` : null),
    ...row('Open sides', p.openSides ? String(p.openSides) : null),
    ...row('Corner plot', p.propertyType === 'plot' && p.cornerPlot ? 'Yes' : null),
    ...row('Boundary wall', p.propertyType === 'plot' && p.boundaryWall ? 'Yes' : null),
    ...row('For', p.pgGender ? PG_GENDER_LABELS[p.pgGender] : null),
    ...row(
      'Room sharing',
      p.pgSharing.length ? p.pgSharing.map((x) => PG_SHARING_LABELS[x]).join(', ') : null,
    ),
    ...row(
      'Meals',
      p.propertyType === 'pg' ? (p.pgFoodIncluded ? 'Included' : 'Not included') : null,
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
      <StickyBar
        title={p.title}
        price={formatPrice(p.price, p.listingType)}
        watchId="price-card"
        sections={[
          { id: 'facts', label: 'Overview' },
          { id: 'about', label: 'Details' },
          { id: 'terms', label: isSale ? 'Price and legal' : 'Rent and terms' },
          ...(p.amenities.length ? [{ id: 'amenities', label: 'Amenities' }] : []),
          { id: 'location', label: 'Location' },
          ...(isSale && !closed && p.price > 0 ? [{ id: 'emi', label: 'EMI' }] : []),
        ]}
      />
      {!closed && !p.isDemo && <ViewBeacon path={`/properties/${p.id}/view`} />}

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
            <span>
              {p.project ? (
                <>
                  <Link
                    href={`/projects/${p.project.slug}`}
                    className="font-medium text-brand hover:underline"
                  >
                    {p.project.name}
                  </Link>
                  {', '}
                </>
              ) : null}
              {[
                p.project ? null : p.projectName,
                p.approvedAddress,
                `${p.locality.name}, ${p.city.name}`,
              ]
                .filter(Boolean)
                .join(', ')}
            </span>
          </p>

          <div
            id="price-card"
            className="relative isolate mt-6 flex flex-wrap items-end justify-between gap-4 overflow-hidden rounded-2xl bg-brand-900 p-5 text-white sm:p-6"
          >
            <div className="nx-aurora" aria-hidden />
            <div className="relative">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent">
                {isSale ? 'Asking price' : 'Monthly rent'}
              </p>
              <p className="tabular mt-1 font-display text-[2.4rem] leading-none text-white">
                {formatPrice(p.price, p.listingType)}
              </p>
              <p className="mt-2 text-sm text-white/70">
                {isSale
                  ? [
                      p.pricePerSqft ? `${formatINRShort(p.pricePerSqft)} per sq ft` : null,
                      p.priceNegotiable ? 'Negotiable' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Price as listed by the poster'
                  : [
                      p.securityDeposit ? `Deposit ${formatINRShort(p.securityDeposit)}` : null,
                      p.priceNegotiable ? 'Negotiable' : null,
                    ]
                      .filter(Boolean)
                      .join(' · ') || 'Per month'}
              </p>
            </div>
            <div className="relative rounded-xl bg-white p-1">
              <SaveButton propertyId={p.id} title={p.title} variant="button" />
            </div>
          </div>

          <AiSummary p={p} insights={insights} />

          <section aria-labelledby="facts" className="mt-8">
            <h2 id="facts" className="mb-4 text-2xl">
              Overview
            </h2>
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {facts.map(({ Icon, label, value }, i) => (
                <div
                  key={label}
                  className="nx-rise nx-lift flex items-start gap-3 rounded-2xl border border-line bg-white p-3.5"
                  style={{ '--i': i } as React.CSSProperties}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand">
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0">
                    <dt className="text-xs text-ink-muted">{label}</dt>
                    <dd className="mt-0.5 font-semibold leading-snug">{value}</dd>
                  </div>
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
                  <li
                    key={h}
                    className="flex items-start gap-2 rounded-xl bg-surface px-3 py-2.5 text-ink-soft"
                  >
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

          {p.videoUrl && (
            <section aria-labelledby="video" className="mt-12">
              <h2 id="video" className="text-2xl">
                Video tour
              </h2>
              <div className="mt-4">
                <VideoTour url={p.videoUrl} title={p.title} />
              </div>
            </section>
          )}

          <section aria-labelledby="location" className="mt-12">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <h2 id="location" className="text-2xl">
                Location
              </h2>
              <Link
                href={`${dealRoot}/${p.city.slug}/${p.locality.slug}`}
                className="text-sm font-semibold text-brand hover:underline"
              >
                About {p.locality.name}: prices and nearby places
              </Link>
            </div>
            {p.location ? (
              <div className="mt-4">
                <MapView
                  markers={[{ ...p.location, title: p.title }]}
                  zoom={15}
                  approximate={p.poster.type === 'owner'}
                  label={`Map showing ${p.locality.name}`}
                  className="h-80"
                />
                {p.poster.type === 'owner' && (
                  <p className="mt-2 text-xs text-ink-muted">
                    The circle shows the approximate area. The owner shares the exact address when
                    you contact them.
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-3 text-ink-soft">
                {[p.approvedAddress, p.locality.name, p.city.name].filter(Boolean).join(', ')}. The
                poster has not added a map pin yet.
              </p>
            )}
          </section>

          {isSale && !closed && p.price > 0 && (
            <section aria-labelledby="emi" className="mt-12">
              <h2 id="emi" className="text-2xl">
                Home loan EMI
              </h2>
              <div className="mt-4">
                <EmiCalculator price={p.price} />
              </div>
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
          id="contact"
          aria-label="Contact about this property"
          className="scroll-mt-36 lg:sticky lg:top-36 lg:self-start"
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
          <div className="mt-4 flex items-center justify-between gap-3 px-1 text-sm text-ink-muted">
            <span>
              {p.views > 0 ? `${p.views.toLocaleString('en-IN')} views` : 'Recently listed'}
            </span>
            {!p.isDemo && <ReportListing propertyId={p.id} />}
          </div>
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
