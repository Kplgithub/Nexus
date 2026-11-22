'use client';

import { saveCity } from '../layout/CityMenu';

/**
 * "I'm in Jaipur" on the coming-soon note: IP location can be wrong, so a visitor who is
 * actually in the city saves it (same cookie as the header city menu) and the note goes away.
 */
export function InCityButton({ slug, name }: { slug: string; name: string }) {
  return (
    <button
      type="button"
      onClick={() => saveCity(slug)}
      className="whitespace-nowrap font-semibold text-accent underline underline-offset-2 hover:text-white"
    >
      I&apos;m in {name}
    </button>
  );
}
