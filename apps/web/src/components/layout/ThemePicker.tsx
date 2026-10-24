'use client';

import { useEffect, useState } from 'react';
import { THEMES, type ThemeId } from '@/lib/theme';
import { CloseIcon } from '../icons';

/**
 * Floating colour picker for trying the themes on the live site. It appears
 * only after a ?theme=… link has been opened, so normal visitors never see it.
 */
export function ThemePicker() {
  const [visible, setVisible] = useState(false);
  const [theme, setTheme] = useState<ThemeId>('teal');

  useEffect(() => {
    try {
      setVisible(localStorage.getItem('nx-theme-preview') === '1');
      setTheme((localStorage.getItem('nx-theme') as ThemeId) || 'teal');
    } catch {
      /* storage blocked: no picker */
    }
  }, []);

  const apply = (id: ThemeId) => {
    setTheme(id);
    if (id === 'teal') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = id;
    try {
      localStorage.setItem('nx-theme', id);
    } catch {}
  };

  const close = () => {
    apply('teal');
    setVisible(false);
    try {
      localStorage.removeItem('nx-theme');
      localStorage.removeItem('nx-theme-preview');
    } catch {}
  };

  if (!visible) return null;
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
          onClick={() => apply(t.id)}
          aria-pressed={theme === t.id}
          title={t.label}
          className={`grid size-9 place-items-center rounded-full transition ${theme === t.id ? 'ring-2 ring-ink ring-offset-2' : 'hover:scale-110'}`}
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
        onClick={close}
        aria-label="Close theme preview"
        className="grid size-8 place-items-center rounded-full text-ink-muted hover:bg-surface hover:text-ink"
      >
        <CloseIcon size={16} />
      </button>
    </div>
  );
}
