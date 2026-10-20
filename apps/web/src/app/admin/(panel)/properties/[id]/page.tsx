'use client';

import { use } from 'react';
import type { AdminProperty } from '@nexus/shared';
import { PropertyEditor } from '@/components/admin/PropertyEditor';
import { useApi } from '@/components/admin/useApi';

export default function EditPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, error, loading } = useApi<AdminProperty>(
    /^[a-f0-9]{24}$/i.test(id) ? `/admin/properties/${id}` : null,
  );
  if (error || (!loading && !data))
    return (
      <p role="alert" className="rounded-lg bg-danger-50 p-4 text-danger">
        {error ?? 'Property not found'}
      </p>
    );
  if (!data) return <p className="text-ink-muted">Loading…</p>;
  return <PropertyEditor key={data.id + data.updatedAt} property={data} />;
}
