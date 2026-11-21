'use client';

import type { Payment } from '@nexus/shared';
import { useApi } from '@/components/admin/useApi';
import { Pill } from '@/components/dashboard/DashboardShell';
import { MembershipHeader, longDate, rupees } from '@/components/dashboard/membership';
import { BoltIcon, CrownIcon } from '@/components/icons';

const PAY_LABEL: Record<Payment['status'], string> = {
  created: 'Not finished',
  paid: 'Paid',
  failed: 'Failed',
  refunded: 'Refunded',
};
const PAY_TONE: Record<Payment['status'], string> = {
  created: 'archived',
  paid: 'published',
  failed: 'rejected',
  refunded: 'archived',
};

export default function PaymentsPage() {
  const { data, error, loading } = useApi<{ payments: Payment[] }>('/me/plans');
  const payments = data?.payments ?? [];
  return (
    <div>
      <MembershipHeader title="Payments" text="Every plan and featured listing you paid for." />
      {error && <p className="rounded-lg bg-danger-50 p-3 text-danger">{error}</p>}
      {loading && <div className="skeleton h-48 rounded-[18px]" />}
      {data && payments.length === 0 && (
        <p className="rounded-[18px] border border-dashed border-line-strong bg-white p-8 text-center text-sm text-ink-muted">
          No payments yet. Your plan and featured listing payments will show here.
        </p>
      )}
      {payments.length > 0 && (
        <ul className="divide-y divide-[#f1f4f9] rounded-[18px] border border-[#e6eaf2] bg-white">
          {payments.map((p) => {
            const featured = !!p.property;
            return (
              <li key={p.id} className="flex items-center gap-3 p-4 sm:px-5">
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${featured ? 'bg-accent-50 text-accent-700' : 'bg-brand-50 text-brand'}`}
                >
                  {featured ? <BoltIcon size={18} /> : <CrownIcon size={18} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {p.plan.name}
                    {p.property && (
                      <span className="font-normal text-ink-muted"> · {p.property.title}</span>
                    )}
                  </p>
                  <p className="truncate text-xs text-ink-muted">
                    {longDate(p.paidAt ?? p.createdAt)}
                    {p.paymentId && ` · ${p.paymentId}`}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <b className="tabular text-sm">{rupees(p.amount)}</b>
                  <Pill status={PAY_TONE[p.status]} label={PAY_LABEL[p.status]} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
