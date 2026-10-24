'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import {
  PROJECT_STAGE_LABELS,
  PROJECT_STATUS_LABELS,
  formatPriceRange,
  type OwnProject,
} from '@nexus/shared';
import { errMsg, useApi } from '@/components/admin/useApi';
import { Pill, SectionTitle } from '@/components/dashboard/DashboardShell';
import { useSession } from '@/components/session/SessionProvider';
import { BuildingIcon, EditIcon, EyeIcon, PlusIcon, TrashIcon } from '@/components/icons';
import { apiFetch } from '@/lib/client-api';

export default function MyProjectsPage() {
  const { user } = useSession();
  const isBuilder = user?.role === 'builder';
  const { data, error, loading, reload } = useApi<OwnProject[]>(isBuilder ? '/me/projects' : null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  if (!isBuilder) {
    return (
      <div className="rounded-2xl border border-dashed border-line-strong p-10 text-center">
        <p className="font-semibold">Project pages are for builder accounts</p>
        <p className="mt-1 text-sm text-ink-muted">
          Builders can list a whole project with unit types, floor plans and a brochure.{' '}
          <Link href="/contact" className="font-semibold text-brand underline">
            Contact us
          </Link>{' '}
          to switch your account.
        </p>
      </div>
    );
  }

  async function act(p: OwnProject, action: 'inactive' | 'pending' | 'delete', done: string) {
    if (action === 'delete' && !window.confirm(`Delete “${p.name}”? This cannot be undone.`))
      return;
    setBusy(p.id);
    setMessage(null);
    try {
      if (action === 'delete') await apiFetch(`/me/projects/${p.id}`, { method: 'DELETE' });
      else
        await apiFetch(`/me/projects/${p.id}/status`, { method: 'POST', body: { status: action } });
      setMessage({ kind: 'ok', text: done });
      reload();
    } catch (err) {
      setMessage({ kind: 'error', text: errMsg(err) });
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <SectionTitle
        title="My projects"
        text="New projects with unit types, floor plans and brochure. Enquiries come to your Leads."
      >
        <Link href="/dashboard/projects/new" className="btn btn-outline btn-sm">
          <PlusIcon size={16} /> New project
        </Link>
      </SectionTitle>
      {message && (
        <p
          role={message.kind === 'error' ? 'alert' : 'status'}
          className={`mb-4 rounded-lg p-3 text-sm ${message.kind === 'error' ? 'bg-danger-50 text-danger' : 'bg-success-50 text-success'}`}
        >
          {message.text}
        </p>
      )}
      {error && <p className="rounded-lg bg-danger-50 p-3 text-danger">{error}</p>}
      {loading && !data && <div className="skeleton h-40" />}
      {data && data.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line-strong p-10 text-center">
          <p className="font-semibold">No projects yet</p>
          <p className="mt-1 text-sm text-ink-muted">
            Add your first project. It goes live after a quick check by our team.
          </p>
          <Link href="/dashboard/projects/new" className="btn btn-primary mt-5">
            <PlusIcon size={16} /> Add a project
          </Link>
        </div>
      )}
      <ul className="space-y-3">
        {(data ?? []).map((p) => (
          <li key={p.id} className="card flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
            <span className="relative block aspect-[4/3] w-full shrink-0 overflow-hidden rounded-lg bg-surface sm:w-36">
              {p.coverImage ? (
                <Image src={p.coverImage.url} alt="" fill sizes="144px" className="object-cover" />
              ) : (
                <span className="grid h-full place-items-center text-ink-muted">
                  <BuildingIcon size={28} />
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Pill status={p.status} label={PROJECT_STATUS_LABELS[p.status]} />
                <span className="text-xs text-ink-muted">{PROJECT_STAGE_LABELS[p.stage]}</span>
              </div>
              <p className="mt-1 truncate font-semibold">{p.name}</p>
              <p className="text-sm text-ink-muted">
                {p.locality.name} · {formatPriceRange(p.priceRange.min, p.priceRange.max)} ·{' '}
                {p.enquiryCount} {p.enquiryCount === 1 ? 'enquiry' : 'enquiries'}
              </p>
              {p.status === 'rejected' && p.moderationNote && (
                <p className="mt-1 text-sm text-danger">{p.moderationNote}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {p.status === 'published' && (
                <Link href={`/projects/${p.slug}`} className="btn btn-ghost btn-sm">
                  <EyeIcon size={15} /> View
                </Link>
              )}
              <Link href={`/dashboard/projects/${p.id}`} className="btn btn-outline btn-sm">
                <EditIcon size={15} /> Edit
              </Link>
              {p.status === 'published' && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy === p.id}
                  onClick={() => void act(p, 'inactive', 'Project hidden from the website.')}
                >
                  Hide
                </button>
              )}
              {p.status === 'inactive' && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={busy === p.id}
                  onClick={() => void act(p, 'pending', 'Sent for review.')}
                >
                  Re-submit
                </button>
              )}
              <button
                type="button"
                className="btn btn-ghost btn-sm text-danger"
                disabled={busy === p.id}
                aria-label={`Delete ${p.name}`}
                onClick={() => void act(p, 'delete', 'Project deleted.')}
              >
                <TrashIcon size={15} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
