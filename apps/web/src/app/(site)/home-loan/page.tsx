import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { emi, formatINR, whatsappLink, type Faq } from '@nexus/shared';
import { getBlogPosts, getSettings, searchProperties } from '@/lib/api';
import { breadcrumbJsonLd, pageMetadata } from '@/lib/seo';
import { Breadcrumbs, FaqList, JsonLd, SectionHeading, faqJsonLd } from '@/components/ui';
import { PropertyCard, PropertyGridSkeleton } from '@/components/property/PropertyCard';
import { BlogCard } from '@/components/blog/BlogCard';
import { LoanForm } from '@/components/loan/LoanForm';
import { LoanCalculators } from '@/components/loan/LoanCalculators';
import { hrefOn, sectionsOn } from '@/lib/sections';
import { GuideTabs, RatesTable, ScrollToFormButton } from '@/components/loan/LoanBits';
import {
  ArrowRight,
  CalculatorIcon,
  CheckIcon,
  ListIcon,
  PhoneIcon,
  SendIcon,
  TrendingUpIcon,
  WhatsAppIcon,
} from '@/components/icons';

export const revalidate = 60;

const TITLE = 'Home Loan in Jaipur: EMI Calculator, Eligibility and Bank Rates';
const DESCRIPTION =
  'Plan your home loan in Jaipur. Check EMI and eligibility, compare starting rates from banks, and get a free call back from the NEXUS Estate loan desk.';

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return pageMetadata({
    title: TITLE,
    description: DESCRIPTION,
    path: '/home-loan',
    index: s.homeLoan.enabled,
  });
}

const FAQS: Faq[] = [
  {
    q: 'How much home loan can I get on my salary?',
    a: 'Most banks keep all your EMIs together within about half of your monthly take-home pay. Use the eligibility calculator above for a quick estimate. Our loan desk then confirms it with the bank, because your credit score and existing loans also count.',
  },
  {
    q: 'Can I get a home loan on a JDA patta property in Jaipur?',
    a: 'Yes. Banks usually prefer properties with a JDA (or other approved authority) patta and an approved map. Keep the sale deed, patta and map ready. For a society patta or an unapproved colony, fewer banks lend, so tell our desk early.',
  },
  {
    q: 'Does NEXUS Estate charge anything for loan help?',
    a: 'No. Our loan help is free for you. NEXUS Estate is not a bank or lender. We pass your request to a lender you are comfortable with and help you with the paperwork.',
  },
  {
    q: 'How much down payment do I need?',
    a: 'Under current rules, banks can lend up to 90% of the property value for loans up to ₹30 Lakh, up to 80% for ₹30–75 Lakh, and up to 75% above that. You pay the rest, plus stamp duty and registration, yourself.',
  },
  {
    q: 'Can I get a loan to buy a plot in Jaipur?',
    a: 'Yes, many banks give plot loans for approved residential plots, often together with a construction loan. The amount and rate differ from a regular home loan, and most banks expect construction to start within a few years.',
  },
  {
    q: 'Fixed or floating rate, which is better?',
    a: 'Most home loans in India are floating, linked to the RBI repo rate, so your EMI or tenure changes when rates move. Floating loans also have no prepayment charges for individuals. Fixed rates are usually higher and are fixed only for a few years.',
  },
  {
    q: 'How long does a home loan sanction take?',
    a: 'With complete documents, banks usually sanction in 7 to 15 working days. Property checks and legal verification take a little more time before the money is released.',
  },
].map(
  (f, i): Faq => ({
    id: `hl-${i}`,
    question: f.q,
    answer: f.a,
    category: 'buyers',
    sortOrder: i,
    showOnHome: false,
    published: true,
  }),
);

