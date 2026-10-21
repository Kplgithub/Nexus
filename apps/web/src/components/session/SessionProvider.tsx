'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { SessionUser } from '@nexus/shared';
import { ApiClientError, apiFetch } from '@/lib/client-api';

type Session = {
  user: SessionUser | null;
  /** True until the first /me check finishes. */
  loading: boolean;
  savedIds: Set<string>;
  refresh: () => Promise<SessionUser | null>;
  setUser: (u: SessionUser | null) => void;
  toggleSave: (propertyId: string) => Promise<boolean | null>;
  logout: () => Promise<void>;
  /** Sends the visitor to sign in, returning here afterwards. */
  requireLogin: (reason?: string) => void;
};

const Ctx = createContext<Session | null>(null);

export function useSession() {
  const s = useContext(Ctx);
  if (!s) throw new Error('useSession must be used inside SessionProvider');
  return s;
}

/** Like useSession, but returns null outside the provider (e.g. in admin pages). */
export function useOptionalSession() {
  return useContext(Ctx);
}

const hasSessionCookie = () =>
  typeof document !== 'undefined' && document.cookie.includes('nexus_ucsrf=');

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const path = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const refresh = useCallback(async () => {
    // Skip the network round-trip for visitors who have never signed in.
    if (!hasSessionCookie()) {
      setUser(null);
      setLoading(false);
      return null;
    }
    try {
      const [{ data }, saved] = await Promise.all([
        apiFetch<{ user: SessionUser }>('/me'),
        apiFetch<string[]>('/me/saved/ids').catch(() => ({ data: [] as string[] })),
      ]);
      setUser(data.user);
      setSavedIds(new Set(saved.data));
      return data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const requireLogin = useCallback(
    (reason?: string) => {
      const qs = new URLSearchParams({ next: path });
      if (reason) qs.set('reason', reason);
      router.push(`/login?${qs}`);
    },
    [path, router],
  );

  const toggleSave = useCallback(
    async (id: string) => {
      if (!user) {
        requireLogin('save');
        return null;
      }
      const isSaved = savedIds.has(id);
      // Optimistic: update first, roll back on failure.
      setSavedIds((s) => {
        const n = new Set(s);
        if (isSaved) n.delete(id);
        else n.add(id);
        return n;
      });
      try {
        await apiFetch(`/me/saved/${id}`, { method: isSaved ? 'DELETE' : 'PUT' });
        return !isSaved;
      } catch (err) {
        setSavedIds((s) => {
          const n = new Set(s);
          if (isSaved) n.add(id);
          else n.delete(id);
          return n;
        });
        if (err instanceof ApiClientError && err.status === 401) requireLogin('save');
        return null;
      }
    },
    [user, savedIds, requireLogin],
  );

  const logout = useCallback(async () => {
    await apiFetch('/auth/logout', { method: 'POST' }).catch(() => undefined);
    setUser(null);
    setSavedIds(new Set());
    router.push('/');
    router.refresh();
  }, [router]);

  const value = useMemo(
    () => ({ user, loading, savedIds, refresh, setUser, toggleSave, logout, requireLogin }),
    [user, loading, savedIds, refresh, toggleSave, logout, requireLogin],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
