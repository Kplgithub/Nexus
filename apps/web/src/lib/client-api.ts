'use client';

import type { ApiResponse, PaginationMeta } from '@nexus/shared';

export class ApiClientError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, string[]>,
  ) {
    super(message);
  }
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const m = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return m ? decodeURIComponent(m[1]!) : undefined;
}

type Opts = {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  form?: FormData;
  signal?: AbortSignal;
};

/**
 * Browser fetch against the same-origin API (/api/v1). Sends cookies and, for
 * writes, the CSRF token from the readable nexus_csrf cookie.
 */
export async function apiFetch<T>(
  path: string,
  opts: Opts = {},
): Promise<{ data: T; meta?: PaginationMeta }> {
  const method = opts.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (method !== 'GET') {
    const csrf = readCookie('nexus_csrf');
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }
  let body: BodyInit | undefined;
  if (opts.form) body = opts.form;
  else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }

  let res: Response;
  try {
    res = await fetch(`/api/v1${path}`, {
      method,
      headers,
      body,
      credentials: 'same-origin',
      signal: opts.signal,
      cache: 'no-store',
    });
  } catch {
    throw new ApiClientError(
      0,
      'NETWORK',
      'Could not reach the server. Check your connection and try again.',
    );
  }

  let json: ApiResponse<T> | null = null;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    // non-JSON (e.g. proxy error page)
  }
  if (!res.ok || !json || !json.ok) {
    const err = json && !json.ok ? json.error : undefined;
    throw new ApiClientError(
      res.status,
      err?.code ?? 'ERROR',
      err?.message ?? 'Something went wrong. Please try again.',
      err?.details,
    );
  }
  return { data: json.data, meta: json.meta };
}
