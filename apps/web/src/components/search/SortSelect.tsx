'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import { SORT_LABELS, SORT_OPTIONS, type SortOption } from '@nexus/shared';

export function SortSelect({ value }: { value: SortOption }) {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const [pending, start] = useTransition();

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort" className="text-sm text-ink-muted">
        Sort
      </label>
      <select
        id="sort"
        className="field w-auto min-w-44 text-sm"
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          if (e.target.value === 'newest') next.delete('sort');
          else next.set('sort', e.target.value);
          next.delete('page');
          const qs = next.toString();
          start(() => router.push(`${path}${qs ? `?${qs}` : ''}`, { scroll: false }));
        }}
      >
        {SORT_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {SORT_LABELS[s]}
          </option>
        ))}
      </select>
    </div>
  );
}
