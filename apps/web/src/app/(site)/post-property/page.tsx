import type { Metadata } from 'next';
import Link from 'next/link';
import { LISTING_LIMITS } from '@nexus/shared';
import { pageMetadata } from '@/lib/seo';
import { JaipurFacade } from '@/components/art/JaipurFacade';
import { PostPropertyCta } from '@/components/session/PostPropertyCta';
import { BadgeCheckIcon, BriefcaseIcon, CraneIcon, HomeIcon } from '@/components/icons';

export const metadata: Metadata = pageMetadata({
  title: 'Post Property Free — Sell or Rent Out Your Property',
  description:
    'Owners, agents and builders can list property for sale or rent on NEXUS Estate for free. Every listing is reviewed before it goes live.',
  path: '/post-property',
});

const ROLES = [
  {
    role: 'individual',
    Icon: HomeIcon,
    title: 'Owner',
    points: [
      `Up to ${LISTING_LIMITS.individual} active listings`,
      'Your number stays hidden unless you choose to show it',
      'Enquiries arrive in your dashboard and by email',
    ],
  },
  {
    role: 'agent',
    Icon: BriefcaseIcon,
    title: 'Agent',
    points: [
      `Up to ${LISTING_LIMITS.agent} active listings`,
      'Agency name and RERA number on every listing',
      'One inbox for leads across all your listings',
    ],
  },
  {
    role: 'builder',
    Icon: CraneIcon,
    title: 'Builder',
    points: [
      `Up to ${LISTING_LIMITS.builder} active listings`,
      'Project name, RERA ID and possession date shown to buyers',
      'New-booking and under-construction listings supported',
    ],
  },
] as const;

const STEPS = [
  ['Create your account', 'Choose owner, agent or builder and verify your mobile number.'],
  ['Add the property', 'Sale or rent, price, area, photos and the details buyers ask about.'],
  ['We review it', 'Our team checks the details and photos before the listing goes live.'],
  ['Receive enquiries', 'Interested buyers and tenants contact you directly.'],
] as const;

export default function PostPropertyPage() {
  return (
    <div>
      <section className="relative isolate overflow-hidden bg-brand-900 text-white">
        <JaipurFacade
          className="absolute inset-x-0 bottom-0 -z-10 h-full w-full text-accent"
          opacity={0.18}
        />
        <div className="container-page grid gap-10 py-16 sm:py-24 lg:grid-cols-[1.3fr_1fr] lg:items-end">
          <div>
            <h1 className="text-[2.6rem] leading-[1.05] sm:text-[3.6rem]">
              Sell or rent out your property, free.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/75">
              List from your own dashboard, track who is interested, and mark it sold or rented when
              you’re done. No listing fee.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <PostPropertyCta className="btn btn-accent h-12 px-6" />
              <Link
                href="/login?next=%2Fdashboard%2Flistings%2Fnew"
                className="text-sm font-semibold text-white/80 hover:text-white"
              >
                I already have an account
              </Link>
            </div>
          </div>
          <p className="flex items-start gap-3 rounded-2xl bg-white/[0.06] p-5 text-sm leading-relaxed text-white/75 ring-1 ring-white/10">
            <BadgeCheckIcon size={22} className="shrink-0 text-accent" />
            Every listing is checked by the NEXUS Estate team before it is published. Listings with
            misleading prices, photos or details are not approved.
          </p>
        </div>
      </section>

      <section className="container-page py-20" aria-labelledby="roles-heading">
        <h2 id="roles-heading" className="text-[2rem] leading-tight sm:text-[2.4rem]">
          One account, set up for how you work
        </h2>
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {ROLES.map(({ role, Icon, title, points }) => (
            <li key={role} className="flex flex-col rounded-2xl border border-line p-7">
              <Icon size={28} className="text-brand" />
              <h3 className="mt-5 text-xl font-semibold">{title}</h3>
              <ul className="mt-4 flex-1 space-y-2.5 text-ink-soft">
                {points.map((pt) => (
                  <li key={pt} className="flex gap-2">
                    <span aria-hidden className="mt-2.5 size-1.5 shrink-0 rounded-full bg-accent" />
                    {pt}
                  </li>
                ))}
              </ul>
              <PostPropertyCta role={role} className="btn btn-outline mt-7" />
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-surface py-20" aria-labelledby="how-heading">
        <div className="container-page">
          <h2 id="how-heading" className="text-[2rem] leading-tight sm:text-[2.4rem]">
            How posting works
          </h2>
          <ol className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="border-t-2 border-brand pt-5">
                <p className="tabular font-display text-3xl text-brand">{i + 1}</p>
                <h3 className="mt-2 text-lg font-semibold">{title}</h3>
                <p className="mt-1.5 text-ink-soft">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
