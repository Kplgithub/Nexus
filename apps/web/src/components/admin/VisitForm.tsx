'use client';

import { useState } from 'react';
import type { AdminRef } from '@nexus/shared';
import { apiFetch } from '@/lib/client-api';
import { useAdmin } from './AdminShell';
import { Modal } from './Modal';
import { errMsg, useApi } from './useApi';

export function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Tomorrow 11:00, a sensible default for a site visit. */
function defaultSlot() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(11, 0, 0, 0);
  return toLocalInput(d);
}

/** Team-member dropdown; "me" first. */
export function AssigneeSelect({
  id,
  value,
  onChange,
  disabled,
  emptyLabel = 'Not assigned',
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  emptyLabel?: string;
}) {
  const { admin } = useAdmin();
  const { data } = useApi<AdminRef[]>('/admin/team/assignees');
  const people = [...(data ?? [])].sort((a, b) =>
    a.id === admin.id ? -1 : b.id === admin.id ? 1 : 0,
  );
  return (
    <select
      id={id}
      className="field"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{emptyLabel}</option>
      {people.map((p) => (
        <option key={p.id} value={p.id}>
          {p.id === admin.id ? `${p.name} (me)` : p.name}
        </option>
      ))}
    </select>
  );
}

export function VisitForm({
  lead,
  onClose,
  onDone,
}: {
  lead?: {
    id: string;
    name: string;
    phone: string;
    assignedAdminId?: string | null;
    propertyTitle?: string | null;
  };
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast, admin } = useAdmin();
  const [f, setF] = useState({
    name: lead?.name ?? '',
    phone: lead?.phone ?? '',
    when: defaultSlot(),
    assignee: lead?.assignedAdminId ?? admin.id,
    note: '',
  });
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await apiFetch('/admin/visits', {
        method: 'POST',
        body: {
          ...(lead && { enquiryId: lead.id }),
          name: f.name,
          phone: f.phone,
          scheduledAt: new Date(f.when).toISOString(),
          assignedAdminId: f.assignee || null,
          ...(f.note.trim() && { note: f.note.trim() }),
        },
      });
      toast('Site visit booked');
      onDone();
      onClose();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Book a site visit" onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        {lead?.propertyTitle && (
          <p className="rounded-lg bg-surface p-3 text-sm">
            Property: <b>{lead.propertyTitle}</b>
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="sv-name" className="field-label">
              Visitor name
            </label>
            <input
              id="sv-name"
              className="field"
              required
              value={f.name}
              onChange={(e) => setF({ ...f, name: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="sv-phone" className="field-label">
              Mobile
            </label>
            <input
              id="sv-phone"
              className="field"
              required
              inputMode="tel"
              value={f.phone}
              onChange={(e) => setF({ ...f, phone: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="sv-when" className="field-label">
              Date and time
            </label>
            <input
              id="sv-when"
              type="datetime-local"
              className="field"
              required
              value={f.when}
              onChange={(e) => setF({ ...f, when: e.target.value })}
            />
          </div>
          <div>
            <label htmlFor="sv-who" className="field-label">
              Who will show it
            </label>
            <AssigneeSelect
              id="sv-who"
              value={f.assignee}
              onChange={(v) => setF({ ...f, assignee: v })}
            />
          </div>
        </div>
        <div>
          <label htmlFor="sv-note" className="field-label">
            Note (optional)
          </label>
          <textarea
            id="sv-note"
            className="field min-h-16"
            maxLength={1000}
            placeholder="Meeting point, keys, what they want to see…"
            value={f.note}
            onChange={(e) => setF({ ...f, note: e.target.value })}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Booking…' : 'Book visit'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
