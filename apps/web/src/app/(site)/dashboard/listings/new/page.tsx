'use client';

import { Suspense } from 'react';
import { ListingWizard } from '@/components/dashboard/ListingWizard';

export default function NewListingPage() {
  return (
    <Suspense fallback={<div className="skeleton h-96 rounded-2xl" />}>
      <ListingWizard />
    </Suspense>
  );
}
