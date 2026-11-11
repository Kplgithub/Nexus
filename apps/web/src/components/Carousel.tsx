'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from './icons';

/**
 * A horizontal, snap-scrolling row of cards with arrow buttons on desktop and
 * swipe on touch. Children are the slides; each one gets a fixed width.
 */
export function Carousel({
  label,
  children,
  slideClass = 'w-[85%] sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.84rem)] xl:w-[calc(25%-0.94rem)]',
}: {
  label: string;
  children: React.ReactNode[];
  slideClass?: string;
}) {
  const track = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState({ start: true, end: false });

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdge({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    update();
    const el = track.current;
    el?.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el?.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [update]);

  const go = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: 'smooth' });
  };

  const arrow =
    'absolute top-[38%] z-10 hidden size-11 -translate-y-1/2 place-items-center rounded-full border border-line bg-white text-ink shadow-lg transition hover:bg-brand hover:text-white disabled:pointer-events-none disabled:opacity-0 md:grid';

  return (
    <div className="relative" role="region" aria-roledescription="carousel" aria-label={label}>
      <ul
        ref={track}
        className="nx-scroll-x -mx-4 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-smooth scroll-px-4 px-4 pb-3 sm:mx-0 sm:scroll-px-0 sm:px-0"
      >
        {children.map((child, i) => (
          <li key={i} className={`shrink-0 snap-start ${slideClass}`}>
            {child}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => go(-1)}
        disabled={edge.start}
        aria-label="Previous"
        className={`${arrow} -left-5`}
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        onClick={() => go(1)}
        disabled={edge.end}
        aria-label="Next"
        className={`${arrow} -right-5`}
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
