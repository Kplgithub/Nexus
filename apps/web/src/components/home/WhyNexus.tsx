import { BadgeCheckIcon, ChatIcon, ShieldIcon, SparklesIcon } from '../icons';

const POINTS = [
  {
    Icon: BadgeCheckIcon,
    title: 'Reviewed before it goes live',
    text: 'Every listing is checked by our team before visitors can see it.',
  },
  {
    Icon: ChatIcon,
    title: 'Talk directly',
    text: 'Call, WhatsApp or send an enquiry about any listing in one tap.',
  },
  {
    Icon: SparklesIcon,
    title: 'AI that saves time',
    text: 'Type what you want in plain words. We turn it into the right filters instantly.',
  },
  {
    Icon: ShieldIcon,
    title: 'We never sell your data',
    text: 'Your enquiry goes to the property you asked about, and owners’ numbers are never published.',
  },
];

/** Trust band: why people use NEXUS. Claims here must match how the site works. */
export function WhyNexus() {
  return (
    <section className="py-14 sm:py-16" aria-labelledby="why-heading">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="eyebrow">Why NEXUS Estate</p>
          <h2 id="why-heading" className="mt-1 text-[1.75rem] leading-tight sm:text-[2.15rem]">
            Property search, without the guesswork
          </h2>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {POINTS.map(({ Icon, title, text }, i) => (
            <li
              key={title}
              className="nx-rise nx-lift group relative overflow-hidden rounded-2xl border border-line bg-white p-6"
              style={{ '--i': i } as React.CSSProperties}
            >
              <span className="absolute -right-8 -top-8 size-24 rounded-full bg-accent-50 transition-transform duration-500 group-hover:scale-150" />
              <span className="relative grid size-12 place-items-center rounded-2xl bg-brand text-white shadow-lg shadow-brand/25">
                <Icon size={22} />
              </span>
              <h3 className="relative mt-5 text-lg font-semibold">{title}</h3>
              <p className="relative mt-2 text-sm leading-relaxed text-ink-soft">{text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
