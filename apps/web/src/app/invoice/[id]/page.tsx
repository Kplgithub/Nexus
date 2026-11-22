import type { Metadata } from 'next';
import { InvoiceView } from '@/components/dashboard/InvoiceView';

export const metadata: Metadata = {
  title: 'Invoice',
  robots: { index: false, follow: false },
};

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ admin?: string }>;
}) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  return <InvoiceView id={id} admin={sp.admin === '1'} />;
}
