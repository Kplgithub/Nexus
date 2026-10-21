'use client';

import { useParams } from 'next/navigation';
import type { OwnListing } from '@nexus/shared';
import { useApi } from '@/components/admin/useApi';
import { ListingWizard } from '@/components/dashboard/ListingWizard';

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const { data, error } = useApi<OwnListing>(`/me/properties/${id}`);
  if (error) return <p className="rounded-lg bg-danger-50 p-3 text-danger">{error}</p>;
  if (!data) return <div className="skeleton h-96" />;
  return <ListingWizard key={data.id} listing={data} />;
}
