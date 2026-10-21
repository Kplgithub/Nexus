'use client';

import Link from 'next/link';
import { POST_PROPERTY_PATH } from '@/lib/site';
import { useSession } from './SessionProvider';

/** Sends signed-in users straight to the listing form; everyone else to sign up first. */
export function PostPropertyCta({
  className = 'btn btn-primary',
  role,
}: {
  className?: string;
  role?: string;
}) {
  const { user, loading } = useSession();
  if (!loading && user) {
    return (
      <Link href={POST_PROPERTY_PATH} className={className}>
        Post a property
      </Link>
    );
  }
  const qs = new URLSearchParams({ next: POST_PROPERTY_PATH });
  if (role) qs.set('role', role);
  return (
    <Link href={`/signup?${qs}`} className={className}>
      Create a free account
    </Link>
  );
}
