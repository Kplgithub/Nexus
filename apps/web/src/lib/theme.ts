/** Colour themes the site can preview. 'teal' is the brand default. */
export const THEMES = [
  { id: 'teal', label: 'Teal', swatch: ['#02667b', '#2faea6'] },
  { id: 'saffron', label: 'Teal + Saffron', swatch: ['#02667b', '#f59e0b'] },
  { id: 'blue', label: 'Royal blue + Orange', swatch: ['#1e40af', '#f97316'] },
  { id: 'pink', label: 'Jaipur Pink + Gold', swatch: ['#9d174d', '#d4a017'] },
  { id: 'navy', label: 'Navy + Gold', swatch: ['#1e3a5f', '#c9a227'] },
  { id: 'emerald', label: 'Emerald + Gold', swatch: ['#047857', '#d4a017'] },
  { id: 'purple', label: 'Royal purple + Amber', swatch: ['#5b21b6', '#f59e0b'] },
  { id: 'terracotta', label: 'Sandstone + Teal', swatch: ['#b4532a', '#0d9488'] },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

/**
 * Runs before the page paints: applies ?theme=… (and remembers it) or the
 * remembered theme, so there is no flash of the default colours.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var ok={teal:1,saffron:1,blue:1,pink:1,navy:1,emerald:1,purple:1,terracotta:1};var q=new URLSearchParams(location.search).get('theme');if(q&&ok[q]){localStorage.setItem('nx-theme',q);localStorage.setItem('nx-theme-preview','1');}var t=localStorage.getItem('nx-theme');if(t&&ok[t]&&t!=='teal')document.documentElement.dataset.theme=t;}catch(e){}})();`;
