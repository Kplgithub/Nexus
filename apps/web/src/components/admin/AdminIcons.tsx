import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;

/** Line icons for the admin panel (24px grid, 1.8 stroke, inherits colour). */
function I({ children, ...p }: P & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={18}
      height={18}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...p}
    >
      {children}
    </svg>
  );
}

export const A = {
  search: (p: P) => (
    <I {...p}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </I>
  ),
  home: (p: P) => (
    <I {...p}>
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
    </I>
  ),
  review: (p: P) => (
    <I {...p}>
      <path d="M9 12l2 2 4-4" />
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
    </I>
  ),
  building: (p: P) => (
    <I {...p}>
      <path d="M4 21V5l8-2v18M12 8l8 2v11M8 8h.01M8 12h.01M8 16h.01M16 13h.01M16 17h.01M2 21h20" />
    </I>
  ),
  crane: (p: P) => (
    <I {...p}>
      <path d="M6 21V4h12M6 4l4 4M18 4v5M16 9h4v3h-4zM3 21h8" />
    </I>
  ),
  flag: (p: P) => (
    <I {...p}>
      <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
    </I>
  ),
  star: (p: P) => (
    <I {...p}>
      <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z" />
    </I>
  ),
  inbox: (p: P) => (
    <I {...p}>
      <path d="M3 13l3-8h12l3 8v6a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z" />
      <path d="M3 13h5l1 3h6l1-3h5" />
    </I>
  ),
  calendar: (p: P) => (
    <I {...p}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </I>
  ),
  users: (p: P) => (
    <I {...p}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 0 1 0 7M18 14.8c1.8.7 3 2.4 3.5 5.2" />
    </I>
  ),
  badge: (p: P) => (
    <I {...p}>
      <path d="M12 2.5l2.4 1.8 3 .1.9 2.8 2.4 1.8-.9 2.9.9 2.8-2.4 1.8-.9 2.9-3 .1L12 21.5l-2.4-1.8-3-.1-.9-2.9-2.4-1.8.9-2.8-.9-2.9 2.4-1.8.9-2.8 3-.1z" />
      <path d="M8.8 12l2.2 2.2 4.2-4.4" />
    </I>
  ),
  pen: (p: P) => (
    <I {...p}>
      <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />
    </I>
  ),
  pin: (p: P) => (
    <I {...p}>
      <path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </I>
  ),
  help: (p: P) => (
    <I {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.6M12 17h.01" />
    </I>
  ),
  team: (p: P) => (
    <I {...p}>
      <path d="M12 3l8 3v5c0 5-3.5 8.5-8 10-4.5-1.5-8-5-8-10V6z" />
      <circle cx="12" cy="10" r="2.5" />
      <path d="M8.5 16c.7-1.6 2-2.5 3.5-2.5s2.8.9 3.5 2.5" />
    </I>
  ),
  clock: (p: P) => (
    <I {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </I>
  ),
  rupee: (p: P) => (
    <I {...p}>
      <path d="M7 4h10M7 8.5h10M7 4c4.5 0 6 2 6 4.5S11.5 13 7 13l7.5 7" />
    </I>
  ),
  tag: (p: P) => (
    <I {...p}>
      <path d="M3 12V4a1 1 0 0 1 1-1h8l9 9-9 9z" />
      <circle cx="7.5" cy="7.5" r="1.5" />
    </I>
  ),
  bell: (p: P) => (
    <I {...p}>
      <path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8M10 20a2 2 0 0 0 4 0" />
    </I>
  ),
  cog: (p: P) => (
    <I {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </I>
  ),
  plus: (p: P) => (
    <I {...p}>
      <path d="M12 5v14M5 12h14" />
    </I>
  ),
  phone: (p: P) => (
    <I {...p}>
      <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2" />
    </I>
  ),
  menu: (p: P) => (
    <I {...p}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </I>
  ),
  close: (p: P) => (
    <I {...p}>
      <path d="M6 6l12 12M18 6L6 18" />
    </I>
  ),
  external: (p: P) => (
    <I {...p}>
      <path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" />
    </I>
  ),
  logout: (p: P) => (
    <I {...p}>
      <path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 16l-4-4 4-4M6 12h10" />
    </I>
  ),
  arrow: (p: P) => (
    <I {...p}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </I>
  ),
  key: (p: P) => (
    <I {...p}>
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l9-9M17 6l3 3M14 9l2 2" />
    </I>
  ),
};

export type AdminIconName = keyof typeof A;
