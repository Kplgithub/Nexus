'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { ChevronDown, MapPinIcon } from '../icons';

type CityLite = { name: string; slug: string; state: string };

/**
 * Shows where NEXUS operates. Cities come from the admin panel, so new cities
 * appear here automatically as the business expands.
 */
export function CityMenu({ cities }: { cities: CityLite[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  const first = cities[0]!;
  if (cities.length === 1) {
    return (
      <Link
        href={`/buy/${first.slug}`}
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink-soft hover:border-brand hover:text-brand"
      >
        <MapPinIcon size={15} className="text-brand" /> {first.name}
      </Link>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink-soft hover:border-brand"
      >
        <MapPinIcon size={15} className="text-brand" /> Cities <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-2 w-64 rounded-xl border border-line bg-white p-2 shadow-lift">
          <ul className="max-h-80 overflow-y-auto">
            {cities.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/buy/${c.slug}`}
                  onClick={() => setOpen(false)}
                  className="flex items-baseline justify-between rounded-lg px-3 py-2 text-sm hover:bg-surface"
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="text-xs text-ink-muted">{c.state}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
