'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import type { ListingType } from '@nexus/shared';
import { smartSearchHref } from '@/lib/smart-search-types';
import { SearchIcon, SparklesIcon } from '../icons';

const EXAMPLES: Record<ListingType | 'any', string[]> = {
  rent: [
    '2bhk furnished vaishali nagar 15000 tak',
    'girls PG with food near WTP',
    'Mansarovar me 1bhk 8000 tak',
  ],
  sale: [
    '3 BHK flat Jagatpura under 60 lakh',
    'JDA plot Ajmer Road 40 lakh',
    'villa in Vaishali Nagar under 1.5 cr',
  ],
  any: [
    '2bhk furnished vaishali nagar 15000 tak',
    'JDA plot Ajmer Road 40 lakh',
    'office for rent in C-Scheme',
  ],
};

/**
 * AI search box for browse pages (dark header). The text goes to /search, where
 * our server works out what was meant and ranks the best matches.
 */
export function SmartSearchBar({
  deal,
  locality,
  commercial = false,
  initialText = '',
}: {
  deal?: ListingType;
  /** On a locality page, searches stay in that locality unless the text names another place. */
  locality?: string;
  commercial?: boolean;
  initialText?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [text, setText] = useState(initialText);
  const hint = (t: string) =>
    commercial && !/\b(office|shop|showroom|co-?working|warehouse|godown|commercial)\b/i.test(t)
      ? `${t} commercial`
      : t;
  const go = (t: string) => {
    const q = t.trim();
    if (q) start(() => router.push(smartSearchHref({ q: hint(q), deal, locality })));
  };

  return (
    <form
      role="search"
      aria-label="Property search"
      action="/search"
      onSubmit={(e) => {
        e.preventDefault();
        go(text);
      }}
      className="w-full max-w-2xl"
    >
      {deal && <input type="hidden" name="deal" value={deal} />}
      {locality && <input type="hidden" name="locality" value={locality} />}
      <div className="nx-ai-ring">
        <div className="flex items-center gap-2 rounded-[1rem] bg-white py-1 pl-3 pr-1">
          <SparklesIcon size={18} className="shrink-0 text-accent-700" />
          <label htmlFor="smart-bar" className="sr-only">
            Describe what you are looking for
          </label>
          <input
            id="smart-bar"
            name="q"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={200}
            placeholder={
              deal === 'sale'
                ? 'Try: 3 BHK flat in Jagatpura under 60 lakh'
                : 'Try: 2bhk furnished vaishali nagar 15000 tak'
            }
            autoComplete="off"
            enterKeyHint="search"
            className="h-10 min-w-0 flex-1 bg-transparent text-[0.95rem] text-ink outline-none placeholder:text-ink-muted"
          />
          <button
            type="submit"
            disabled={pending || !text.trim()}
            className="btn btn-accent h-10 min-h-0 shrink-0 rounded-xl px-3 sm:px-4"
          >
            {pending ? (
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
            ) : (
              <SearchIcon size={16} />
            )}
            <span className="hidden sm:inline">{pending ? 'Searching…' : 'Search'}</span>
            <span className="sr-only sm:hidden">Search</span>
          </button>
        </div>
      </div>
      {!initialText && (
        <div className="mt-2 flex min-h-6 flex-wrap items-center gap-1.5 text-xs text-white/60">
          <span>Try:</span>
          {EXAMPLES[deal ?? 'any'].map((ex) => (
            <Link
              key={ex}
              href={smartSearchHref({ q: hint(ex), deal, locality })}
              className="rounded-full border border-dashed border-white/30 px-2.5 py-0.5 text-white/85 hover:border-white hover:text-white"
            >
              {ex}
            </Link>
          ))}
        </div>
      )}
    </form>
  );
}
