'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  ADMIN_PATH,
  PROJECT_STATUSES,
  PROJECT_STATUS_LABELS,
  formatIndianPhone,
  type AdminProject,
  type ProjectStatus,
} from '@nexus/shared';
import { PageTitle, StatusPill, useAdmin } from '@/components/admin/AdminShell';
import { ModerationBar } from '@/components/admin/PropertyEditor';
import { useApi } from '@/components/admin/useApi';
import {
  ProjectFields,
  adminProjectPayload,
  formFromProject,
  type ProjectFormState,
} from '@/components/project/ProjectForm';
import { ApiClientError, apiFetch } from '@/lib/client-api';

export default function AdminProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error, reload } = useApi<AdminProject>(`/admin/projects/${id}`);
  if (error) return <p className="rounded-lg bg-danger-50 p-3 text-danger">{error}</p>;
  if (!data) return <p className="text-ink-muted">Loading…</p>;
  return <Editor key={data.updatedAt} project={data} reload={reload} />;
}

function Editor({ project: p, reload }: { project: AdminProject; reload: () => void }) {
  const router = useRouter();
  const { toast, can } = useAdmin();
  const [f, setF] = useState<ProjectFormState>(() => formFromProject(p));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    setErrors({});
    try {
      await apiFetch(`/admin/projects/${p.id}`, { method: 'PATCH', body: adminProjectPayload(f) });
      toast('Saved');
      reload();
    } catch (err) {
      if (err instanceof ApiClientError) {
        toast(err.message, 'error');
        if (err.details) setErrors(err.details);
      } else toast('Could not save', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function setStatus(status: ProjectStatus) {
    try {
      await apiFetch(`/admin/projects/${p.id}/status`, { method: 'POST', body: { status } });
      toast(`Status: ${PROJECT_STATUS_LABELS[status]}`);
      reload();
    } catch (err) {
      toast(err instanceof ApiClientError ? err.message : 'Could not update', 'error');
    }
  }

  async function remove() {
    if (!window.confirm(`Delete “${p.name}”? Listings linked to it stay, unlinked.`)) return;
    try {
      await apiFetch(`/admin/projects/${p.id}`, { method: 'DELETE' });
      toast('Project deleted');
      router.push(`${ADMIN_PATH}/projects`);
    } catch (err) {
      toast(err instanceof ApiClientError ? err.message : 'Could not delete', 'error');
    }
  }

  return (
    <>
      <PageTitle title={p.name}>
        <StatusPill status={p.status} />
        {p.status === 'published' && (
          <Link href={`/projects/${p.slug}`} target="_blank" className="btn btn-outline btn-sm">
            View on site
          </Link>
        )}
      </PageTitle>
      {p.builder && (
        <p className="-mt-3 mb-5 text-sm text-ink-muted">
          Builder:{' '}
          <Link
            href={`${ADMIN_PATH}/users/${p.builder.id}`}
            className="font-medium text-ink hover:text-brand"
          >
            {p.builder.name}
          </Link>{' '}
          · {formatIndianPhone(p.builder.phone)} · {p.builder.email} · {p.enquiryCount} enquiries
        </p>
      )}
      {p.status === 'pending' && (
        <div className="mb-6">
          <ModerationBar
            property={{ id: p.id, title: p.name }}
            basePath="/admin/projects"
            onDone={reload}
          />
        </div>
      )}
      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor="proj-status" className="text-ink-muted">
          Set status
        </label>
        <select
          id="proj-status"
          className="field w-auto"
          value={p.status}
          onChange={(e) => void setStatus(e.target.value as ProjectStatus)}
        >
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PROJECT_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>
      <ProjectFields f={f} setF={setF} errors={errors} uploadPath="/admin/uploads" staff />
      <div className="sticky bottom-0 z-10 mt-8 flex justify-between gap-2 border-t border-line bg-white/95 py-4 backdrop-blur">
        {can('admin') ? (
          <button type="button" className="btn btn-ghost text-danger" onClick={() => void remove()}>
            Delete
          </button>
        ) : (
          <span />
        )}
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => void save()}
        >
          {busy ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </>
  );
}
