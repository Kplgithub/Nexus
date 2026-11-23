'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import {
  ADMIN_PATH,
  USER_ROLES,
  USER_ROLE_LABELS,
  formatIndianPhone,
  type AdminWebsiteUser,
} from '@nexus/shared';
import { PageTitle, StatusPill } from '@/components/admin/AdminShell';
import { useApi } from '@/components/admin/useApi';

function UsersList() {
  const params = useSearchParams();
  const [role, setRole] = useState(params.get('role') ?? '');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const qs = new URLSearchParams({
    page: String(page),
    limit: '25',
    ...(role && { role }),
    ...(status && { status }),
    ...(query && { q: query }),
  });
  const { data, meta, loading, error } = useApi<AdminWebsiteUser[]>(`/admin/users?${qs}`);

  return (
    <>
      <PageTitle title="Website users" />
      <form
        className="card mb-4 grid gap-3 p-4 sm:grid-cols-[1fr_12rem_10rem_auto]"
        onSubmit={(e) => {
          e.preventDefault();
          setPage(1);
          setQuery(q.trim());
        }}
      >
        <label className="sr-only" htmlFor="u-q">
          Search
        </label>
        <input
          id="u-q"
          className="field"
          placeholder="Name, email, phone or company"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <label className="sr-only" htmlFor="u-role">
          Account type
        </label>
        <select
          id="u-role"
          className="field"
          value={role}
          onChange={(e) => {
            setRole(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All account types</option>
          {USER_ROLES.map((r) => (
            <option key={r} value={r}>
              {USER_ROLE_LABELS[r]}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="u-status">
          Status
        </label>
        <select
          id="u-status"
          className="field"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="blocked">Blocked</option>
        </select>
        <button type="submit" className="btn btn-outline">
          Search
        </button>
      </form>

      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-50 p-3 text-danger">
          {error}
        </p>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[52rem] text-left text-sm">
          <thead className="border-b border-line bg-surface text-xs text-ink-muted">
            <tr>
              <th className="px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Mobile</th>
              <th className="px-4 py-3 font-semibold">Listings</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {loading && !data && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-muted">
                  Loading…
                </td>
              </tr>
            )}
            {data?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-ink-muted">
                  No users match.
                </td>
              </tr>
            )}
            {data?.map((u) => (
              <tr key={u.id}>
                <td className="px-4 py-3">
                  <Link
                    href={`${ADMIN_PATH}/users/${u.id}`}
                    className="font-semibold hover:text-brand"
                  >
                    {u.companyName || u.name}
                  </Link>
                  <div className="text-xs text-ink-muted">
                    {u.companyName ? `${u.name} · ` : ''}
                    {u.email}
                  </div>
                </td>
                <td className="px-4 py-3">
                  {USER_ROLE_LABELS[u.role]}
                  {u.verified && (
                    <span className="ml-1.5 text-xs font-semibold text-accent-700">Verified</span>
                  )}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {formatIndianPhone(u.phone)}
                  {!u.phoneVerified && <span className="ml-1 text-xs text-warn">unverified</span>}
                </td>
                <td className="px-4 py-3">
                  {u.listingCount ? (
                    <Link
                      className="text-brand hover:underline"
                      href={`${ADMIN_PATH}/properties?userId=${u.id}`}
                    >
                      {u.listingCount}
                    </Link>
                  ) : (
                    '0'
                  )}
                </td>
                <td className="px-4 py-3">
                  <StatusPill status={u.status} />
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-ink-muted">
                  {new Date(u.createdAt).toLocaleDateString('en-IN')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-ink-muted">
            Page {meta.page} of {meta.totalPages} · {meta.total} users
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn btn-outline btn-sm"
              disabled={page >= meta.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense>
      <UsersList />
    </Suspense>
  );
}