const GUIDES = [
  {
    key: 'docs',
    label: 'Documents needed',
    title: 'Documents to keep ready',
    intro:
      'Most banks in Jaipur ask for these. Self-attested copies kept ready can save you a week.',
    cols: [
      [
        'Salaried',
        [
          'PAN card and Aadhaar',
          'Last 3 months salary slips',
          '6 months bank statement',
          'Form 16 or last 2 years ITR',
        ],
      ],
      [
        'Self-employed or business',
        [
          'PAN card and Aadhaar',
          'Last 3 years ITR with computation',
          '12 months bank statement',
          'GST or business registration proof',
        ],
      ],
      [
        'Property papers',
        [
          'Sale deed or allotment letter',
          'JDA patta and approved map',
          'NOC from the society or builder',
          'Latest property tax receipt',
        ],
      ],
    ],
  },
  {
    key: 'eligible',
    label: 'Who is eligible',
    title: 'Who can get a home loan',
    intro: 'Each bank has its own rules, but these are the usual checks.',
    cols: [
      [
        'You',
        [
          'Age 21 to 65 by the end of the loan',
          'Steady income for at least 2 years',
          'Credit score of 700 or more gets better rates',
        ],
      ],
      [
        'The property',
        [
          'Clear title and approved map',
          'JDA, RERA or other authority approval',
          'Ready, under construction or a plot with construction',
        ],
      ],
    ],
  },
  {
    key: 'tax',
    label: 'Tax benefits',
    title: 'Tax benefits on a home loan',
    intro:
      'These apply under the old tax regime. The new regime does not allow these deductions for a home you live in, so check with your CA.',
    cols: [
      [
        'Principal',
        ['Up to ₹1.5 Lakh a year under Section 80C', 'Includes stamp duty and registration paid'],
      ],
      [
        'Interest',
        [
          'Up to ₹2 Lakh a year under Section 24(b) for a self-occupied home',
          'Joint borrowers who co-own can each claim',
        ],
      ],
    ],
  },
  {
    key: 'stamp',
    label: 'Stamp duty and registration',
    title: 'Stamp duty and registration in Jaipur',
    intro:
      'Banks do not fund stamp duty and registration, so keep this money aside along with the down payment. Rates are set by the Rajasthan government and can change.',
    cols: [
      [
        'Plan for',
        [
          'Stamp duty on the DLC rate or sale price, whichever is higher',
          'Lower stamp duty for women buyers',
          'Registration fee and surcharges on top',
        ],
      ],
    ],
  },
  {
    key: 'plot',
    label: 'Loan for plots',
    title: 'Buying a plot with a loan',
    intro: 'Plot loans work a little differently from home loans.',
    cols: [
      [
        'Keep in mind',
        [
          'Usually up to 70–80% of the plot value',
          'Plot must be residential and approved (JDA or other authority)',
          'Construction often has to start within 2–5 years',
          'Tax benefits start only after the house is built',
        ],
      ],
    ],
  },
] satisfies Parameters<typeof GuideTabs>[0]['guides'];

const BUYERS: { tag: string; title: string; text: string; tone: string; big?: boolean }[] = [
  {
    tag: 'First home?',
    title: 'Up to 90% of the price',
    text: 'For loans up to ₹30 Lakh, banks can fund up to 90% of the home’s value. You pay the rest.',
    tone: 'from-brand-50',
    big: true,
  },
  {
    tag: 'Buying land',
    title: 'Plot loans for approved plots',
    text: 'Plot plus construction loans in Jaipur.',
    tone: 'from-accent-50',
  },
  {
    tag: 'Two incomes',
    title: 'Joint home loan',
    text: 'Add your spouse or a parent to get a bigger loan.',
    tone: 'from-success-50',
  },
  {
    tag: 'Own business',
    title: 'Self-employed and shop owners',
    text: 'Loans based on ITR, GST returns or bank statements.',
    tone: 'from-brand-50',
  },
  {
    tag: 'Under construction',
    title: 'Pay only interest till possession',
    text: 'Easier on your pocket while the home is being built.',
    tone: 'from-accent-50',
  },
  {
    tag: 'Family abroad?',
    title: 'Loans for NRIs',
    text: 'Buy a home in Jaipur while you work outside India.',
    tone: 'from-success-50',
  },
  {
    tag: 'Paying too much?',
    title: 'Move your loan to a lower rate',
    text: 'Balance transfer, with a top-up if you need it.',
    tone: 'from-brand-50',
  },
];

const STEPS = [
  ['Share your details', 'Fill the 30 second form or call our loan desk.'],
  ['Get a call back', 'We check your eligibility and suggest lenders that fit.'],
  ['Compare offers', 'See rate, fees and EMI side by side before you pick.'],
  ['Sanction and disbursal', 'We help with documents till the bank releases the money.'],
];

