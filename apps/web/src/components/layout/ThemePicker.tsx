'use client';

import { useSyncExternalStore } from 'react';
import { THEMES, type ThemeId } from '@/lib/theme';
import { CloseIcon } from '../icons';

// The chosen theme lives in localStorage and on <html data-theme>; this store
// lets the picker read it without effects and re-render when it changes.
const listeners = new Set<() => void>();
const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const snapshot = () => `${read('nx-theme-preview') ?? ''}|${read('nx-theme') ?? 'teal'}`;
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

function setTheme(id: ThemeId, keepPreview = true) {
  const root = document.documentElement;
  if (id === 'teal') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', id);
  try {
    if (keepPreview) localStorage.setItem('nx-theme', id);
    else {
      localStorage.removeItem('nx-theme');
      localStorage.removeItem('nx-theme-preview');
    }
  } catch {
    /* storage blocked: the theme still applies to this page */
  }
  listeners.forEach((fn) => fn());
}

/**
 * Floating colour picker for trying the themes on the live site. It appears
 * only after a ?theme=… link has been opened, so normal visitors never see it.
 */
export function ThemePicker() {
  const state = useSyncExternalStore(subscribe, snapshot, () => '|teal');
  const [preview, current] = state.split('|') as [string, ThemeId];
  if (preview !== '1') return null;

  return (
    <div
      role="group"
      aria-label="Colour theme preview"
      className="fixed bottom-5 left-5 z-50 flex items-center gap-1 rounded-full border border-line bg-white/95 p-1.5 shadow-xl backdrop-blur"
    >
      <span className="px-2 text-xs font-semibold text-ink-muted">Theme</span>
      {THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTheme(t.id)}
          aria-pressed={current === t.id}
          title={t.label}
          className={`grid size-9 place-items-center rounded-full transition ${current === t.id ? 'ring-2 ring-ink ring-offset-2' : 'hover:scale-110'}`}
        >
          <span
            className="size-7 rounded-full"
            style={{
              background: `linear-gradient(135deg, ${t.swatch[0]} 50%, ${t.swatch[1]} 50%)`,
            }}
          />
          <span className="sr-only">{t.label}</span>
        </button>
      ))}
      <button
        type="button"
        onClick={() => setTheme('teal', false)}
        aria-label="Close theme preview"
        className="grid size-8 place-items-center rounded-full text-ink-muted hover:bg-surface hover:text-ink"
      >
        <CloseIcon size={16} />
      </button>
    </div>
  );
}
