'use client';

import Link from 'next/link';
import type { PropertyCard } from '@nexus/shared';
import { useApi } from '@/components/admin/useApi';
import { SectionTitle } from '@/components/dashboard/DashboardShell';
import { PropertyGrid } from '@/components/property/PropertyCard';
import { useSession } from '@/components/session/SessionProvider';
import { useSections } from '@/components/session/SectionsProvider';

export default function SavedPage() {
  const { savedIds } = useSession();
  const on = useSections();
  const { data, error, loading } = useApi<PropertyCard[]>('/me/saved');
  // Hide cards the visitor un-saved on this page without refetching.
  const items = data?.filter((p) => savedIds.has(p.id)) ?? [];

  return (
    <div>
      <SectionTitle title="Saved properties" text="Tap the heart on any listing to keep it here." />
      {error && <p className="rounded-lg bg-danger-50 p-3 text-danger">{error}</p>}
      {loading && !data && <div className="skeleton h-60" />}
      {data && items.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line-strong p-10 text-center">
          <p className="font-semibold">Nothing saved yet</p>
          <div className="mt-4 flex justify-center gap-2">
            {on.buy && (
              <Link href="/buy" className="btn btn-outline btn-sm">
                Browse for sale
              </Link>
            )}
            {on.rent && (
              <Link href="/rent" className="btn btn-outline btn-sm">
                Browse rentals
              </Link>
            )}
            {!on.buy && !on.rent && (
              <Link href="/properties" className="btn btn-outline btn-sm">
                Browse properties
              </Link>
            )}
          </div>
        </div>
      )}
      {items.length > 0 && <PropertyGrid items={items} columns={2} />}
    </div>
  );
}
