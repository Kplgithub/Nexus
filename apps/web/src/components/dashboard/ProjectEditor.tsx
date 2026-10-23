'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { PROJECT_STATUS_LABELS, type OwnProject } from '@nexus/shared';
import { ApiClientError, apiFetch } from '@/lib/client-api';
import {
  ProjectFields,
  formFromProject,
  projectPayload,
  type ProjectFormState,
} from '../project/ProjectForm';
import { Pill, SectionTitle } from './DashboardShell';

/** Builder's form for one project. Submitting sends it to the review queue. */
export function ProjectEditor({ project }: { project?: OwnProject }) {
  const router = useRouter();
  const [f, setF] = useState<ProjectFormState>(() => formFromProject(project));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const live = project?.status === 'published';

  async function save(status: 'draft' | 'pending') {
    setBusy(true);
    setErrors({});
    setFormError(null);
    const body = { ...projectPayload(f), status };
    try {
      if (project) await apiFetch(`/me/projects/${project.id}`, { method: 'PATCH', body });
      else await apiFetch('/me/projects', { method: 'POST', body });
      router.push('/dashboard/projects');
      router.refresh();
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiClientError) {
        setFormError(err.message);
        if (err.details) setErrors(err.details);
      } else setFormError('Could not save. Check your connection and try again.');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  return (
    <div>
      <SectionTitle
        title={project ? `Edit ${project.name}` : 'New project'}
        text="Our team checks every project before it goes live, usually within one working day."
      >
        {project && <Pill status={project.status} label={PROJECT_STATUS_LABELS[project.status]} />}
      </SectionTitle>
      {project?.moderationNote && project.status === 'rejected' && (
        <p role="note" className="mb-6 rounded-lg bg-danger-50 p-3 text-sm text-danger">
          <strong>Changes needed:</strong> {project.moderationNote}
        </p>
      )}
      {live && (
        <p role="note" className="mb-6 rounded-lg bg-accent-50 p-3 text-sm text-accent-700">
          This project is live. Saving changes sends it back for a quick review.
        </p>
      )}
      {formError && (
        <p role="alert" className="mb-6 rounded-lg bg-danger-50 p-3 text-sm text-danger">
          {formError}
        </p>
      )}
      <ProjectFields f={f} setF={setF} errors={errors} uploadPath="/me/uploads" />
      <div className="sticky bottom-0 z-10 -mx-4 mt-8 flex flex-wrap justify-end gap-2 border-t border-line bg-white/95 px-4 py-4 backdrop-blur">
        <Link href="/dashboard/projects" className="btn btn-ghost">
          Cancel
        </Link>
        {!live && (
          <button
            type="button"
            className="btn btn-outline"
            disabled={busy}
            onClick={() => void save('draft')}
          >
            Save draft
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => void save('pending')}
        >
          {busy ? 'Saving…' : 'Submit for review'}
        </button>
      </div>
    </div>
  );
}
