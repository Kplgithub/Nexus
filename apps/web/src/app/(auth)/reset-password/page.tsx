import { Suspense } from 'react';
import type { Metadata } from 'next';
import { ResetWithTokenForm } from '@/components/auth/ResetForms';

export const metadata: Metadata = {
  title: 'Choose a new password',
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetWithTokenForm />
    </Suspense>
  );
}
