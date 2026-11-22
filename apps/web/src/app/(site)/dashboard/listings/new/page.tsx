'use client';

import { Suspense } from 'react';
import { ListingWizard } from '@/components/dashboard/ListingWizard';
import { PlansPopup } from '@/components/dashboard/PlansPopup';

export default function NewListingPage() {
  return (
    <>
      {/* Only Post Property shows the plans popup, and only without an active plan. */}
      <PlansPopup />
      <Suspense fallback={<div className="skeleton h-96 rounded-2xl" />}>
        <ListingWizard />
      </Suspense>
    </>
  );
}
