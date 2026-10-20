import type { Metadata } from 'next';
import Link from 'next/link';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { Breadcrumbs, JsonLd } from '@/components/ui';

export const metadata: Metadata = pageMetadata({
  title: 'About NEXUS Estate',
  description:
    'NEXUS Estate helps people and businesses in Jaipur find residential and commercial rentals, and helps owners find the right tenants.',
  path: '/about',
});

export default function AboutPage() {
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'About', href: '/about' },
  ];
  return (
    <div className="container-page pt-8">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} />
      <div className="mx-auto mt-8 max-w-3xl">
        <p className="eyebrow">About us</p>
        <h1 className="mt-2 text-4xl font-bold">Helping people find the right space</h1>
        <div className="prose-nexus mt-6 text-lg">
          <p>
            NEXUS Estate is a rental and real estate consultancy focused on residential and
            commercial property. We help tenants find homes and business spaces that fit how they
            live and work, and we help owners present their properties clearly and find suitable
            tenants.
          </p>
          <h2>What we do</h2>
          <ul>
            <li>
              <strong>Residential rentals</strong> — flats, builder floors, independent houses and
              villas, furnished or unfurnished.
            </li>
            <li>
              <strong>Commercial rentals</strong> — offices, retail shops, showrooms, co-working and
              commercial buildings.
            </li>
            <li>
              <strong>Property discovery</strong> — shortlisting options against your budget,
              locality and must-haves.
            </li>
            <li>
              <strong>Rental consultancy</strong> — guidance on rent, deposits, lock-in periods and
              what to check before you sign.
            </li>
          </ul>
          <h2>How we work</h2>
          <p>
            We review every listing before it is published and keep owners’ personal details
            private. Enquiries come to our team first, so you always have one point of contact for
            visits, questions and negotiation.
          </p>
          <p>
            We are starting in Jaipur and growing locality by locality. If you don’t see what you
            need, tell us — new properties are added regularly.
          </p>
        </div>
        <div className="mt-10 flex flex-wrap gap-3">
          <Link href="/properties" className="btn btn-primary">
            Explore properties
          </Link>
          <Link href="/contact" className="btn btn-outline">
            Talk to our team
          </Link>
        </div>
      </div>
    </div>
  );
}
