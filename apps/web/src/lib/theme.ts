/** Colour themes the site can preview. 'teal' is the brand default. */
export const THEMES = [
  { id: 'teal', label: 'Teal', swatch: ['#02667b', '#2faea6'] },
  { id: 'saffron', label: 'Teal + Saffron', swatch: ['#02667b', '#f59e0b'] },
  { id: 'blue', label: 'Royal blue + Orange', swatch: ['#1e40af', '#f97316'] },
  { id: 'pink', label: 'Jaipur Pink + Gold', swatch: ['#9d174d', '#d4a017'] },
] as const;

export type ThemeId = (typeof THEMES)[number]['id'];

/**
 * Runs before the page paints: applies ?theme=… (and remembers it) or the
 * remembered theme, so there is no flash of the default colours.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{var ok={teal:1,saffron:1,blue:1,pink:1};var q=new URLSearchParams(location.search).get('theme');if(q&&ok[q]){localStorage.setItem('nx-theme',q);localStorage.setItem('nx-theme-preview','1');}var t=localStorage.getItem('nx-theme');if(t&&ok[t]&&t!=='teal')document.documentElement.dataset.theme=t;}catch(e){}})();`;
