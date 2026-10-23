'use client';

import { useParams } from 'next/navigation';
import type { OwnProject } from '@nexus/shared';
import { useApi } from '@/components/admin/useApi';
import { ProjectEditor } from '@/components/dashboard/ProjectEditor';

export default function EditProjectPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error } = useApi<OwnProject>(`/me/projects/${id}`);
  if (error) return <p className="rounded-lg bg-danger-50 p-3 text-danger">{error}</p>;
  if (!data) return <div className="skeleton h-96" />;
  return <ProjectEditor key={data.id} project={data} />;
}
