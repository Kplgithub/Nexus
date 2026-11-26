'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { trackJourneyStep } from '@/lib/journey-tracker';

/**
 * Tracks visitor acquisition source (invite vs search vs direct/social) and
 * browse-to-enquiry funnel steps as the user navigates the public website.
 */
export function JourneyTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qs = searchParams.toString();

  useEffect(() => {
    if (!pathname) return;
    const path = qs ? `${pathname}?${qs}` : pathname;

    if (
      pathname.startsWith('/properties/') &&
      pathname !== '/properties' &&
      !pathname.startsWith('/properties/page')
    ) {
      trackJourneyStep({ flow: 'browse', step: 'property_view', stepIndex: 2, path });
      return;
    }

    if (
      pathname === '/search' ||
      pathname.startsWith('/buy') ||
      pathname.startsWith('/rent') ||
      pathname === '/commercial' ||
      pathname === '/properties'
    ) {
      trackJourneyStep({ flow: 'browse', step: 'search_results', stepIndex: 1, path });
      return;
    }

    trackJourneyStep({ flow: 'browse', step: 'landing', stepIndex: 0, path });
  }, [pathname, qs]);

  return null;
}
