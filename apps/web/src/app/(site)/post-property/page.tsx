import type { Metadata } from 'next';
import { DEFAULT_PLAN, LISTING_LIMITS } from '@nexus/shared';
import { pageMetadata } from '@/lib/seo';
import { JaipurFacade } from '@/components/art/JaipurFacade';
import { PostPropertyCta } from '@/components/session/PostPropertyCta';
import { StartPostingCard } from '@/components/session/StartPostingCard';
import {
  BadgeCheckIcon,
  BriefcaseIcon,
  CraneIcon,
  HomeIcon,
  InboxIcon,
  ShieldIcon,
  UserIcon,
} from '@/components/icons';

export const metadata: Metadata = pageMetadata({
  title: 'Post Property — Sell or Rent Out Your Property',
  description:
    'Owners, agents and builders can list property for sale or rent on NEXUS Estate. Agents and builders get 5 free listings. Every listing is reviewed before it goes live.',
  path: '/post-property',
});

const ROLES = [
  {
    role: 'individual',
    Icon: HomeIcon,
    title: 'Owner',
    points: [
      'Fill in your property, then take Premium to publish',
      'Your number stays hidden unless you choose to show it',
      'Enquiries arrive in your dashboard as leads',
    ],
  },
  {
    role: 'agent',
    Icon: BriefcaseIcon,
    title: 'Agent',
    points: [
      `${LISTING_LIMITS.agent} free listings, ${DEFAULT_PLAN.listingLimit} live at a time with Premium`,
      'Agency name and RERA number on every listing',
      'One inbox for leads across all your listings',
    ],
  },
  {
    role: 'builder',
    Icon: CraneIcon,
    title: 'Builder',
    points: [
      `${LISTING_LIMITS.builder} free listings, ${DEFAULT_PLAN.listingLimit} live at a time with Premium`,
      'Project name, RERA ID and possession date shown to buyers',
      'New-booking and under-construction listings supported',
    ],
  },
] as const;

const STEPS = [
  [
    'Create your account',
    'Choose owner, agent or builder and verify your mobile number.',
    UserIcon,
  ],
  [
    'Add the property',
    'Sale or rent, price, area, photos and the details buyers ask about.',
    HomeIcon,
  ],
  [
    'We review it',
    'Our team checks the details and photos before the listing goes live.',
    ShieldIcon,
  ],
  ['Receive enquiries', 'Buyers and tenants call or WhatsApp you directly.', InboxIcon],
] as const;

export default function PostPropertyPage() {
  return (
    <div>
      <section className="relative isolate overflow-hidden bg-[radial-gradient(circle_at_80%_30%,rgba(249,115,22,.3),transparent_40%),linear-gradient(120deg,#0b1a3f_0%,#1e3a8a_60%,#1e40af_100%)] text-white">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-[radial-gradient(rgba(255,255,255,.07)_1px,transparent_1px)] [background-size:18px_18px]"
        />
        <JaipurFacade
          className="absolute inset-x-0 bottom-0 -z-10 h-full w-full text-accent"
          opacity={0.1}
        />
        <div className="container-page grid gap-10 py-10 sm:py-16 lg:grid-cols-[1.2fr_1fr] lg:items-center lg:gap-14">
          <div>
            <span className="inline-flex rounded-full bg-accent/20 px-3 py-1.5 text-xs font-bold text-orange-300">
              Jaipur’s checked property listings
            </span>
            <h1 className="mt-4 text-[2.4rem] leading-[1.05] sm:text-[3.5rem]">
              Sell or rent out your property, <i className="text-orange-300">faster.</i>
            </h1>
            <p className="mt-4 max-w-xl text-base text-white/80 sm:text-lg">
              Reach serious buyers and tenants across Jaipur. Track views and leads from one
              dashboard.
            </p>
            <ul className="mt-7 grid max-w-xl grid-cols-3 gap-2.5 sm:gap-4">
              {[
                [`${LISTING_LIMITS.agent}`, 'free listings for agents'],
                ['100%', 'listings checked by our team'],
                ['Jaipur', 'buyers and tenants'],
              ].map(([a, b]) => (
                <li
                  key={b}
                  className="rounded-2xl border border-white/15 bg-white/[0.07] px-3 py-3 sm:px-4"
                >
                  <p className="font-display text-[1.4rem] leading-tight sm:text-[1.7rem]">{a}</p>
                  <p className="text-[11.5px] leading-snug text-white/70 sm:text-[12.5px]">{b}</p>
                </li>
              ))}
            </ul>
            <p className="mt-6 flex max-w-xl items-start gap-2.5 text-sm text-white/70">
              <BadgeCheckIcon size={20} className="shrink-0 text-orange-300" />
              Listings with misleading prices, photos or details are not approved.
            </p>
          </div>
          <StartPostingCard />
        </div>
      </section>

      <section className="container-page py-20" aria-labelledby="roles-heading">
        <h2 id="roles-heading" className="text-[2rem] leading-tight sm:text-[2.4rem]">
          One account, set up for how you work
        </h2>
        <ul className="mt-10 grid gap-5 md:grid-cols-3">
          {ROLES.map(({ role, Icon, title, points }) => (
            <li
              key={role}
              className="flex flex-col rounded-[18px] border border-[#e6eaf2] bg-white p-7 transition-shadow hover:shadow-lg"
            >
              <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-brand-50 text-brand">
                <Icon size={24} />
              </span>
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

      <section className="bg-[#f4f6fb] py-16 sm:py-20" aria-labelledby="how-heading">
        <div className="container-page">
          <h2 id="how-heading" className="text-[2rem] leading-tight sm:text-[2.4rem]">
            Post in 4 simple steps
          </h2>
          <ol className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(([title, text, Icon], i) => (
              <li
                key={title}
                className="relative rounded-[18px] border border-[#e6eaf2] bg-white p-5 sm:p-6"
              >
                <span
                  aria-hidden
                  className="tabular absolute right-5 top-3 font-display text-[2.8rem] text-[#e9edf5]"
                >
                  {i + 1}
                </span>
                <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-brand-50 text-brand">
                  <Icon size={22} />
                </span>
                <h3 className="mt-4 text-lg font-semibold">{title}</h3>
                <p className="mt-1 text-[15px] text-ink-soft">{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}
