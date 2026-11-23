'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect } from 'react';
import { ADMIN_PATH, type PaymentInvoice } from '@nexus/shared';
import { useApi } from '@/components/admin/useApi';

const money = (n: number) =>
  `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

const METHOD: Record<PaymentInvoice['payment']['method'], string> = {
  online: 'Paid online (Razorpay)',
  manual: 'Paid by cash, UPI or bank transfer',
};

/** A printable A4 invoice or receipt. "Download PDF" uses the browser's Save as PDF. */
export function InvoiceView({ id, admin }: { id: string; admin: boolean }) {
  const {
    data: inv,
    error,
    loading,
  } = useApi<PaymentInvoice>(
    admin ? `/admin/payments/${id}/invoice` : `/me/payments/${id}/invoice`,
  );
  const tax = inv?.kind === 'tax-invoice';
  const title = tax ? 'Tax invoice' : 'Payment receipt';

  // The saved PDF takes its file name from the page title.
  useEffect(() => {
    if (inv) document.title = `NEXUS ${title} ${inv.number.replaceAll('/', '-')}`;
  }, [inv, title]);

  const back = admin ? `${ADMIN_PATH}/payments` : '/dashboard/payments';

  return (
    <div className="min-h-dvh bg-[#eef1f6] px-3 py-5 sm:px-6 sm:py-8 print:bg-white print:p-0">
      <style>{`@page { size: A4; margin: 12mm; }`}</style>
      <div className="mx-auto mb-4 flex max-w-[800px] flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={back} className="text-sm font-semibold text-brand hover:underline">
          ← Back to payments
        </Link>
        {inv && (
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            Download PDF
          </button>
        )}
      </div>

      {loading && (
        <div className="skeleton mx-auto h-[70vh] max-w-[800px] rounded-2xl" aria-label="Loading" />
      )}
      {error && (
        <div className="mx-auto max-w-[800px] rounded-2xl bg-white p-8 text-center">
          <p className="font-semibold">This invoice could not be opened.</p>
          <p className="mt-1 text-sm text-ink-muted">{error}</p>
          <Link
            href={admin ? `${ADMIN_PATH}/login` : '/login?next=/dashboard/payments'}
            className="btn btn-outline mt-4"
          >
            Log in again
          </Link>
        </div>
      )}

      {inv && (
        <article className="relative mx-auto max-w-[800px] overflow-hidden rounded-2xl bg-white p-5 text-[13px] leading-relaxed text-ink shadow-sm sm:p-10 print:max-w-none print:rounded-none print:p-0 print:shadow-none">
          {inv.status === 'refunded' && (
            <span className="absolute right-6 top-28 rotate-[-12deg] rounded-lg border-2 border-danger px-3 py-1 text-lg font-bold uppercase tracking-wider text-danger opacity-80">
              Refunded
            </span>
          )}

          <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
            <div className="flex items-start gap-3">
              <Image
                src="/brand/nexus-logo.png"
                alt="NEXUS Estate"
                width={68}
                height={56}
                className="shrink-0"
              />
              <div>
                <p className="text-base font-bold">{inv.seller.legalName}</p>
                {inv.seller.address && (
                  <p className="max-w-[300px] text-ink-soft">{inv.seller.address}</p>
                )}
                <p className="text-ink-soft">
                  {inv.seller.phone}
                  {inv.seller.email && ` · ${inv.seller.email}`}
                </p>
                {inv.seller.gstin && (
                  <p className="font-semibold">
                    GSTIN: {inv.seller.gstin}
                    <span className="font-normal text-ink-soft"> · {inv.seller.state}</span>
                  </p>
                )}
              </div>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xl font-bold uppercase tracking-wide text-brand">{title}</p>
              <p>
                <span className="text-ink-muted">No. </span>
                <b>{inv.number}</b>
              </p>
              <p>
                <span className="text-ink-muted">Date </span>
                {day(inv.date)}
              </p>
            </div>
          </header>

          <section className="grid gap-4 border-b border-line py-5 sm:grid-cols-2">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Billed to
              </p>
              <p className="font-semibold">{inv.buyer.name}</p>
              {inv.buyer.company && <p>{inv.buyer.company}</p>}
              <p className="text-ink-soft">
                {inv.buyer.phone}
                {inv.buyer.email && ` · ${inv.buyer.email}`}
              </p>
              {(inv.buyer.city || inv.buyer.state) && (
                <p className="text-ink-soft">
                  {[inv.buyer.city, inv.buyer.state].filter(Boolean).join(', ')}
                </p>
              )}
            </div>
            <div className="sm:text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-ink-muted">
                Payment
              </p>
              <p>{METHOD[inv.payment.method]}</p>
              {inv.payment.paymentId && (
                <p className="break-all text-ink-soft">Payment ID: {inv.payment.paymentId}</p>
              )}
              {inv.payment.reference && (
                <p className="break-all text-ink-soft">Reference: {inv.payment.reference}</p>
              )}
            </div>
          </section>

          <table className="mt-5 w-full border-collapse">
            <thead>
              <tr className="bg-brand-50 text-left text-[11px] uppercase tracking-wider text-ink-soft print:bg-[#eef3fb]">
                <th className="rounded-l-lg px-3 py-2 font-bold">Description</th>
                {tax && <th className="px-3 py-2 font-bold">SAC</th>}
                <th className="rounded-r-lg px-3 py-2 text-right font-bold">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr className="align-top">
                <td className="px-3 py-3">
                  <p className="font-semibold">{inv.item.description}</p>
                  {inv.item.detail && <p className="text-ink-soft">{inv.item.detail}</p>}
                  {inv.item.from && inv.item.to && (
                    <p className="text-ink-soft">
                      Valid {day(inv.item.from)} – {day(inv.item.to)}
                    </p>
                  )}
                </td>
                {tax && <td className="px-3 py-3">{inv.item.sacCode ?? '—'}</td>}
                <td className="px-3 py-3 text-right tabular">{money(inv.taxable)}</td>
              </tr>
            </tbody>
          </table>

          <div className="mt-2 flex justify-end border-t border-line pt-3">
            <dl className="grid w-full max-w-[300px] grid-cols-[1fr_auto] gap-x-6 gap-y-1">
              {tax && (
                <>
                  <dt className="text-ink-soft">Taxable value</dt>
                  <dd className="text-right tabular">{money(inv.taxable)}</dd>
                  {inv.igst > 0 ? (
                    <>
                      <dt className="text-ink-soft">IGST {inv.gstRate}%</dt>
                      <dd className="text-right tabular">{money(inv.igst)}</dd>
                    </>
                  ) : (
                    <>
                      <dt className="text-ink-soft">CGST {inv.gstRate / 2}%</dt>
                      <dd className="text-right tabular">{money(inv.cgst)}</dd>
                      <dt className="text-ink-soft">SGST {inv.gstRate / 2}%</dt>
                      <dd className="text-right tabular">{money(inv.sgst)}</dd>
                    </>
                  )}
                </>
              )}
              <div className="col-span-2 mt-1 border-t border-line" />
              <dt className="pt-1 text-base font-bold">Total paid</dt>
              <dd className="pt-1 text-right text-base font-bold tabular">{money(inv.total)}</dd>
            </dl>
          </div>
          <p className="mt-3 text-right text-ink-soft">{inv.totalInWords}</p>

          <footer className="mt-8 border-t border-line pt-4 text-[12px] text-ink-muted">
            {tax && <p>Prices include GST. </p>}
            <p>
              This is a computer generated {tax ? 'invoice' : 'receipt'} and needs no signature.
            </p>
            <p>Thank you for choosing {inv.seller.name}.</p>
          </footer>
        </article>
      )}
    </div>
  );
}
