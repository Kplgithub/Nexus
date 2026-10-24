import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from '../icons';

const u = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=900&h=1100&fit=crop&q=75&auto=format`;

/** Hand-picked searches as photo tiles, like the collections on big portals. */
export function Collections({ city }: { city?: string }) {
  const buy = city ? `/buy/${city}` : '/buy';
  const rent = city ? `/rent/${city}` : '/rent';
  const items = [
    {
      title: 'Ready to move',
      text: 'Homes you can shift into now',
      href: `${buy}?possession=ready`,
      img: u('1600596542815-ffad4c1539a9'),
      span: 'lg:col-span-2 lg:row-span-2',
    },
    {
      title: 'Owner properties',
      text: 'Talk to owners directly',
      href: `${buy}?postedBy=owner`,
      img: u('1583847268964-b28dc8f51f92'),
    },
    {
      title: 'Luxury villas',
      text: 'Gardens, space and privacy',
      href: `${buy}?propertyType=villa`,
      img: u('1613490493576-7fde63acd811'),
    },
    {
      title: 'Budget homes',
      text: 'Under ₹50 Lakh',
      href: `${buy}?maxPrice=5000000`,
      img: u('1545324418-cc1a3fa10c00'),
    },
    {
      title: 'Furnished rentals',
      text: 'Move in with a suitcase',
      href: `${rent}?furnishing=furnished`,
      img: u('1616594039964-ae9021a400a0'),
    },
  ];

  return (
    <section className="py-14 sm:py-16" aria-labelledby="collections-heading">
      <div className="container-page">
        <div className="mb-8 max-w-2xl">
          <p className="eyebrow">Handpicked collections</p>
          <h2
            id="collections-heading"
            className="mt-1 text-[1.75rem] leading-tight sm:text-[2.15rem]"
          >
            Start with what matters to you
          </h2>
        </div>
        <ul className="grid auto-rows-[13rem] grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {items.map((c, i) => (
            <li key={c.title} className={c.span ?? ''}>
              <Link
                href={c.href}
                className="nx-rise nx-shine group relative isolate flex h-full flex-col justify-end overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 p-4 text-white sm:p-5"
                style={{ '--i': i } as React.CSSProperties}
              >
                <Image
                  src={c.img}
                  alt=""
                  fill
                  sizes="(min-width: 1024px) 25vw, 50vw"
                  className="-z-10 object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.07]"
                />
                <span className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />
                <span
                  className={`font-display leading-tight ${i === 0 ? 'text-2xl sm:text-3xl' : 'text-lg sm:text-xl'}`}
                >
                  {c.title}
                </span>
                <span className="mt-1 flex items-center gap-1 text-sm text-white/80">
                  {c.text}
                  <ArrowRight
                    size={14}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
