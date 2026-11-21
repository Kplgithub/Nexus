'use client';

import { useState } from 'react';
import {
  ALERT_EVENTS,
  ALERT_EVENT_LABELS,
  type AlertChannels,
  type AlertSettings,
} from '@nexus/shared';
import { PageTitle, Skeleton, SuperOnly, useAdmin } from '@/components/admin/AdminShell';
import { errMsg, useApi } from '@/components/admin/useApi';
import { apiFetch } from '@/lib/client-api';

type Res = { settings: AlertSettings; channels: AlertChannels };

const lines = (s: string) =>
  s
    .split(/[\n,]+/)
    .map((x) => x.trim())
    .filter(Boolean);

function Inner() {
  const { data, loading, error, reload } = useApi<Res>('/admin/alerts');
  return (
    <>
      <PageTitle
        title="Alerts"
        sub="Who gets told when something happens on the website. Everything also shows in the bell at the top."
      />
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-50 p-3 text-danger">
          {error}
        </p>
      )}
      {loading && !data && <Skeleton className="h-80 w-full" />}
      {data && <AlertsForm key={JSON.stringify(data.settings)} data={data} onSaved={reload} />}
    </>
  );
}

function AlertsForm({ data, onSaved }: { data: Res; onSaved: () => void }) {
  const { toast } = useAdmin();
  const [emails, setEmails] = useState(data.settings.emails.join('\n'));
  const [phones, setPhones] = useState(data.settings.whatsappNumbers.join('\n'));
  const [events, setEvents] = useState(data.settings.events);
  const [busy, setBusy] = useState<'save' | 'test' | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy('save');
    try {
      await apiFetch('/admin/alerts', {
        method: 'PATCH',
        body: {
          emails: lines(emails),
          whatsappNumbers: lines(phones).map((p) =>
            /^\d{10}$/.test(p) ? `+91${p}` : p.replace(/\s/g, ''),
          ),
          events,
        },
      });
      toast('Alert settings saved');
      onSaved();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    setBusy('test');
    try {
      await apiFetch('/admin/alerts/test', { method: 'POST' });
      toast('Test alert sent. Check your email, WhatsApp and the bell.');
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(null);
    }
  }

  const ch = data.channels;
  return (
    <form onSubmit={save} className="grid gap-4 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-4">
        <section className="card p-4 sm:p-5">
          <h2 className="font-sans text-base font-bold">Send alerts for</h2>
          <ul className="mt-3 divide-y divide-line">
            {ALERT_EVENTS.map((ev) => (
              <li key={ev}>
                <label className="flex cursor-pointer items-center justify-between gap-3 py-2.5 text-sm">
                  {ALERT_EVENT_LABELS[ev]}
                  <input
                    type="checkbox"
                    className="h-4 w-4"
                    checked={events[ev]}
                    onChange={(e) => setEvents({ ...events, [ev]: e.target.checked })}
                  />
                </label>
              </li>
            ))}
          </ul>
        </section>
        <section className="card grid gap-4 p-4 sm:grid-cols-2 sm:p-5">
          <div>
            <label htmlFor="al-em" className="field-label">
              Email to (one per line)
            </label>
            <textarea
              id="al-em"
              className="field min-h-28"
              placeholder="sales@nexusestate.in"
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="al-wa" className="field-label">
              WhatsApp to (one per line)
            </label>
            <textarea
              id="al-wa"
              className="field min-h-28"
              placeholder="+919521750202"
              value={phones}
              onChange={(e) => setPhones(e.target.value)}
            />
            <p className="mt-1 text-xs text-ink-muted">A 10-digit Indian number gets +91 added.</p>
          </div>
        </section>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn btn-outline" disabled={busy !== null} onClick={test}>
            {busy === 'test' ? 'Sending…' : 'Send a test'}
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy !== null}>
            {busy === 'save' ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      <aside className="card h-fit p-4 sm:p-5">
        <h2 className="font-sans text-base font-bold">Channels</h2>
        <ul className="mt-3 space-y-3 text-sm">
          <li className="flex items-start gap-2">
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ch.email ? 'bg-success' : 'bg-warn'}`}
              aria-hidden
            />
            <span>
              <b>Email</b> {ch.email ? 'is on' : 'is off'}
              {!ch.email && (
                <span className="block text-ink-muted">
                  The server email account is not set up yet.
                </span>
              )}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${ch.whatsapp ? 'bg-success' : 'bg-warn'}`}
              aria-hidden
            />
            <span>
              <b>WhatsApp</b> {ch.whatsapp ? 'is on' : 'is off'}
              {!ch.whatsapp && (
                <span className="block text-ink-muted">
                  Needs a WhatsApp Business account connected on the server.
                </span>
              )}
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-success" aria-hidden />
            <span>
              <b>Bell</b> is always on
            </span>
          </li>
        </ul>
      </aside>
    </form>
  );
}

export default function AlertsPage() {
  return (
    <SuperOnly>
      <Inner />
    </SuperOnly>
  );
}
