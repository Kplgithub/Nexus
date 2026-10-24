'use client';

import { useEffect } from 'react';

/** Counts one view per page per browser session. Failures are ignored. */
export function ViewBeacon({ path }: { path: string }) {
  useEffect(() => {
    const key = `nexus_view:${path}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, '1');
    } catch {
      /* storage unavailable: still count */
    }
    void fetch(`/api/v1${path}`, { method: 'POST', keepalive: true }).catch(() => {});
  }, [path]);
  return null;
}
