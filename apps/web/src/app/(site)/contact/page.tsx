import type { Metadata } from 'next';
import { formatIndianPhone, whatsappLink } from '@nexus/shared';
import { getSettings } from '@/lib/api';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { EnquiryForm } from '@/components/forms/EnquiryForm';
import { Breadcrumbs, JsonLd } from '@/components/ui';
import { ClockIcon, MailIcon, MapPinIcon, PhoneIcon, WhatsAppIcon } from '@/components/icons';

export const metadata: Metadata = pageMetadata({
  title: 'Contact NEXUS Estate',
  description:
    'Call, WhatsApp or send a message to the NEXUS Estate team about renting or listing a property in Jaipur.',
  path: '/contact',
});

type Props = { searchParams: Promise<{ topic?: string }> };

export default async function ContactPage({ searchParams }: Props) {
  const settings = await getSettings();
  const { topic } = await searchParams;
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'Contact', href: '/contact' },
  ];
  const defaultMessage =
    topic === 'industrial'
      ? 'I am looking for an industrial property (warehouse / shed). Requirement: '
      : undefined;

  return (
    <div className="container-page pt-8">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} />
      <div className="mt-6 grid gap-12 lg:grid-cols-2">
        <div>
          <h1 className="text-3xl font-bold sm:text-4xl">Talk to our team</h1>
          <p className="mt-3 text-lg text-ink-soft">
            Looking for a home or business space, or want to list a property? Reach us directly or
            leave a message and we’ll call you back.
          </p>
          <ul className="mt-8 space-y-5">
            <li className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand">
                <PhoneIcon />
              </span>
              <div>
                <p className="text-sm text-ink-muted">Call</p>
                <a
                  href={`tel:${settings.phone}`}
                  className="text-lg font-semibold hover:text-brand"
                >
                  {formatIndianPhone(settings.phone)}
                </a>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand">
                <WhatsAppIcon />
              </span>
              <div>
                <p className="text-sm text-ink-muted">WhatsApp</p>
                <a
                  href={whatsappLink(settings.whatsapp, 'Hello NEXUS Estate, I have a question.')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-lg font-semibold hover:text-brand"
                >
                  Message us on WhatsApp
                </a>
              </div>
            </li>
            {settings.email && (
              <li className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand">
                  <MailIcon />
                </span>
                <div>
                  <p className="text-sm text-ink-muted">Email</p>
                  <a
                    href={`mailto:${settings.email}`}
                    className="text-lg font-semibold hover:text-brand"
                  >
                    {settings.email}
                  </a>
                </div>
              </li>
            )}
            {settings.showAddress && settings.address.line1 && (
              <li className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand">
                  <MapPinIcon />
                </span>
                <div>
                  <p className="text-sm text-ink-muted">Office</p>
                  <address className="not-italic font-medium">
                    {[
                      settings.address.line1,
                      settings.address.line2,
                      `${settings.address.city} ${settings.address.pincode}`.trim(),
                      settings.address.state,
                    ]
                      .filter(Boolean)
                      .join(', ')}
                  </address>
                </div>
              </li>
            )}
            {settings.businessHours && (
              <li className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-50 text-brand">
                  <ClockIcon />
                </span>
                <div>
                  <p className="text-sm text-ink-muted">Hours</p>
                  <p className="font-medium">{settings.businessHours}</p>
                </div>
              </li>
            )}
          </ul>
        </div>
        <div className="card p-6 sm:p-8">
          <h2 className="text-xl font-semibold">Send us a message</h2>
          <div className="mt-5">
            <EnquiryForm
              type="general"
              sourcePage="/contact"
              submitLabel="Send message"
              defaultMessage={defaultMessage}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
