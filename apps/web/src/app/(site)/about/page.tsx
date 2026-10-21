import type { Metadata } from 'next';
import Link from 'next/link';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { Breadcrumbs, JsonLd } from '@/components/ui';

export const metadata: Metadata = pageMetadata({
  title: 'About NEXUS Estate',
  description:
    'NEXUS Estate is a property marketplace for buying, selling and renting homes and commercial spaces. Every listing is reviewed before it goes live.',
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
        <h1 className="text-[2.6rem] leading-tight">
          A property marketplace that checks before it publishes
        </h1>
        <div className="prose-nexus mt-6 text-lg">
          <p>
            NEXUS Estate brings together people looking to buy or rent with owners, agents and
            builders who have property to offer — homes and commercial spaces, for sale and for
            rent.
          </p>
          <h2>What you can do here</h2>
          <ul>
            <li>
              <strong>Buy</strong> — flats, independent houses, villas, plots, offices and shops,
              with price per square foot, possession status and RERA details where they apply.
            </li>
            <li>
              <strong>Rent</strong> — homes and business spaces with rent, deposit, maintenance and
              lock-in terms shown upfront.
            </li>
            <li>
              <strong>Post property</strong> — owners, agents and builders list from their own
              dashboard and receive enquiries directly.
            </li>
            <li>
              <strong>Talk to us</strong> — our team can help you shortlist options or answer
              questions about a listing.
            </li>
          </ul>
          <h2>How listings are checked</h2>
          <p>
            Every listing posted by an owner, agent or builder is reviewed by our team before it
            goes live, and edits to a live listing are reviewed again. Phone numbers are shown only
            to signed-in visitors, and only when the poster chooses to share them.
          </p>
          <p>
            We are starting in Jaipur and will add more cities over time. If you don’t see what you
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
