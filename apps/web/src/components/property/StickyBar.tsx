'use client';

import { useEffect, useState } from 'react';

/**
 * A slim bar under the site header once the visitor scrolls past the price:
 * title, price, jump links to each section, and the contact button.
 */
export function StickyBar({
  title,
  price,
  sections,
  watchId,
}: {
  title: string;
  price: string;
  sections: { id: string; label: string }[];
  watchId: string;
}) {
  const [show, setShow] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const target = document.getElementById(watchId);
    if (!target) return;
    const onScroll = () => setShow(target.getBoundingClientRect().bottom < 72);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    const spy = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-140px 0px -60% 0px' },
    );
    for (const s of sections) {
      const el = document.getElementById(s.id);
      if (el) spy.observe(el);
    }
    return () => {
      window.removeEventListener('scroll', onScroll);
      spy.disconnect();
    };
  }, [watchId, sections]);

  return (
    <div
      aria-hidden={!show}
      className={`fixed inset-x-0 top-[72px] z-30 border-b border-line bg-white/95 shadow-sm backdrop-blur transition duration-300 ${show ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-3 opacity-0'}`}
    >
      <div className="container-page flex h-14 items-center gap-4">
        <div className="hidden min-w-0 md:block md:max-w-[16rem] lg:max-w-xs">
          <p className="truncate text-sm font-semibold text-ink">{title}</p>
          <p className="tabular text-sm font-bold text-brand-800">{price}</p>
        </div>
        <nav
          aria-label="Sections"
          className="nx-scroll-x flex min-w-0 flex-1 gap-1 overflow-x-auto"
        >
          {sections.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              tabIndex={show ? 0 : -1}
              className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium transition ${active === s.id ? 'bg-brand-50 text-brand-800' : 'text-ink-muted hover:text-ink'}`}
            >
              {s.label}
            </a>
          ))}
        </nav>
        <a href="#contact" tabIndex={show ? 0 : -1} className="btn btn-primary btn-sm shrink-0">
          Contact
        </a>
      </div>
    </div>
  );
}
