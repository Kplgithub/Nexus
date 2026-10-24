'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import type { ListingType } from '@nexus/shared';
import { parseSmartQuery, type SmartLocality } from '@/lib/smart-search';
import { SearchIcon, SparklesIcon } from '../icons';

/**
 * Compact AI search for browse pages (dark header). Uses the page's deal as the
 * default, so "2 bhk under 25k" on /rent stays a rental search.
 */
export function SmartSearchBar({
  city,
  localities,
  deal,
  commercial = false,
}: {
  city?: string;
  localities: SmartLocality[];
  deal?: ListingType;
  commercial?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState('');
  const query = (t: string) => {
    let q = t;
    if (deal === 'rent' && !/\b(buy|sale|purchase|rent|lease)\b/i.test(q)) q += ' for rent';
    if (commercial && !/\b(office|shop|showroom|co-?working|warehouse|godown)\b/i.test(q))
      q += ' commercial';
    return q;
  };
  const smart = useMemo(
    () => (text.trim() ? parseSmartQuery(query(text), { city, localities }) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [text, city, localities, deal, commercial],
  );

  return (
    <form
      role="search"
      aria-label="AI property search"
      onSubmit={(e) => {
        e.preventDefault();
        if (smart) start(() => router.push(smart.path));
      }}
      className="w-full max-w-2xl"
    >
      <div className="nx-ai-ring">
        <div className="flex items-center gap-2 rounded-[1rem] bg-white py-1 pl-3 pr-1">
          <SparklesIcon size={18} className="shrink-0 text-accent-700" />
          <label htmlFor="smart-bar" className="sr-only">
            Describe what you are looking for
          </label>
          <input
            id="smart-bar"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              deal === 'rent'
                ? 'Ask AI: 2 BHK furnished under 25k near Malviya Nagar'
                : 'Ask AI: 3 BHK villa under 1.5 cr in Vaishali Nagar'
            }
            autoComplete="off"
            className="h-10 min-w-0 flex-1 bg-transparent text-[0.95rem] text-ink outline-none placeholder:text-ink-muted"
          />
          <button
            type="submit"
            aria-label="Search"
            disabled={pending || !smart}
            className="btn btn-primary h-10 min-h-0 shrink-0 rounded-xl px-4"
          >
            <SearchIcon size={16} />
          </button>
        </div>
      </div>
      <div className="mt-2 flex min-h-6 flex-wrap items-center gap-1.5 text-xs" aria-live="polite">
        {smart ? (
          <>
            <span className="font-semibold text-accent">AI understood:</span>
            {smart.understood.map((u) => (
              <span
                key={u}
                className="nx-fade-in rounded-full bg-white/10 px-2.5 py-0.5 text-white ring-1 ring-white/20"
              >
                {u}
              </span>
            ))}
          </>
        ) : (
          <span className="text-white/55">
            Type it the way you would say it. We turn it into filters.
          </span>
        )}
      </div>
    </form>
  );
}
