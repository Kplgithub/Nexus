'use client';

import { useState } from 'react';
import type { SessionUser } from '@nexus/shared';
import { ApiClientError, apiFetch } from '@/lib/client-api';
import { useSession } from '../session/SessionProvider';
import { HomeIcon } from '../icons';

/**
 * Shown to a buyer or tenant who opens a page for listers (post property, my listings,
 * leads, plan). One tap turns their account into an owner account.
 */
export function BecomeOwner() {
  const { setUser } = useSession();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function become() {
    setBusy(true);
    setError(null);
    try {
      const { data } = await apiFetch<{ user: SessionUser }>('/me/become-owner', {
        method: 'POST',
      });
      setUser(data.user);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-line bg-white p-6 sm:p-8">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-brand-50 text-brand">
        <HomeIcon size={24} />
      </span>
      <h2 className="mt-4 text-[1.6rem] leading-tight">Want to list your own property?</h2>
      <p className="mt-2 max-w-prose text-ink-soft">
        Your account is a Buyer / Tenant account. To sell or rent out a property, switch it to an
        Owner account. Your saved homes and enquiries stay as they are.
      </p>
      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <button
        type="button"
        className="btn btn-primary mt-5 w-full sm:w-auto"
        disabled={busy}
        onClick={() => void become()}
      >
        {busy ? 'Switching…' : 'Switch to Owner account'}
      </button>
    </div>
  );
}
