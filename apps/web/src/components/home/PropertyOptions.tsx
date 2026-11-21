'use client';

import Link from 'next/link';
import { useState } from 'react';

type Group = { title: string; links: [string, string][] };

/** City-level search links, grouped like a portal's "property options" block. No locality pages. */
function groups(city: string, name: string): Record<'buy' | 'rent', Group[]> {
  const b = `/buy?city=${city}`;
  const r = `/rent?city=${city}`;
  return {
    buy: [
      {
        title: `Flats in ${name}`,
        links: [
          [`${b}&propertyType=apartment&bedrooms=1`, `1 BHK flats for sale in ${name}`],
          [`${b}&propertyType=apartment&bedrooms=2`, `2 BHK flats for sale in ${name}`],
          [`${b}&propertyType=apartment&bedrooms=3`, `3 BHK flats for sale in ${name}`],
          [`${b}&propertyType=apartment&bedrooms=4`, `4 BHK flats for sale in ${name}`],
          [`${b}&propertyType=apartment&possession=ready`, `Ready to move flats in ${name}`],
        ],
      },
      {
        title: `Houses & villas in ${name}`,
        links: [
          [`${b}&propertyType=independent-house`, `Independent houses for sale`],
          [`${b}&propertyType=villa`, `Villas for sale in ${name}`],
          [`${b}&propertyType=builder-floor`, `Builder floors for sale`],
          [`${b}&postedBy=owner`, `Owner properties in ${name}`],
          ['/projects', `New projects in ${name}`],
        ],
      },
      {
        title: `Plots & commercial`,
        links: [
          [`${b}&propertyType=plot`, `Plots for sale in ${name}`],
          [`${b}&propertyType=plot&plotApproval=jda`, `JDA approved plots`],
          [`${b}&propertyType=office`, `Offices for sale in ${name}`],
          [`${b}&propertyType=shop`, `Shops for sale in ${name}`],
        ],
      },
      {
        title: `By budget`,
        links: [
          [`${b}&maxPrice=3000000`, `Property under ₹30 Lakh`],
          [`${b}&maxPrice=5000000`, `Property under ₹50 Lakh`],
          [`${b}&maxPrice=10000000`, `Property under ₹1 Crore`],
          [`${b}&minPrice=10000000`, `Property above ₹1 Crore`],
        ],
      },
    ],
    rent: [
      {
        title: `Flats for rent in ${name}`,
        links: [
          [`${r}&propertyType=apartment&bedrooms=1`, `1 BHK flats for rent in ${name}`],
          [`${r}&propertyType=apartment&bedrooms=2`, `2 BHK flats for rent in ${name}`],
          [`${r}&propertyType=apartment&bedrooms=3`, `3 BHK flats for rent in ${name}`],
          [`${r}&furnishing=furnished`, `Furnished flats for rent`],
          [`${r}&propertyType=studio`, `Studio apartments for rent`],
        ],
      },
      {
        title: `PG & houses`,
        links: [
          [`${r}&propertyType=pg&pgGender=male`, `PG for boys in ${name}`],
          [`${r}&propertyType=pg&pgGender=female`, `PG for girls in ${name}`],
          [`${r}&propertyType=independent-house`, `Houses for rent in ${name}`],
          [`${r}&propertyType=villa`, `Villas for rent in ${name}`],
        ],
      },
      {
        title: `Commercial for rent`,
        links: [
          [`${r}&propertyType=office`, `Offices for rent in ${name}`],
          [`${r}&propertyType=shop`, `Shops for rent in ${name}`],
          [`/commercial`, `All commercial property`],
        ],
      },
      {
        title: `By budget`,
        links: [
          [`${r}&maxPrice=10000`, `Rent under ₹10,000`],
          [`${r}&maxPrice=15000`, `Rent under ₹15,000`],
          [`${r}&maxPrice=25000`, `Rent under ₹25,000`],
          [`${r}&minPrice=25000`, `Rent above ₹25,000`],
        ],
      },
    ],
  };
}

export function PropertyOptions({ city, cityName }: { city: string; cityName: string }) {
  const [tab, setTab] = useState<'buy' | 'rent'>('buy');
  const all = groups(city, cityName);
  return (
    <section className="py-8 sm:py-10" aria-labelledby="options-heading">
      <div className="container-page">
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-accent-700">
          <span className="h-px w-6 bg-current" aria-hidden />
          Quick links
        </p>
        <h2
          id="options-heading"
          className="mt-1 text-[1.6rem] leading-tight text-brand-900 sm:text-[2rem]"
        >
          Popular searches in {cityName}
        </h2>
        <div
          role="tablist"
          aria-label="Buy or rent"
          className="mt-5 flex gap-6 border-b border-line"
        >
          {(['buy', 'rent'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={`-mb-px border-b-2 pb-2 text-sm font-semibold ${
                tab === t
                  ? 'border-brand text-brand'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {t === 'buy' ? 'Buy' : 'Rent'}
            </button>
          ))}
        </div>
        {(['buy', 'rent'] as const).map((t) => (
          <div
            key={t}
            role="tabpanel"
            hidden={tab !== t}
            className="mt-5 grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {all[t].map((g) => (
              <div key={g.title}>
                <h3 className="text-sm font-semibold">{g.title}</h3>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {g.links.map(([href, label]) => (
                    <li key={href}>
                      <Link href={href} className="text-ink-soft hover:text-brand hover:underline">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
