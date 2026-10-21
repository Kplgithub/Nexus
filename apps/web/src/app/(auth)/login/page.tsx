import { Suspense } from 'react';
import type { Metadata } from 'next';
import { getAuthConfig } from '@/lib/api';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = { title: 'Log in', robots: { index: false, follow: true } };

export default async function LoginPage() {
  const config = await getAuthConfig();
  return (
    <Suspense>
      <LoginForm config={config} />
    </Suspense>
  );
}
