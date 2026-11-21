'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { CITY_COOKIE, HOME_CITY_COOKIE } from '@/lib/city-cookie';
import { CheckIcon, ChevronDown, MapPinIcon } from '../icons';

type CityLite = { name: string; slug: string; state: string };

function readCookie(name: string) {
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]!) : '';
}

const noSubscribe = () => () => {};

/** Saves the visitor's city and reloads the home page for it (a full load, not the router cache). */
function saveCity(slug: string) {
  document.cookie = `${CITY_COOKIE}=${slug}; path=/; max-age=${365 * 24 * 3600}; samesite=lax`;
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- the router would reuse its cached home page
  window.location.href = '/';
}

/**
 * The visitor's city. Cities come from the admin panel, so new cities appear here
 * automatically. Picking one saves it in a cookie and opens that city's home page;
 * until then the home page goes by the visitor's location (see src/proxy.ts).
 */
export function CityMenu({ cities }: { cities: CityLite[] }) {
  const [open, setOpen] = useState(false);
  // The cookie only exists in the browser; the server render shows the plain menu.
  const current = useSyncExternalStore(
    noSubscribe,
    () => readCookie(CITY_COOKIE) || readCookie(HOME_CITY_COOKIE),
    () => '',
  );
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

  const shown = cities.find((c) => c.slug === current);
  const choose = (slug: string) => {
    setOpen(false);
    saveCity(slug);
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={shown ? `City: ${shown.name}. Change city` : 'Choose your city'}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex max-w-[9.5rem] items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-sm font-medium text-ink-soft hover:border-brand"
      >
        <MapPinIcon size={15} className="shrink-0 text-brand" />
        <span className="truncate">{shown?.name ?? 'Cities'}</span>
        <ChevronDown size={14} className="shrink-0" />
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-line bg-white p-2 shadow-lift">
          <p className="px-3 pb-1 pt-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Choose your city
          </p>
          <ul className="max-h-80 overflow-y-auto">
            {cities.map((c) => (
              <li key={c.slug}>
                <button
                  type="button"
                  onClick={() => choose(c.slug)}
                  aria-current={c.slug === current ? 'true' : undefined}
                  className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-surface"
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="flex items-center gap-2 text-xs text-ink-muted">
                    {c.state}
                    {c.slug === current && <CheckIcon size={14} className="text-brand" />}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
