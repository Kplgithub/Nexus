import Link from 'next/link';
import type { Faq } from '@nexus/shared';
import { ChevronDown, ChevronRight } from './icons';

export function JsonLd({ data }: { data: object | object[] }) {
  // JSON.stringify output is escaped for "<" so content can never close the script tag.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

export function Breadcrumbs({ items }: { items: { name: string; href: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1 text-ink-muted">
        {items.map((it, i) => {
          const last = i === items.length - 1;
          return (
            <li key={it.href} className="flex items-center gap-1">
              {last ? (
                <span aria-current="page" className="text-ink-soft">
                  {it.name}
                </span>
              ) : (
                <>
                  <Link href={it.href} className="hover:text-brand hover:underline">
                    {it.name}
                  </Link>
                  <ChevronRight size={14} />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  action,
  as: Tag = 'h2',
  id,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  action?: React.ReactNode;
  as?: 'h1' | 'h2';
  id?: string;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <Tag
          id={id}
          className="mt-2 text-3xl font-bold text-ink sm:text-[2.125rem] sm:leading-tight"
        >
          {title}
        </Tag>
        {intro && <p className="mt-3 text-[1.0625rem] leading-relaxed text-ink-soft">{intro}</p>}
      </div>
      {action}
    </div>
  );
}

export function FaqList({ faqs }: { faqs: Faq[] }) {
  if (!faqs.length) return null;
  return (
    <div className="space-y-3">
      {faqs.map((f, i) => (
        <details
          key={f.id}
          className="group rounded-2xl border border-line bg-white transition-shadow open:border-brand-100 open:shadow-[var(--shadow-card)]"
        >
          <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 text-left font-semibold text-ink [&::-webkit-details-marker]:hidden">
            <span className="tabular grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-xs font-bold text-brand group-open:bg-brand group-open:text-white">
              {String(i + 1).padStart(2, '0')}
            </span>
            <h3 className="flex-1 text-base group-hover:text-brand">{f.question}</h3>
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-line text-brand transition-transform group-open:rotate-180 group-open:border-brand">
              <ChevronDown size={16} />
            </span>
          </summary>
          <div className="pb-5 pl-[4.25rem] pr-5 leading-relaxed text-ink-soft">{f.answer}</div>
        </details>
      ))}
    </div>
  );
}

export function faqJsonLd(faqs: Faq[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-dashed border-line-strong bg-surface px-6 py-14 text-center">
      <h2 className="text-xl font-semibold text-ink">{title}</h2>
      {children && <div className="mx-auto mt-2 max-w-md text-ink-soft">{children}</div>}
      {action && <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>}
    </div>
  );
}

export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (p: number) => string;
}) {
  if (totalPages <= 1) return null;
  const pages = new Set(
    [1, totalPages, page - 1, page, page + 1].filter((p) => p >= 1 && p <= totalPages),
  );
  const list = [...pages].sort((a, b) => a - b);
  return (
    <nav aria-label="Pagination" className="mt-10 flex justify-center">
      <ul className="flex flex-wrap items-center gap-1.5">
        {page > 1 && (
          <li>
            <Link className="btn btn-outline btn-sm" href={hrefFor(page - 1)} rel="prev">
              Previous
            </Link>
          </li>
        )}
        {list.map((p, i) => (
          <li key={p} className="flex items-center gap-1.5">
            {i > 0 && p - list[i - 1]! > 1 && <span className="px-1 text-ink-muted">…</span>}
            <Link
              href={hrefFor(p)}
              aria-current={p === page ? 'page' : undefined}
              className={`btn btn-sm min-w-10 ${p === page ? 'btn-primary' : 'btn-outline'}`}
            >
              {p}
            </Link>
          </li>
        ))}
        {page < totalPages && (
          <li>
            <Link className="btn btn-outline btn-sm" href={hrefFor(page + 1)} rel="next">
              Next
            </Link>
          </li>
        )}
      </ul>
    </nav>
  );
}

export function DemoBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-md bg-warn-50 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-warn ring-1 ring-warn/30 ${className}`}
    >
      Demo listing
    </span>
  );
}
