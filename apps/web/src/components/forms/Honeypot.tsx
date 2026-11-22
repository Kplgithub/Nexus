import type { CSSProperties } from 'react';

/**
 * Form field name for the anti-spam trap. Deliberately not "website", "url" or
 * anything browsers and password managers recognise, so autofill never fills it
 * for a real person (a filled trap rejects the submission).
 */
export const HONEYPOT_FIELD = 'nx_hp_ref';

/** Reads the trap value from submitted form data (sent to the API as `website`). */
export function honeypotValue(fd: FormData): string {
  return String(fd.get(HONEYPOT_FIELD) ?? '');
}

// Moved off-screen and clipped, not display:none / visibility:hidden / the
// `hidden` attribute, which simple bots check for and skip.
const OFFSCREEN: CSSProperties = {
  position: 'absolute',
  left: '-10000px',
  top: 'auto',
  width: '1px',
  height: '1px',
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
};

/**
 * Anti-spam trap: invisible to people, skipped by keyboard and screen readers,
 * ignored by autofill and password managers. Bots that fill every input fill it.
 */
export function Honeypot({ id }: { id?: string }) {
  const inputId = id ?? HONEYPOT_FIELD;
  return (
    <div aria-hidden="true" style={OFFSCREEN}>
      <label htmlFor={inputId}>Leave this field empty</label>
      <input
        id={inputId}
        type="text"
        name={HONEYPOT_FIELD}
        tabIndex={-1}
        autoComplete="off"
        defaultValue=""
        data-1p-ignore="true"
        data-lpignore="true"
        data-bwignore="true"
        data-form-type="other"
      />
    </div>
  );
}
