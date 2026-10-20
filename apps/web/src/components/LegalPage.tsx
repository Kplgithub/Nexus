import { breadcrumbJsonLd } from '@/lib/seo';
import { Breadcrumbs, JsonLd } from './ui';

export function LegalPage({
  title,
  path,
  updated,
  children,
}: {
  title: string;
  path: string;
  updated: string;
  children: React.ReactNode;
}) {
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: title, href: path },
  ];
  return (
    <div className="container-page pt-8">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} />
      <article className="mx-auto mt-8 max-w-3xl">
        <h1 className="text-4xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-ink-muted">Last updated: {updated}</p>
        <div className="prose-nexus mt-8">{children}</div>
      </article>
    </div>
  );
}
