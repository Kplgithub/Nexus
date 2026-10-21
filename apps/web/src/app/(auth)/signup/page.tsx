import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getAuthConfig, getLocations } from '@/lib/api';
import { SignupWizard } from '@/components/auth/SignupWizard';

export const metadata: Metadata = {
  title: 'Sign up',
  description: 'Create a free NEXUS Estate account as a buyer, owner, tenant, agent or builder.',
};

export default async function SignupPage() {
  const [config, cities] = await Promise.all([getAuthConfig(), getLocations()]);
  return (
    <Suspense>
      <SignupWizard config={config} cities={cities.map((c) => ({ slug: c.slug, name: c.name }))} />
    </Suspense>
  );
}
