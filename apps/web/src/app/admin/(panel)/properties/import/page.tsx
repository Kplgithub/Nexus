'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ADMIN_PATH, formatPrice } from '@nexus/shared';
import { PageTitle, useAdmin } from '@/components/admin/AdminShell';
import { errMsg } from '@/components/admin/useApi';
import { apiFetch } from '@/lib/client-api';

type RowResult =
  | {
      row: number;
      ok: true;
      title: string;
      locality: string;
      price: number;
      listingType: 'rent' | 'sale';
      id?: string;
    }
  | { row: number; ok: false; errors: string[] };

type ImportResult = { total: number; valid: number; created: number; results: RowResult[] };

/**
 * Bulk import of a broker's or owner's stock from a CSV sheet. Step 1 checks
 * the sheet; step 2 saves the valid rows as drafts. Photos are added per
 * listing in the editor before publishing.
 */
export default function ImportPropertiesPage() {
  const { toast, can } = useAdmin();
  const [file, setFile] = useState<File | null>(null);
  const [checked, setChecked] = useState<ImportResult | null>(null);
  const [saved, setSaved] = useState<ImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  async function send(dryRun: boolean) {
    if (!file) return;
    setBusy(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await apiFetch<ImportResult>(
        `/admin/properties/import${dryRun ? '?dryRun=1' : ''}`,
        { method: 'POST', form },
      );
      if (dryRun) setChecked(data);
      else {
        setSaved(data);
        toast(`${data.created} listing(s) saved as drafts`);
      }
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  const result = saved ?? checked;
  const bad = result?.results.filter((r) => !r.ok) ?? [];

  return (
    <div className="max-w-4xl">
      <PageTitle title="Import listings from a sheet">
        <Link href={`${ADMIN_PATH}/properties`} className="btn btn-outline">
          Back to properties
        </Link>
      </PageTitle>

      <ol className="card mb-6 list-decimal space-y-2 p-5 pl-9 text-sm text-ink-soft">
        <li>
          <a
            className="font-semibold text-brand underline"
            href="/api/v1/admin/properties/import/template"
          >
            Download the template
          </a>{' '}
          and fill one row per property (Excel or Google Sheets). Keep the header row. Only{' '}
          <b>locality</b>, <b>rent_or_price</b> and <b>area</b> are required; title and description
          are written for you if left empty.
        </li>
        <li>
          Save it as <b>CSV (UTF-8)</b> and upload it below. Check first, then import. Up to 200
          rows per file.
        </li>
        <li>
          Every row is saved as a <b>draft</b>. Open each one, add the broker&apos;s or owner&apos;s
          own photos, and publish. Use only photos you have permission to use.
        </li>
      </ol>

      <div className="card mb-6 flex flex-wrap items-center gap-3 p-5">
        <input
          type="file"
          accept=".csv,text/csv"
          aria-label="CSV file"
          onChange={(e) => {
            setFile(e.target.files?.[0] ?? null);
            setChecked(null);
            setSaved(null);
          }}
          className="text-sm"
        />
        <button
          type="button"
          className="btn btn-outline"
          disabled={!file || busy || !can('editor')}
          onClick={() => send(true)}
        >
          {busy && !checked ? 'Checking…' : 'Check sheet'}
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={!checked || !checked.valid || busy || !!saved || !can('editor')}
          onClick={() => send(false)}
        >
          {busy && checked ? 'Importing…' : `Import ${checked?.valid ?? ''} as drafts`}
        </button>
      </div>

      {result && (
        <section className="card p-5" aria-live="polite">
          <p className="font-semibold">
            {saved
              ? `${saved.created} of ${saved.total} rows saved as drafts.`
              : `${checked!.valid} of ${checked!.total} rows are ready to import.`}
            {bad.length > 0 && ` ${bad.length} row(s) need fixing and will be skipped.`}
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-ink-muted">
                <tr>
                  <th className="py-2 pr-3">Row</th>
                  <th className="py-2 pr-3">Listing</th>
                  <th className="py-2 pr-3">Price</th>
                  <th className="py-2">Result</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((r) => (
                  <tr key={r.row} className="border-t border-line align-top">
                    <td className="py-2 pr-3">{r.row}</td>
                    {r.ok ? (
                      <>
                        <td className="py-2 pr-3">{r.title}</td>
                        <td className="py-2 pr-3">{formatPrice(r.price, r.listingType)}</td>
                        <td className="py-2">
                          {r.id ? (
                            <Link
                              href={`${ADMIN_PATH}/properties/${r.id}`}
                              className="text-brand underline"
                            >
                              Add photos
                            </Link>
                          ) : (
                            <span className="text-success">Ready</span>
                          )}
                        </td>
                      </>
                    ) : (
                      <td colSpan={3} className="py-2 text-danger">
                        {r.errors.join(' · ')}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
