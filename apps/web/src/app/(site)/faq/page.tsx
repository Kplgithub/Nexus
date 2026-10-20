import type { Metadata } from 'next';
import Link from 'next/link';
import type { Faq } from '@nexus/shared';
import { getFaqs } from '@/lib/api';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { Breadcrumbs, EmptyState, FaqList, JsonLd, faqJsonLd } from '@/components/ui';

export const revalidate = 300;

export const metadata: Metadata = pageMetadata({
  title: 'Frequently Asked Questions',
  description:
    'Answers to common questions about renting a home or business space, and listing your property with NEXUS Estate.',
  path: '/faq',
});

const GROUPS: { key: Faq['category']; title: string }[] = [
  { key: 'general', title: 'General' },
  { key: 'tenants', title: 'For tenants' },
  { key: 'commercial', title: 'Commercial spaces' },
  { key: 'owners', title: 'For property owners' },
];

export default async function FaqPage() {
  const faqs = await getFaqs();
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'FAQs', href: '/faq' },
  ];
  return (
    <div className="container-page pt-8">
      <JsonLd data={[breadcrumbJsonLd(crumbs), ...(faqs.length ? [faqJsonLd(faqs)] : [])]} />
      <Breadcrumbs items={crumbs} />
      <div className="mx-auto mt-8 max-w-3xl">
        <h1 className="text-4xl font-bold">Frequently asked questions</h1>
        {faqs.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="FAQs are on their way"
              action={
                <Link href="/contact" className="btn btn-primary">
                  Ask us directly
                </Link>
              }
            />
          </div>
        ) : (
          GROUPS.map((g) => {
            const items = faqs.filter((f) => f.category === g.key);
            if (!items.length) return null;
            return (
              <section key={g.key} className="mt-10" aria-labelledby={`faq-${g.key}`}>
                <h2 id={`faq-${g.key}`} className="mb-4 text-2xl font-bold">
                  {g.title}
                </h2>
                <FaqList faqs={items} />
              </section>
            );
          })
        )}
        <p className="mt-12 text-ink-soft">
          Still have a question?{' '}
          <Link href="/contact" className="font-semibold text-brand hover:underline">
            Contact our team
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
