'use client';

import { useRef, useState } from 'react';
import { REPORT_REASONS, REPORT_REASON_LABELS, type ReportReason } from '@nexus/shared';
import { ApiClientError, apiFetch } from '@/lib/client-api';
import { CloseIcon, InfoIcon } from '../icons';

/** "Report this listing" link and dialog. Reports go to the admin review queue. */
export function ReportListing({ propertyId }: { propertyId: string }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState<ReportReason | ''>('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!reason) {
      setError('Please choose a reason');
      return;
    }
    const fd = new FormData(e.currentTarget);
    setState('sending');
    setError(null);
    try {
      await apiFetch('/reports', {
        method: 'POST',
        body: {
          propertyId,
          reason,
          details: String(fd.get('details') ?? ''),
          website: String(fd.get('website') ?? ''),
        },
      });
      setState('done');
    } catch (err) {
      setState('idle');
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'Could not send the report. Please try again.',
      );
    }
  }

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-danger hover:underline"
        onClick={() => dialog.current?.showModal()}
      >
        <InfoIcon size={15} /> Report this listing
      </button>
      <dialog
        ref={dialog}
        aria-labelledby="report-title"
        className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl border border-line bg-white p-0 shadow-xl backdrop:bg-black/40"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id="report-title" className="font-sans text-lg font-semibold">
            Report this listing
          </h2>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            aria-label="Close"
            onClick={() => dialog.current?.close()}
          >
            <CloseIcon size={18} />
          </button>
        </div>
        {state === 'done' ? (
          <div className="p-5">
            <p className="font-medium">Thank you. Our team will check this listing.</p>
            <p className="mt-1 text-sm text-ink-muted">
              We may hide it while we confirm the details with the poster.
            </p>
            <button
              type="button"
              className="btn btn-primary mt-5"
              onClick={() => dialog.current?.close()}
            >
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4 p-5">
            <fieldset>
              <legend className="field-label">What is wrong?</legend>
              <div className="space-y-2">
                {REPORT_REASONS.map((r) => (
                  <label key={r} className="flex cursor-pointer items-center gap-2.5 text-sm">
                    <input
                      type="radio"
                      name="reason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="size-4 accent-[var(--color-brand)]"
                    />
                    {REPORT_REASON_LABELS[r]}
                  </label>
                ))}
              </div>
            </fieldset>
            <div>
              <label htmlFor="report-details" className="field-label">
                Details (optional)
              </label>
              <textarea
                id="report-details"
                name="details"
                maxLength={1000}
                className="field"
                placeholder="e.g. I called and the owner said it was rented last month."
              />
            </div>
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="hidden"
            />
            {error && (
              <p role="alert" className="text-sm text-danger">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => dialog.current?.close()}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={state === 'sending'}>
                {state === 'sending' ? 'Sending…' : 'Send report'}
              </button>
            </div>
          </form>
        )}
      </dialog>
    </>
  );
}
