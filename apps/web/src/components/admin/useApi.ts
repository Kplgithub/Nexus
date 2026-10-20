'use client';

import { useCallback, useEffect, useState } from 'react';
import type { PaginationMeta } from '@nexus/shared';
import { ApiClientError, apiFetch } from '@/lib/client-api';

/** Small data hook for admin pages: refetches whenever `path` changes. */
export function useApi<T>(path: string | null) {
  const [state, setState] = useState<{
    data?: T;
    meta?: PaginationMeta;
    error?: string;
    loading: boolean;
  }>({ loading: !!path });
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!path) return;
    const ctrl = new AbortController();
    apiFetch<T>(path, { signal: ctrl.signal })
      .then(({ data, meta }) => setState({ data, meta, loading: false }))
      .catch((err) => {
        if (ctrl.signal.aborted) return;
        setState((s) => ({
          ...s,
          loading: false,
          error: err instanceof ApiClientError ? err.message : 'Failed to load',
        }));
      });
    return () => ctrl.abort();
  }, [path, nonce]);

  const reload = useCallback(() => setNonce((n) => n + 1), []);
  return { ...state, reload };
}

export function errMsg(err: unknown) {
  return err instanceof ApiClientError ? err.message : 'Something went wrong';
}
