'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { USER_ROLE_LABELS, canListProperty } from '@nexus/shared';
import { POST_PROPERTY_PATH } from '@/lib/site';
import { BriefcaseIcon, CraneIcon, HomeIcon } from '@/components/icons';
import { useSession } from './SessionProvider';

const ROLES = [
  { role: 'individual', label: 'Owner', Icon: HomeIcon },
  { role: 'agent', label: 'Agent', Icon: BriefcaseIcon },
  { role: 'builder', label: 'Builder', Icon: CraneIcon },
] as const;

/** Hero form on /post-property: pick who you are and sale or rent, then sign up or go to the form. */
export function StartPostingCard() {
  const router = useRouter();
  const { user, loading } = useSession();
  const [role, setRole] = useState<(typeof ROLES)[number]['role']>('individual');
  const [type, setType] = useState<'sale' | 'rent'>('sale');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const formPath = `${POST_PROPERTY_PATH}?type=${type}`;

  function start(e: React.FormEvent) {
    e.preventDefault();
    if (user) {
      router.push(canListProperty(user.role) ? formPath : POST_PROPERTY_PATH);
      return;
    }
    const digits = phone.replace(/\D/g, '').slice(-10);
    if (digits.length !== 10) {
      setError('Enter your 10-digit mobile number');
      return;
    }
    const qs = new URLSearchParams({ next: formPath, role, phone: digits });
    router.push(`/signup?${qs}`);
  }

  return (
    <form
      onSubmit={start}
      className="rounded-[22px] bg-white p-5 text-ink shadow-[0_30px_60px_-30px_rgba(0,0,0,.6)] sm:p-7"
    >
      <h2 className="text-[1.6rem] leading-tight">Start posting, it’s quick</h2>

      {user ? (
        <p className="mt-3 rounded-xl bg-[#f4f6fb] p-3 text-sm text-ink-soft">
          Posting as <b className="text-ink">{user.companyName || user.name}</b> (
          {USER_ROLE_LABELS[user.role]})
        </p>
      ) : (
        <fieldset className="mt-4">
          <legend className="text-[13px] font-bold">You are</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {ROLES.map(({ role: r, label, Icon }) => (
              <label
                key={r}
                className={`flex cursor-pointer flex-col items-center gap-1 rounded-xl p-3 text-center text-[13px] font-bold ${
                  role === r
                    ? 'border-2 border-brand bg-brand-50/60 text-brand'
                    : 'border border-[#e6eaf2] text-ink-soft hover:border-brand/40'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  className="sr-only"
                  checked={role === r}
                  onChange={() => setRole(r)}
                />
                <Icon size={20} />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="mt-4">
        <legend className="text-[13px] font-bold">You want to</legend>
        <div className="mt-2 flex gap-2">
          {(['sale', 'rent'] as const).map((t) => (
            <label
              key={t}
              className={`cursor-pointer rounded-full px-5 py-2 text-[13.5px] font-bold ${
                type === t ? 'bg-brand text-white' : 'border border-[#e6eaf2] text-ink-soft'
              }`}
            >
              <input
                type="radio"
                name="type"
                className="sr-only"
                checked={type === t}
                onChange={() => setType(t)}
              />
              {t === 'sale' ? 'Sell' : 'Rent out'}
            </label>
          ))}
        </div>
      </fieldset>

      {!user && (
        <div className="mt-4">
          <label htmlFor="start-phone" className="text-[13px] font-bold">
            Mobile number
          </label>
          <div
            className={`mt-2 flex h-[50px] items-center gap-2 rounded-xl border px-3.5 focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20 ${error ? 'border-danger' : 'border-line-strong'}`}
          >
            <span className="font-bold">+91</span>
            <input
              id="start-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              placeholder="Enter 10-digit number"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError(null);
              }}
              className="h-full min-w-0 flex-1 bg-transparent outline-none"
            />
          </div>
          {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="btn btn-accent mt-5 h-[50px] w-full justify-center text-[15px]"
      >
        Start posting
      </button>
      {!user && (
        <p className="mt-3 text-center text-xs text-ink-muted">
          Already have an account?{' '}
          <Link
            href={`/login?next=${encodeURIComponent(formPath)}`}
            className="font-bold text-brand"
          >
            Log in
          </Link>
        </p>
      )}
    </form>
  );
}
