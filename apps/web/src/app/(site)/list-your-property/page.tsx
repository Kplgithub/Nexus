import type { Metadata } from 'next';
import { formatIndianPhone, whatsappLink } from '@nexus/shared';
import { getLocations, getSettings } from '@/lib/api';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { ListPropertyForm } from '@/components/forms/ListPropertyForm';
import { Breadcrumbs, JsonLd } from '@/components/ui';
import { CheckIcon, PhoneIcon, WhatsAppIcon } from '@/components/icons';

export const metadata: Metadata = pageMetadata({
  title: 'List Your Property for Rent in Jaipur',
  description:
    'Own a flat, house, office or shop in Jaipur? Share the details with NEXUS Estate and our team will help you find suitable tenants.',
  path: '/list-your-property',
});

export default async function ListYourPropertyPage() {
  const [cities, settings] = await Promise.all([getLocations(), getSettings()]);
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'List your property', href: '/list-your-property' },
  ];
  return (
    <div className="container-page pt-8">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} />
      <div className="mt-6 grid gap-12 lg:grid-cols-[1fr_22rem]">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">List your property with NEXUS</h1>
          <p className="mt-3 max-w-2xl text-lg text-ink-soft">
            Tell us about your home or commercial space. We’ll call you to understand the details
            before anything goes live.
          </p>
          <div className="card mt-8 p-6 sm:p-8">
            <ListPropertyForm cities={cities} />
          </div>
        </div>
        <aside className="space-y-6 lg:pt-20">
          <div className="rounded-[var(--radius-card)] bg-accent-50 p-6">
            <h2 className="text-lg font-semibold">What happens next</h2>
            <ul className="mt-4 space-y-3 text-sm text-ink-soft">
              {[
                'We call you to confirm the property details and your expectations.',
                'We agree what will be shown publicly — your phone number and exact unit address stay private.',
                'Once you approve, the listing goes live and we handle enquiries and visits.',
              ].map((t) => (
                <li key={t} className="flex gap-2">
                  <CheckIcon size={18} className="mt-0.5 shrink-0 text-accent-700" /> {t}
                </li>
              ))}
            </ul>
          </div>
          <div className="card p-6">
            <h2 className="text-lg font-semibold">Prefer to talk?</h2>
            <div className="mt-4 space-y-2">
              <a href={`tel:${settings.phone}`} className="btn btn-outline w-full">
                <PhoneIcon size={18} /> {formatIndianPhone(settings.phone)}
              </a>
              <a
                href={whatsappLink(
                  settings.whatsapp,
                  'Hello NEXUS Estate, I want to list my property for rent.',
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline w-full"
              >
                <WhatsAppIcon size={18} /> WhatsApp
              </a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