export default async function HomeLoanPage() {
  const settings = await getSettings();
  if (!settings.homeLoan.enabled) notFound();
  // Budget links and the for-sale rail need the Buy section (Admin → Settings → Site sections).
  const on = sectionsOn(settings);
  const { lenders: all, ratesCheckedAt, exampleRate } = settings.homeLoan;
  const lenders = all.filter((l) => l.active).sort((a, b) => a.rateFrom - b.rateFrom);
  const lowest = lenders[0]?.rateFrom;
  const crumbs = [
    { name: 'Home', href: '/' },
    { name: 'Home loan', href: '/home-loan' },
  ];

  return (
    <>
      <JsonLd data={[breadcrumbJsonLd(crumbs), faqJsonLd(FAQS)]} />

      {/* Hero */}
      <section className="relative isolate overflow-hidden bg-brand-900 text-white">
        <div className="nx-aurora" aria-hidden />
        <div className="nx-loan-grid" aria-hidden />
        <div className="container-page relative grid gap-x-12 gap-y-7 pb-16 pt-6 lg:grid-cols-[1.1fr_0.9fr] lg:pb-20 lg:pt-8">
          <div className="lg:self-end">
            <Breadcrumbs items={crumbs} dark />
            <span className="mt-6 inline-flex items-center gap-2 rounded-full border border-accent/45 bg-accent/15 px-3.5 py-1 text-[13px] font-semibold text-accent-100">
              ₹ Home loan help · Jaipur
            </span>
            <h1 className="mt-4 text-[2.15rem] leading-[1.08] sm:text-5xl">
              Your Jaipur home, <span className="text-accent-100">with the right loan</span> behind
              it
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-white/80 sm:text-[1.0625rem]">
              Tell us about your home and income once. Our loan desk compares offers from banks and
              housing finance companies and calls you back with options that fit. Free for you.
            </p>
          </div>
          <div
            id="loan-form"
            className="scroll-mt-24 self-center rounded-3xl bg-white p-5 text-ink shadow-[0_30px_60px_-20px_rgb(0_0_0/0.5)] sm:p-7 lg:col-start-2 lg:row-span-2 lg:row-start-1"
          >
            <LoanForm sourcePage="/home-loan" />
          </div>
          <div className="lg:col-start-1 lg:self-start">
            <ul className="grid max-w-xl gap-3 sm:grid-cols-2">
              {[
                'Compare offers from many lenders',
                'Help with JDA patta and paperwork',
                'Salaried and self-employed both',
                'No charge for our help',
              ].map((t) => (
                <li key={t} className="flex items-start gap-2.5 text-[15px] text-white/90">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/10 text-green-300">
                    <CheckIcon size={14} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
            <dl className="mt-7 grid grid-cols-3 gap-4 border-t border-white/15 pt-6 sm:flex sm:gap-x-8">
              {[
                ...(lowest ? [[`${lowest.toFixed(2)}%*`, 'Starting rate'] as const] : []),
                ['30 yrs', 'Longest tenure'] as const,
                ['90%', 'Max funding'] as const,
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="sr-only">{l}</dt>
                  <dd className="font-display text-xl sm:text-2xl">{v}</dd>
                  <dd className="text-xs text-white/65 sm:text-[13px]">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Tool tiles */}
      <div className="container-page relative z-10 -mt-8">
        <ul className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5">
          {(
            [
              ['#calculators', CalculatorIcon, 'EMI calculator', 'Monthly payment', false],
              ['#calculators', CheckIcon, 'Eligibility', 'How much you can get', true],
              ...(lenders.length
                ? [
                    [
                      '#rates',
                      TrendingUpIcon,
                      'Compare rates',
                      'Banks side by side',
                      false,
                    ] as const,
                  ]
                : []),
              ['#calculators', SendIcon, 'Balance transfer', 'Move to a lower rate', true],
              ['#guide', ListIcon, 'Documents', 'What to keep ready', false],
            ] as const
          ).map(([href, Icon, t, sub, orange]) => (
            <li key={t} className="w-[12.5rem] shrink-0 snap-start sm:w-auto">
              <a
                href={href}
                className="flex h-full items-center gap-3 rounded-2xl border border-line bg-white p-3.5 shadow-[0_8px_24px_-14px_rgb(15_23_42/0.25)] transition hover:border-brand-100 sm:p-4"
              >
                <span
                  className={`grid size-10 shrink-0 place-items-center rounded-xl ${orange ? 'bg-accent-50 text-accent-700' : 'bg-brand-50 text-brand'}`}
                >
                  <Icon size={20} />
                </span>
                <span>
                  <b className="block text-sm sm:text-[15px]">{t}</b>
                  <span className="text-xs text-ink-muted">{sub}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className="container-page">
        <section id="calculators" className="scroll-mt-24 pt-14 sm:pt-16">
          <SectionHeading
            eyebrow="Free tools"
            title="Plan your loan with free calculators"
            intro="Pick a tool, move the sliders and see the numbers change instantly."
          />
          <LoanCalculators lenders={lenders} exampleRate={exampleRate} />
        </section>

        {lenders.length > 0 && (
          <section id="rates" className="scroll-mt-24 pt-14 sm:pt-16">
            <SectionHeading
              eyebrow="Rates"
              title="Compare home loan rates"
              intro="Starting rates published by banks and housing finance companies. Pick one and our desk will check if you qualify."
            />
            <RatesTable lenders={lenders} checkedAt={ratesCheckedAt} />
          </section>
        )}

        <section className="pt-14 sm:pt-16">
          <SectionHeading
            eyebrow="For every buyer"
            title="A loan for every kind of buyer"
            intro="Tell our desk your case. We know which lenders say yes to it."
          />
          <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:grid-rows-[repeat(2,minmax(9.5rem,auto))]">
            {BUYERS.map((b) => (
              <li
                key={b.title}
                className={`relative overflow-hidden rounded-2xl border border-line bg-gradient-to-br ${b.tone} to-white p-4 sm:p-5 ${b.big ? 'col-span-2 lg:col-span-1 lg:row-span-2' : ''}`}
              >
                <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted sm:text-xs">
                  {b.tag}
                </p>
                <h3 className={`mt-1 ${b.big ? 'text-3xl text-brand-900' : 'text-lg sm:text-xl'}`}>
                  {b.title}
                </h3>
                <p className="mt-1.5 text-sm text-ink-soft">{b.text}</p>
                {b.big && (
                  <span
                    aria-hidden
                    className="pointer-events-none absolute -bottom-10 -right-2 font-display text-[10rem] leading-none text-brand/10"
                  >
                    ₹
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        {on.buy && (
          <section className="pt-14 sm:pt-16">
            <div className="grid items-center gap-6 rounded-3xl border border-accent-100 bg-gradient-to-br from-accent-50 to-white p-5 sm:p-7 lg:grid-cols-[0.9fr_1.6fr]">
              <div>
                <h2 className="text-2xl sm:text-[1.75rem]">Homes in Jaipur within your budget</h2>
                <p className="mt-2 text-sm text-ink-soft">
                  Your budget is the loan plus your own down payment. Pick a range to see live
                  listings.
                </p>
              </div>
              <ul className="grid gap-2.5 sm:grid-cols-2">
                {(
                  [
                    [
                      'Flats up to ₹30 Lakh',
                      '/buy?city=jaipur&propertyType=apartment&maxPrice=3000000',
                    ],
                    [
                      'Flats ₹30 – 60 Lakh',
                      '/buy?city=jaipur&propertyType=apartment&minPrice=3000000&maxPrice=6000000',
                    ],
                    [
                      'Homes ₹60 Lakh – 1 Cr',
                      '/buy?city=jaipur&minPrice=6000000&maxPrice=10000000',
                    ],
                    ['Plots up to ₹50 Lakh', '/buy?city=jaipur&propertyType=plot&maxPrice=5000000'],
                  ] as const
                )
                  .filter(([, href]) => hrefOn(href, on))
                  .map(([l, href]) => (
                    <li key={href}>
                      <Link
                        href={href}
                        className="flex items-center justify-between gap-2 rounded-xl border border-line bg-white px-4 py-3.5 font-semibold transition hover:border-brand-100 hover:text-brand"
                      >
                        {l}
                        <ArrowRight size={18} className="text-brand" />
                      </Link>
                    </li>
                  ))}
              </ul>
            </div>
          </section>
        )}

        {on.buy && (
          <section className="pt-14 sm:pt-16">
            <SectionHeading
              eyebrow="For sale in Jaipur"
              title="Homes for sale, with EMI shown"
              intro={`EMI shown for 80% of the price over 20 years at ${exampleRate.toFixed(2)}%, as an example.`}
              action={
                <Link
                  href="/buy?city=jaipur"
                  className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
                >
                  See all <ArrowRight size={16} />
                </Link>
              }
            />
            <Suspense
              fallback={
                <PropertyGridSkeleton
                  count={4}
                  className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4"
                />
              }
            >
              <SaleRail rate={exampleRate} />
            </Suspense>
          </section>
        )}

        <section className="pt-14 sm:pt-16">
          <SectionHeading
            eyebrow="How it works"
            title="From enquiry to sanction, we stay with you"
          />
          <ol className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {STEPS.map(([t, d], i) => (
              <li key={t} className="rounded-2xl border border-line bg-white p-4 sm:p-5">
                <span className="grid size-9 place-items-center rounded-full bg-brand font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-3 text-base sm:text-lg">{t}</h3>
                <p className="mt-1 text-sm text-ink-soft">{d}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="guide" className="scroll-mt-24 pt-14 sm:pt-16">
          <SectionHeading
            eyebrow="Guide"
            title="Jaipur home loan guide"
            intro="The basics you need before you talk to a bank."
          />
          <GuideTabs guides={GUIDES} />
        </section>

        <section className="pt-14 sm:pt-16">
          <SectionHeading eyebrow="FAQs" title="Home loan questions, answered" />
          <FaqList faqs={FAQS} />
        </section>

        <Suspense fallback={null}>
          <LoanBlogs />
        </Suspense>

        <section className="mt-14 flex flex-col items-start justify-between gap-5 rounded-3xl bg-gradient-to-br from-brand-900 to-brand p-6 text-white sm:mt-16 sm:p-9 lg:flex-row lg:items-center">
          <div>
            <h2 className="text-2xl sm:text-3xl">Found your home? Let’s sort the loan.</h2>
            <p className="mt-2 text-white/75">
              Talk to the NEXUS Estate loan desk
              {settings.businessHours ? `, ${settings.businessHours}` : ''}.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <ScrollToFormButton className="btn btn-accent">
              <PhoneIcon size={18} /> Get a call back
            </ScrollToFormButton>
            <a
              href={whatsappLink(
                settings.whatsapp,
                'Hello NEXUS Estate, I need help with a home loan.',
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="btn bg-[#22c55e] text-white hover:bg-[#16a34a]"
            >
              <WhatsAppIcon size={18} /> WhatsApp us
            </a>
          </div>
        </section>

        <p className="mt-6 rounded-2xl bg-surface p-4 text-xs leading-relaxed text-ink-muted">
          Rates and figures on this page are estimates for planning only. NEXUS Estate is not a bank
          or lender and does not give loans. Loans are given by banks and housing finance companies
          under their own rules and approval. We share your details only with the lender you agree
          to.
        </p>
      </div>
    </>
  );
}

async function SaleRail({ rate }: { rate: number }) {
  const res = await searchProperties(
    'listingType=sale&category=residential&city=jaipur&sort=newest&limit=4',
  ).catch(() => null);
  const items = res?.items.filter((p) => p.price > 0) ?? [];
  if (!items.length)
    return (
      <p className="rounded-2xl border border-dashed border-line p-6 text-center text-ink-muted">
        New homes for sale will show here soon.{' '}
        <Link href="/buy?city=jaipur" className="font-semibold text-brand underline">
          Browse all homes
        </Link>
      </p>
    );
  return (
    <ul className="-mx-4 flex snap-x gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-4">
      {items.map((p, i) => (
        <li key={p.id} className="flex w-[82%] shrink-0 snap-start flex-col sm:w-auto">
          <PropertyCard p={p} index={i} />
          {p.price > 0 && (
            <p className="-mt-3 rounded-b-2xl border border-t-0 border-line bg-accent-50 px-4 pb-2.5 pt-5 text-sm">
              EMI from{' '}
              <b className="tabular text-accent-700">
                {formatINR(emi(Math.round(p.price * 0.8), rate, 20))}/mo
              </b>
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}

async function LoanBlogs() {
  const res = await getBlogPosts('limit=24').catch(() => null);
  const all = res?.items ?? [];
  const rx = /loan|emi|stamp|registration|patta|jda|budget|buy/i;
  const picked = [
    ...all.filter((p) => rx.test(p.title)),
    ...all.filter((p) => !rx.test(p.title)),
  ].slice(0, 3);
  if (!picked.length) return null;
  return (
    <section className="pt-14 sm:pt-16">
      <SectionHeading
        eyebrow="Blog"
        title="Read before you borrow"
        action={
          <Link
            href="/blog"
            className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
          >
            All blogs <ArrowRight size={16} />
          </Link>
        }
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {picked.map((p) => (
          <BlogCard key={p.id} post={p} />
        ))}
      </div>
    </section>
  );
}
