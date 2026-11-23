'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ADMIN_PATH, SITE_VISIT_STATUS_LABELS, type SiteVisit } from '@nexus/shared';
import { PageTitle, Skeleton, StatusPill, useAdmin } from '@/components/admin/AdminShell';
import { A } from '@/components/admin/AdminIcons';
import { Modal } from '@/components/admin/Modal';
import { AssigneeSelect, VisitForm, toLocalInput } from '@/components/admin/VisitForm';
import { errMsg, useApi } from '@/components/admin/useApi';
import { apiFetch } from '@/lib/client-api';

const DAY = 86_400_000;

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = (x.getDay() + 6) % 7; // Monday first
  x.setDate(x.getDate() - dow);
  return x;
}

const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const hm = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

export default function VisitsPage() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [who, setWho] = useState<'all' | 'me'>('all');
  const [booking, setBooking] = useState(false);
  const [open, setOpen] = useState<SiteVisit | null>(null);
  const end = new Date(weekStart.getTime() + 7 * DAY);
  const q = new URLSearchParams({
    from: weekStart.toISOString(),
    to: end.toISOString(),
    limit: '500',
    ...(who === 'me' && { assignee: 'me' }),
  });
  const { data, loading, error, reload } = useApi<SiteVisit[]>(`/admin/visits?${q}`);
  const days = Array.from({ length: 7 }, (_, i) => new Date(weekStart.getTime() + i * DAY));
  const today = new Date();
  const label = `${days[0]!.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} – ${days[6]!.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const counts = {
    scheduled: data?.filter((v) => v.status === 'scheduled').length ?? 0,
    done: data?.filter((v) => v.status === 'done').length ?? 0,
  };

  return (
    <>
      <PageTitle
        title="Site visits"
        sub="Book, show and follow up property visits. Book from a lead to link them."
      >
        <button type="button" className="btn btn-primary gap-1.5" onClick={() => setBooking(true)}>
          <A.plus width={16} height={16} />
          Book visit
        </button>
      </PageTitle>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            aria-label="Previous week"
            onClick={() => setWeekStart(new Date(weekStart.getTime() - 7 * DAY))}
          >
            ‹
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setWeekStart(startOfWeek(new Date()))}
          >
            This week
          </button>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            aria-label="Next week"
            onClick={() => setWeekStart(new Date(weekStart.getTime() + 7 * DAY))}
          >
            ›
          </button>
        </div>
        <p className="font-bold">{label}</p>
        <div role="tablist" className="adm-seg ml-auto">
          <button
            type="button"
            role="tab"
            aria-selected={who === 'all'}
            onClick={() => setWho('all')}
          >
            Everyone
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={who === 'me'}
            onClick={() => setWho('me')}
          >
            Mine
          </button>
        </div>
      </div>

      {data && (
        <p className="mb-3 text-sm text-ink-muted">
          <b className="text-ink">{counts.scheduled}</b> to do ·{' '}
          <b className="text-ink">{counts.done}</b> done this week
        </p>
      )}
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-50 p-3 text-danger">
          {error}
        </p>
      )}
      {loading && !data && <Skeleton className="h-80 w-full" />}

      {data && (
        <div className="grid gap-2 lg:grid-cols-7">
          {days.map((d) => {
            const list = data.filter((v) => sameDay(new Date(v.scheduledAt), d));
            const isToday = sameDay(d, today);
            return (
              <section
                key={d.toISOString()}
                className={`card min-h-0 p-2.5 lg:min-h-64 ${isToday ? 'ring-2 ring-brand' : ''} ${list.length === 0 ? 'hidden lg:block' : ''}`}
              >
                <h2 className="mb-2 flex items-baseline justify-between font-sans text-sm font-bold">
                  <span>{d.toLocaleDateString('en-IN', { weekday: 'short' })}</span>
                  <span
                    className={isToday ? 'rounded-md bg-brand px-1.5 text-white' : 'text-ink-muted'}
                  >
                    {d.getDate()}
                  </span>
                </h2>
                <ul className="space-y-1.5">
                  {list.map((v) => (
                    <li key={v.id}>
                      <button
                        type="button"
                        onClick={() => setOpen(v)}
                        className={`w-full rounded-lg border-l-4 bg-surface px-2.5 py-2 text-left text-xs hover:bg-brand-50 ${
                          v.status === 'done'
                            ? 'border-success'
                            : v.status === 'scheduled'
                              ? 'border-brand'
                              : 'border-line-strong opacity-70'
                        }`}
                      >
                        <span className="block font-extrabold">{hm(v.scheduledAt)}</span>
                        <span className="block truncate font-semibold">{v.name}</span>
                        {v.property && (
                          <span className="block truncate text-ink-muted">{v.property.title}</span>
                        )}
                        {v.assignedAdmin && (
                          <span className="block truncate text-ink-muted">
                            → {v.assignedAdmin.name}
                          </span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
          {data.length === 0 && (
            <p className="card p-8 text-center text-sm text-ink-muted lg:hidden">
              No visits this week.
            </p>
          )}
        </div>
      )}

      {booking && <VisitForm onClose={() => setBooking(false)} onDone={reload} />}
      {open && <VisitDetail visit={open} onClose={() => setOpen(null)} onDone={reload} />}
    </>
  );
}

function VisitDetail({
  visit: v,
  onClose,
  onDone,
}: {
  visit: SiteVisit;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast, isSuper } = useAdmin();
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState(v.outcome ?? '');
  const [when, setWhen] = useState(toLocalInput(new Date(v.scheduledAt)));
  const [who, setWho] = useState(v.assignedAdmin?.id ?? '');

  async function save(body: Record<string, unknown>, msg: string) {
    setBusy(true);
    try {
      await apiFetch(`/admin/visits/${v.id}`, { method: 'PATCH', body });
      toast(msg);
      onDone();
      onClose();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title={`Visit: ${v.name}`} onClose={onClose}>
      <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill status={v.status} label={SITE_VISIT_STATUS_LABELS[v.status]} />
          <a className="chip" href={`tel:${v.phone}`}>
            <A.phone width={14} height={14} /> {v.phone}
          </a>
          {v.enquiry && (
            <Link className="chip" href={`${ADMIN_PATH}/enquiries?open=${v.enquiry.id}`}>
              Lead {v.enquiry.leadId}
            </Link>
          )}
        </div>
        {v.property && (
          <p>
            Property:{' '}
            <a
              className="font-semibold text-brand underline"
              href={`/properties/${v.property.slug}`}
              target="_blank"
              rel="noopener"
            >
              {v.property.title}
            </a>
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="vd-when" className="field-label">
              Date and time
            </label>
            <input
              id="vd-when"
              type="datetime-local"
              className="field"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="vd-who" className="field-label">
              Who will show it
            </label>
            <AssigneeSelect id="vd-who" value={who} onChange={setWho} />
          </div>
        </div>
        {(when !== toLocalInput(new Date(v.scheduledAt)) ||
          who !== (v.assignedAdmin?.id ?? '')) && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={busy}
            onClick={() =>
              save(
                {
                  ...(when !== toLocalInput(new Date(v.scheduledAt)) && {
                    scheduledAt: new Date(when).toISOString(),
                  }),
                  ...(who !== (v.assignedAdmin?.id ?? '') && { assignedAdminId: who || null }),
                },
                'Visit updated',
              )
            }
          >
            Save changes
          </button>
        )}
        <div>
          <label htmlFor="vd-out" className="field-label">
            How did it go?
          </label>
          <textarea
            id="vd-out"
            className="field min-h-16"
            maxLength={1000}
            placeholder="Liked it, wants a lower price, will confirm by Monday…"
            value={outcome}
            onChange={(e) => setOutcome(e.target.value)}
          />
        </div>
        {v.notes.length > 0 && (
          <ul className="space-y-1.5">
            {v.notes.map((n, i) => (
              <li key={i} className="rounded-lg bg-surface p-2.5">
                {n.text}
                <span className="block text-xs text-ink-muted">
                  {n.by} · {new Date(n.at).toLocaleString('en-IN')}
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          {isSuper && (
            <button
              type="button"
              className="btn btn-ghost btn-sm mr-auto text-danger"
              disabled={busy}
              onClick={async () => {
                if (!window.confirm('Delete this visit?')) return;
                setBusy(true);
                try {
                  await apiFetch(`/admin/visits/${v.id}`, { method: 'DELETE' });
                  toast('Visit deleted');
                  onDone();
                  onClose();
                } catch (err) {
                  toast(errMsg(err), 'error');
                  setBusy(false);
                }
              }}
            >
              Delete
            </button>
          )}
          {v.status === 'scheduled' ? (
            <>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={busy}
                onClick={() => save({ status: 'cancelled' }, 'Visit cancelled')}
              >
                Cancelled
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={busy}
                onClick={() => save({ status: 'no-show', outcome }, 'Marked no-show')}
              >
                Didn’t come
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={busy}
                onClick={() =>
                  save({ status: 'done', outcome }, 'Visit done, lead moved to qualified')
                }
              >
                Visit done
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={busy}
                onClick={() => save({ outcome }, 'Saved')}
              >
                Save note
              </button>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                disabled={busy}
                onClick={() => save({ status: 'scheduled' }, 'Visit re-opened')}
              >
                Re-open
              </button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}
