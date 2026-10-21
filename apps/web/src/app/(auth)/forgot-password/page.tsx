import type { Metadata } from 'next';
import { getAuthConfig } from '@/lib/api';
import { ForgotPasswordForm } from '@/components/auth/ResetForms';

export const metadata: Metadata = {
  title: 'Reset password',
  robots: { index: false, follow: false },
};

export default async function ForgotPasswordPage() {
  return <ForgotPasswordForm config={await getAuthConfig()} />;
}
