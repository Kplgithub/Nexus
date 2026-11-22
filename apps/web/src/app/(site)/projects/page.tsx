import type { Metadata } from 'next';
import Link from 'next/link';
import {
  PROJECT_STAGES,
  PROJECT_STAGE_LABELS,
  PROJECT_UNIT_TYPES,
  PROPERTY_TYPE_LABELS,
  projectSearchSchema,
  type ProjectCard,
} from '@nexus/shared';
import { getLocations, getSettings, searchProjects } from '@/lib/api';
import { sectionsOn } from '@/lib/sections';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { ProjectGrid } from '@/components/project/ProjectCard';
import { Breadcrumbs, EmptyState, JsonLd, Pagination } from '@/components/ui';
import { SALE_STEPS, priceLabel } from '@/components/search/options';

type Raw = Record<string, string | string[] | undefined>;
type Props = { searchParams: Promise<Raw> };

const KEYS = ['city', 'locality', 'stage', 'unitType', 'bedrooms', 'maxPrice', 'page'] as const;

function parse(raw: Raw) {
  const input: Record<string, string> = {};
  for (const k of KEYS) {
    const v = raw[k];
    const s = Array.isArray(v) ? v[0] : v;
    if (s) input[k] = s;
  }
  return projectSearchSchema.parse(input);
}

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const raw = await searchParams;
  const filtered = KEYS.some((k) => raw[k]);
  return pageMetadata({
    title: 'New projects in Jaipur',
    description:
      'New launch and under-construction projects in Jaipur: flats, villas and plots with RERA details, floor plans, price lists and possession dates.',
    path: '/projects',
    index: !filtered,
  });
}

export default async function ProjectsPage({ searchParams }: Props) {
  const raw = await searchParams;
  const s = parse(raw);
  const [cities, settings] = await Promise.all([getLocations(), getSettings()]);
  const on = sectionsOn(settings);
  const city = cities.find((c) => c.slug === (s.city ?? 'jaipur')) ?? cities[0];
  const qs = new URLSearchParams();
  for (const k of KEYS) {
    const v = s[k as keyof typeof s];
    if (v !== undefined && k !== 'page') qs.set(k, String(v));
  }
  const api = new URLSearchParams(qs);
  api.set('page', String(s.page));
  api.set('limit', '12');

  let items: ProjectCard[] = [];
  let total = 0;
  let totalPages = 1;
  let failed = false;
  try {
    const res = await searchProjects(api.toString());
    items = res.items;
    total = res.meta.total;
    totalPages = res.meta.totalPages;
  } catch {
    failed = true;
  }
  const hrefFor = (p: number) => {
    const n = new URLSearchParams(qs);
    if (p > 1) n.set('page', String(p));
    return `/projects${n.size ? `?${n}` : ''}`;
  };
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'New projects', href: '/projects' },
  ];
  const locality = city?.localities.find((l) => l.slug === s.locality);

  return (
    <div className="container-page pt-8">
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <Breadcrumbs items={crumbs} />
      <header className="mb-8 mt-5">
        <h1 className="text-[2rem] leading-tight sm:text-[2.6rem]">
          New projects in {locality ? `${locality.name}, ` : ''}
          {city?.name ?? 'Jaipur'}
        </h1>
        <p className="mt-3 max-w-3xl text-lg leading-relaxed text-ink-soft">
          Compare builders’ projects by price, unit type and possession date. Every project is
          checked by our team before it goes live. Always confirm RERA registration on the Rajasthan
          RERA website before booking.
        </p>
      </header>

      <form
        action="/projects"
        method="get"
        aria-label="Filter projects"
        className="mb-10 grid gap-3 rounded-2xl border border-line bg-white p-4 sm:grid-cols-2 lg:grid-cols-6"
      >
        {city && <input type="hidden" name="city" value={city.slug} />}
        <Select name="locality" label="Locality" value={s.locality}>
          <option value="">Any locality</option>
          {[...(city?.localities ?? [])]
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.name}
              </option>
            ))}
        </Select>
        <Select name="stage" label="Stage" value={s.stage}>
          <option value="">Any stage</option>
          {PROJECT_STAGES.map((x) => (
            <option key={x} value={x}>
              {PROJECT_STAGE_LABELS[x]}
            </option>
          ))}
        </Select>
        <Select name="unitType" label="Type" value={s.unitType}>
          <option value="">Any type</option>
          {PROJECT_UNIT_TYPES.map((x) => (
            <option key={x} value={x}>
              {PROPERTY_TYPE_LABELS[x]}
            </option>
          ))}
        </Select>
        <Select name="bedrooms" label="BHK" value={s.bedrooms}>
          <option value="">Any BHK</option>
          {[1, 2, 3, 4, 5].map((b) => (
            <option key={b} value={b}>
              {b} BHK
            </option>
          ))}
        </Select>
        <Select name="maxPrice" label="Budget up to" value={s.maxPrice}>
          <option value="">Any budget</option>
          {SALE_STEPS.map((r) => (
            <option key={r} value={r}>
              {priceLabel(r)}
            </option>
          ))}
        </Select>
        <div className="flex items-end gap-2">
          <button type="submit" className="btn btn-primary flex-1">
            Show projects
          </button>
          {qs.size > (city ? 1 : 0) && (
            <Link href="/projects" className="btn btn-outline">
              Clear
            </Link>
          )}
        </div>
      </form>

      <h2 className="mb-5 text-base font-medium text-ink-soft">
        {failed
          ? 'Projects unavailable'
          : total
            ? `${total} ${total === 1 ? 'project' : 'projects'}`
            : 'No matching projects'}
      </h2>
      {failed ? (
        <EmptyState title="We couldn’t load projects right now">
          Please refresh in a moment.
        </EmptyState>
      ) : items.length ? (
        <>
          <ProjectGrid items={items} priorityCount={2} />
          <Pagination page={s.page} totalPages={totalPages} hrefFor={hrefFor} />
        </>
      ) : (
        <EmptyState
          title="No projects match these filters"
          action={
            <>
              <Link href="/projects" className="btn btn-outline">
                Clear filters
              </Link>
              {on.buy && (
                <Link href="/buy" className="btn btn-primary">
                  See resale properties
                </Link>
              )}
            </>
          }
        >
          New projects are added as builders list them. Try another locality or budget.
        </EmptyState>
      )}

      <section className="mt-20 rounded-2xl bg-brand-900 p-8 text-white sm:p-10">
        <h2 className="text-2xl text-white">Are you a builder?</h2>
        <p className="mt-2 max-w-2xl text-white/80">
          List your project with floor plans, price list and brochure. Enquiries come straight to
          you.
        </p>
        <Link
          href="/signup?role=builder"
          className="btn mt-5 bg-white text-brand-900 hover:bg-white/90"
        >
          List a project
        </Link>
      </section>
    </div>
  );
}

function Select({
  name,
  label,
  value,
  children,
}: {
  name: string;
  label: string;
  value: string | number | undefined;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={`p-${name}`} className="field-label">
        {label}
      </label>
      <select id={`p-${name}`} name={name} className="field" defaultValue={value ?? ''}>
        {children}
      </select>
    </div>
  );
}
