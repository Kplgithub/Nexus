'use client';

import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { ApiClientError, apiFetch } from '@/lib/client-api';

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      await apiFetch('/admin/auth/login', {
        method: 'POST',
        body: { email: fd.get('email'), password: fd.get('password') },
      });
      const next = params.get('next');
      // Only allow same-site admin paths as redirect targets.
      router.replace(next && next.startsWith('/admin') && !next.startsWith('//') ? next : '/admin');
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'Sign-in failed. Please try again.');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="field-label">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          className="field"
        />
      </div>
      <div>
        <label htmlFor="password" className="field-label">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="field"
        />
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-danger-50 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full" disabled={busy}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <div className="card w-full max-w-sm p-8">
        <div className="flex justify-center">
          <Image src="/brand/nexus-logo.png" alt="NEXUS Estate" width={120} height={100} priority />
        </div>
        <h1 className="mt-6 text-center text-xl font-bold">Admin sign in</h1>
        <p className="mt-1 text-center text-sm text-ink-muted">For authorised NEXUS staff only.</p>
        <div className="mt-6">
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
