'use client';

import Link from 'next/link';
import { useRef } from 'react';
import { formatINRShort } from '@nexus/shared';
import { ArrowRight, CloseIcon } from '../icons';
import { LoanForm } from './LoanForm';

/** "Need a home loan?" strip under a listing's EMI calculator. Shown only when the feature is on. */
export function LoanCta({
  propertyId,
  propertyTitle,
  price,
  sourcePage,
}: {
  propertyId?: string;
  propertyTitle: string;
  price: number;
  sourcePage: string;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const loan = Math.round((price * 0.8) / 100_000) * 100_000;
  return (
    <>
      <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-accent-100 bg-gradient-to-r from-accent-50 to-white p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <p className="font-semibold">Need a home loan for this property?</p>
          <p className="text-sm text-ink-soft">
            Get a free call back from our loan desk for about {formatINRShort(loan)}.{' '}
            <Link href="/home-loan#rates" className="font-semibold text-brand hover:underline">
              Compare rates
            </Link>
          </p>
        </div>
        <button
          type="button"
          className="btn btn-accent shrink-0"
          onClick={() => dialog.current?.showModal()}
        >
          Get loan help <ArrowRight size={16} />
        </button>
      </div>
      <dialog
        ref={dialog}
        aria-label="Home loan call back"
        className="contact-sheet m-0 mt-auto w-full max-w-none rounded-t-3xl border border-line bg-white p-0 shadow-2xl backdrop:bg-brand-900/55 sm:m-auto sm:w-[30rem] sm:rounded-3xl"
        onClick={(e) => e.target === dialog.current && dialog.current?.close()}
      >
        <div className="relative max-h-[90vh] overflow-y-auto px-5 pb-6 pt-6 sm:px-6">
          <button
            type="button"
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full p-1 text-ink-muted hover:bg-surface"
            onClick={() => dialog.current?.close()}
          >
            <CloseIcon size={20} />
          </button>
          <LoanForm
            propertyId={propertyId}
            propertyTitle={propertyTitle}
            defaultAmount={loan}
            sourcePage={sourcePage}
            title="Get help with your home loan"
            sub={`For “${propertyTitle}”. Our loan desk calls you within one working day.`}
          />
        </div>
      </dialog>
    </>
  );
}
