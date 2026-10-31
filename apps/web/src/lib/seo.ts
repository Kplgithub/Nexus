import type { Metadata } from 'next';
import {
  PROPERTY_TYPE_LABELS,
  formatINR,
  formatINRShort,
  type PropertyCard,
  type PublicBlogPost,
  type PublicProperty,
  type SiteSettings,
} from '@nexus/shared';
import { SITE_NOINDEX, SITE_URL, absoluteUrl } from './site';

type MetaInput = {
  title: string;
  description: string;
  path: string;
  /** Set false for thin/filtered pages: they are crawled (follow) but not indexed. */
  index?: boolean;
  image?: string;
  type?: 'website' | 'article';
};

export function pageMetadata({
  title,
  description,
  path,
  index = true,
  image,
  type = 'website',
}: MetaInput): Metadata {
  const url = absoluteUrl(path);
  const ogImage = image
    ? image.startsWith('http')
      ? image
      : absoluteUrl(image)
    : absoluteUrl('/brand/og-default.png');
  return {
    title,
    description,
    alternates: { canonical: url },
    robots: SITE_NOINDEX || !index ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: 'NEXUS Estate',
      locale: 'en_IN',
      type,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
  };
}

export function propertyHeadline(p: Pick<PublicProperty, 'title' | 'locality' | 'city'>) {
  return `${p.title} in ${p.locality.name}, ${p.city.name}`;
}

export function propertyDescription(p: PublicProperty | PropertyCard): string {
  const parts = [
    PROPERTY_TYPE_LABELS[p.propertyType],
    p.bedrooms ? `${p.bedrooms} BHK` : null,
    `for ${p.listingType === 'rent' ? 'rent' : 'sale'} in ${p.locality.name}, ${p.city.name}`,
    p.listingType === 'rent'
      ? `at ${formatINR(p.price)} per month`
      : `priced at ${formatINRShort(p.price)}`,
  ].filter(Boolean);
  return `${parts.join(' ')}. View photos, details and enquire with NEXUS Estate.`;
}

/* ---------------- JSON-LD builders (only genuine data, no ratings/reviews) ---------------- */

export function organizationJsonLd(s: SiteSettings, cities: { name: string }[] = []) {
  const sameAs = Object.values(s.social).filter(Boolean);
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateAgent',
    '@id': `${SITE_URL}/#organization`,
    name: s.businessName,
    url: SITE_URL,
    logo: absoluteUrl('/brand/nexus-logo.png'),
    image: absoluteUrl('/brand/og-default.png'),
    telephone: s.phone,
    ...(s.email ? { email: s.email } : {}),
    ...(s.showAddress && s.address.line1
      ? {
          address: {
            '@type': 'PostalAddress',
            streetAddress: [s.address.line1, s.address.line2].filter(Boolean).join(', '),
            addressLocality: s.address.city,
            addressRegion: s.address.state,
            postalCode: s.address.pincode || undefined,
            addressCountry: 'IN',
          },
        }
      : {}),
    ...(cities.length
      ? { areaServed: cities.map((c) => ({ '@type': 'City', name: c.name })) }
      : {}),
    ...(sameAs.length ? { sameAs } : {}),
  };
}

export function websiteJsonLd(s: SiteSettings) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE_URL}/#website`,
    name: s.businessName,
    url: SITE_URL,
    publisher: { '@id': `${SITE_URL}/#organization` },
    inLanguage: 'en-IN',
  };
}

export function breadcrumbJsonLd(items: { name: string; href: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: absoluteUrl(it.href),
    })),
  };
}

/** schema.org RealEstateListing with a lease offer. Not emitted for demo listings. */
export function listingJsonLd(p: PublicProperty) {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: p.title,
    description: p.seoDescription ?? propertyDescription(p),
    url: absoluteUrl(`/properties/${p.slug}`),
    ...(p.publishedAt ? { datePosted: p.publishedAt } : {}),
    image: p.images.slice(0, 6).map((i) => (i.url.startsWith('http') ? i.url : absoluteUrl(i.url))),
    offers: {
      '@type': 'Offer',
      price: p.price,
      priceCurrency: 'INR',
      businessFunction:
        p.listingType === 'rent'
          ? 'http://purl.org/goodrelations/v1#LeaseOut'
          : 'http://purl.org/goodrelations/v1#Sell',
      availability:
        p.status !== 'published' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
      ...(p.availableFrom ? { availabilityStarts: p.availableFrom } : {}),
      ...(p.poster.type === 'nexus' ? { seller: { '@id': `${SITE_URL}/#organization` } } : {}),
    },
    contentLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: `${p.locality.name}, ${p.city.name}`,
        addressRegion: p.state,
        addressCountry: 'IN',
      },
    },
  };
}

const abs = (u: string) => (u.startsWith('http') ? u : absoluteUrl(u));

/** schema.org BlogPosting for an article page. */
export function blogPostingJsonLd(p: PublicBlogPost) {
  const url = absoluteUrl(`/blog/${p.slug}`);
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': `${url}#article`,
    mainEntityOfPage: url,
    headline: p.title.slice(0, 110),
    description: p.seoDescription || p.excerpt || undefined,
    ...(p.coverImage ? { image: [abs(p.coverImage.url)] } : {}),
    ...(p.publishedAt ? { datePublished: p.publishedAt } : {}),
    dateModified: p.updatedAt,
    author: p.authorName
      ? { '@type': 'Person', name: p.authorName }
      : { '@id': `${SITE_URL}/#organization` },
    publisher: { '@id': `${SITE_URL}/#organization` },
    articleSection: p.category,
    ...(p.tags.length ? { keywords: p.tags.join(', ') } : {}),
    inLanguage: 'en-IN',
  };
}
