'use client';

import { useEffect, useRef, useState } from 'react';
import { EyeIcon } from '../icons';

export type FieldErrors = Record<string, string[] | undefined>;

export function TextField({
  id,
  label,
  error,
  hint,
  className = '',
  ...input
}: React.InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <input
        id={id}
        name={id}
        className="field"
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        {...input}
      />
      {error ? (
        <p id={`${id}-err`} className="field-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export function PasswordField({
  id,
  label,
  error,
  hint,
  autoComplete = 'current-password',
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          name={id}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          required
          className="field pr-12"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : hint ? `${id}-hint` : undefined}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Hide password' : 'Show password'}
          aria-pressed={show}
          className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-md text-ink-muted hover:text-brand"
        >
          <EyeIcon size={18} />
        </button>
      </div>
      {error ? (
        <p id={`${id}-err`} className="field-error">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Six-box one-time code input. Pastes a full code into all boxes. */
export function OtpInput({
  value,
  onChange,
  length = 6,
  error,
  autoFocus = true,
}: {
  value: string;
  onChange: (v: string) => void;
  length?: number;
  error?: string;
  autoFocus?: boolean;
}) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);
  const digits = Array.from({ length }, (_, i) => value[i] ?? '');

  function set(i: number, d: string) {
    const next = digits.slice();
    next[i] = d;
    onChange(next.join('').slice(0, length));
  }

  return (
    <div>
      <div className="flex gap-2" role="group" aria-label="Verification code">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              refs.current[i] = el;
            }}
            inputMode="numeric"
            autoComplete={i === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            value={d}
            aria-label={`Digit ${i + 1}`}
            aria-invalid={!!error}
            onChange={(e) => {
              const v = e.target.value.replace(/\D/g, '');
              if (!v) return set(i, '');
              set(i, v.slice(-1));
              refs.current[i + 1]?.focus();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Backspace' && !digits[i] && i > 0) refs.current[i - 1]?.focus();
            }}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
              if (text) {
                e.preventDefault();
                onChange(text);
                refs.current[Math.min(text.length, length - 1)]?.focus();
              }
            }}
            className="field tabular h-14 w-12 text-center text-xl font-bold"
          />
        ))}
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

/** Countdown for "Resend code". */
export function useCountdown(seconds: number) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  return { left, start: () => setLeft(seconds) };
}

/** Accept only same-site paths as post-login destinations. */
export function safeNext(next: string | null | undefined, fallback = '/dashboard') {
  return next && next.startsWith('/') && !next.startsWith('//') && !next.startsWith('/admin')
    ? next
    : fallback;
}
