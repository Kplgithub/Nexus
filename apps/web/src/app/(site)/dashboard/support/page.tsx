'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  SUPPORT_MAX_IMAGES,
  SUPPORT_STATUS_LABELS,
  SUPPORT_TOPICS,
  SUPPORT_TOPIC_LABELS,
  canListProperty,
  type OwnListing,
  type SupportTicket,
  type SupportTicketSummary,
  type SupportTopic,
} from '@nexus/shared';
import { errMsg, useApi } from '@/components/admin/useApi';
import { useDashboardData } from '@/components/dashboard/DashboardShell';
import { useSession } from '@/components/session/SessionProvider';
import { apiFetch } from '@/lib/client-api';
import {
  ChatIcon,
  CloseIcon,
  HomeIcon,
  ImageIcon,
  InboxIcon,
  InfoIcon,
  KeyIcon,
  ReceiptIcon,
  SendIcon,
  ShieldIcon,
} from '@/components/icons';

const TOPIC_ICON: Record<SupportTopic, typeof HomeIcon> = {
  listing: HomeIcon,
  payment: ReceiptIcon,
  account: KeyIcon,
  leads: InboxIcon,
  report: ShieldIcon,
  other: InfoIcon,
};

const STATUS_TONE: Record<string, string> = {
  open: 'bg-accent-50 text-accent-700',
  'in-progress': 'bg-brand-50 text-brand',
  resolved: 'bg-success-50 text-success',
};

const when = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const time = d.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return `Today, ${time}`;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

function StatusChip({ status }: { status: SupportTicketSummary['status'] }) {
  return (
    <span
      className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11.5px] font-bold ${STATUS_TONE[status]}`}
    >
      {SUPPORT_STATUS_LABELS[status]}
    </span>
  );
}

/** Picks up to SUPPORT_MAX_IMAGES screenshots and uploads them. */
function useScreenshots() {
  const [urls, setUrls] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function add(files: FileList | null) {
    if (!files?.length) return;
    const room = SUPPORT_MAX_IMAGES - urls.length;
    const form = new FormData();
    [...files].slice(0, room).forEach((f) => form.append('files', f));
    setBusy(true);
    setError('');
    try {
      const { data } = await apiFetch<{ urls: string[] }>('/me/support-uploads', {
        method: 'POST',
        form,
      });
      setUrls((u) => [...u, ...data.urls].slice(0, SUPPORT_MAX_IMAGES));
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }
  return {
    urls,
    busy,
    error,
    add,
    remove: (u: string) => setUrls((x) => x.filter((y) => y !== u)),
    clear: () => setUrls([]),
  };
}

function Screenshots({ shots }: { shots: ReturnType<typeof useScreenshots> }) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div>
      {shots.urls.length > 0 && (
        <ul className="mb-2 flex flex-wrap gap-2">
          {shots.urls.map((u) => (
            <li key={u} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={u}
                alt="Screenshot"
                className="h-16 w-16 rounded-lg border border-line object-cover"
              />
              <button
                type="button"
                aria-label="Remove screenshot"
                onClick={() => shots.remove(u)}
                className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-ink text-white"
              >
                <CloseIcon size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
      {shots.urls.length < SUPPORT_MAX_IMAGES && (
        <button
          type="button"
          disabled={shots.busy}
          onClick={() => input.current?.click()}
          className="flex items-center gap-2 whitespace-nowrap text-[13px] font-semibold text-ink-soft hover:text-brand disabled:opacity-60"
        >
          <ImageIcon size={16} />
          {shots.busy ? 'Uploading…' : 'Add screenshot (optional)'}
        </button>
      )}
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => {
          void shots.add(e.target.files);
          e.target.value = '';
        }}
      />
      {shots.error && <p className="field-error mt-1">{shots.error}</p>}
    </div>
  );
}

function NewRequest({ onCreated }: { onCreated: (t: SupportTicket) => void }) {
  const { user } = useSession();
  const lister = !!user && canListProperty(user.role);
  const listings = useApi<OwnListing[]>(lister ? '/me/properties' : null);
  const [topic, setTopic] = useState<SupportTopic | null>(null);
  const [propertyId, setPropertyId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const shots = useScreenshots();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!topic && message.trim().length < 5) {
      setError('Choose a topic or write a few words about the problem.');
      return;
    }
    setSending(true);
    setError('');
    try {
      const { data } = await apiFetch<SupportTicket>('/me/support', {
        method: 'POST',
        body: {
          topic,
          message: message.trim(),
          propertyId: propertyId || null,
          images: shots.urls,
        },
      });
      setTopic(null);
      setPropertyId('');
      setMessage('');
      shots.clear();
      onCreated(data);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="min-w-0 rounded-2xl border border-[#e6eaf2] bg-white p-5 sm:p-6"
    >
      <h2 className="text-[1.45rem] leading-tight">Raise a new request</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Choose a topic, write a few lines, or both. Our team replies right here.
      </p>

      <fieldset className="mt-5">
        <legend className="mb-2 text-[13px] font-bold">What is it about?</legend>
        <div className="grid grid-cols-2 gap-2.5">
          {SUPPORT_TOPICS.map((t) => {
            const Icon = TOPIC_ICON[t];
            const on = topic === t;
            return (
              <button
                key={t}
                type="button"
                aria-pressed={on}
                onClick={() => setTopic(on ? null : t)}
                className={`flex items-center gap-2.5 rounded-[14px] border-[1.5px] p-2.5 text-left text-[12.5px] font-semibold leading-snug transition-colors sm:p-3 sm:text-[13.5px] ${
                  on
                    ? 'border-brand bg-brand-50 text-brand-800'
                    : 'border-line bg-white text-ink hover:border-brand/40'
                }`}
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-[10px] ${on ? 'bg-brand text-white' : 'bg-[#f1f5f9] text-ink-soft'}`}
                >
                  <Icon size={16} />
                </span>
                {SUPPORT_TOPIC_LABELS[t]}
              </button>
            );
          })}
        </div>
      </fieldset>

      {lister && (listings.data?.length ?? 0) > 0 && (
        <div className="mt-5">
          <label htmlFor="sp-listing" className="field-label">
            Which listing? <span className="font-medium text-ink-muted">(optional)</span>
          </label>
          <select
            id="sp-listing"
            className="field"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
          >
            <option value="">Not about a listing</option>
            {listings.data!.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title} · {l.locality.name}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-5">
        <label htmlFor="sp-message" className="field-label">
          Tell us more{' '}
          <span className="font-medium text-ink-muted">(optional if you chose a topic)</span>
        </label>
        <textarea
          id="sp-message"
          className="field min-h-[110px]"
          maxLength={2000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="For example: my listing shows Under review since Monday."
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Screenshots shots={shots} />
        <button type="submit" disabled={sending || shots.busy} className="btn btn-accent gap-2">
          <SendIcon size={16} />
          {sending ? 'Sending…' : 'Send to support'}
        </button>
      </div>
      {error && (
        <p role="alert" className="field-error mt-3">
          {error}
        </p>
      )}
    </form>
  );
}

function Conversation({
  id,
  onClose,
  onChanged,
}: {
  id: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { data, error, loading, reload } = useApi<SupportTicket>(`/me/support/${id}`);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const shots = useScreenshots();

  // Opening a request clears its "new reply" mark in the list and menu.
  useEffect(() => {
    if (data) onChanged();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  useEffect(() => {
    box.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [id]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    setSendError('');
    try {
      await apiFetch(`/me/support/${id}/reply`, {
        method: 'POST',
        body: { message: text.trim(), images: shots.urls },
      });
      setText('');
      shots.clear();
      reload();
      onChanged();
    } catch (err) {
      setSendError(errMsg(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div ref={box} className="scroll-mt-32 rounded-2xl border border-[#e6eaf2] bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[15px] font-bold">{data?.subject ?? 'Request'}</p>
          {data && (
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              <StatusChip status={data.status} />
              <span>
                {data.ticketId}
                {data.topic ? ` · ${SUPPORT_TOPIC_LABELS[data.topic]}` : ''} ·{' '}
                {when(data.createdAt)}
              </span>
            </div>
          )}
        </div>
        <button type="button" aria-label="Close" onClick={onClose} className="btn btn-ghost btn-sm">
          <CloseIcon size={16} />
        </button>
      </div>

      {error && <p className="mt-3 rounded-lg bg-danger-50 p-3 text-sm text-danger">{error}</p>}
      {loading && !data && <div className="skeleton mt-4 h-32 rounded-xl" />}
      {data?.property && (
        <p className="mt-3 text-xs text-ink-muted">
          Listing:{' '}
          <Link href={`/properties/${data.property.slug}`} className="font-semibold text-brand">
            {data.property.title}
          </Link>
        </p>
      )}

      {data && (
        <ul className="mt-4 flex flex-col gap-3">
          {data.messages.map((m, i) => (
            <li
              key={i}
              className={`flex items-end gap-2 ${m.from === 'user' ? 'justify-end' : ''}`}
            >
              {m.from === 'admin' && (
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-900 text-[10px] font-extrabold text-white">
                  NX
                </span>
              )}
              <div
                className={`max-w-[82%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                  m.from === 'user'
                    ? 'rounded-br-md bg-brand text-white'
                    : 'rounded-bl-md bg-[#f1f5f9] text-ink'
                }`}
              >
                {m.from === 'admin' && (
                  <p className="mb-1 text-xs font-bold text-brand">NEXUS Support · {m.by}</p>
                )}
                {m.text}
                {m.images.length > 0 && (
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    {m.images.map((u) => (
                      <a key={u} href={u} target="_blank" rel="noopener noreferrer">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={u}
                          alt="Screenshot"
                          className="h-16 w-16 rounded-lg object-cover"
                        />
                      </a>
                    ))}
                  </span>
                )}
                <span className="mt-1 block text-[11px] opacity-70">{when(m.at)}</span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {data && (
        <form onSubmit={send} className="mt-4">
          {data.status === 'resolved' && (
            <p className="mb-2 text-xs text-ink-muted">
              This request is resolved. Write again if you still need help and it opens again.
            </p>
          )}
          <div className="flex items-end gap-2 rounded-[14px] border-[1.5px] border-line p-1.5 pl-3 focus-within:border-brand">
            <textarea
              aria-label="Write a reply"
              rows={1}
              maxLength={2000}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a reply…"
              className="max-h-40 min-h-[38px] flex-1 resize-y bg-transparent py-2 text-sm outline-none"
            />
            <button
              type="submit"
              disabled={sending || !text.trim()}
              className="btn btn-primary btn-sm h-9"
            >
              {sending ? 'Sending…' : 'Send'}
            </button>
          </div>
          <div className="mt-2">
            <Screenshots shots={shots} />
          </div>
          {sendError && <p className="field-error mt-2">{sendError}</p>}
        </form>
      )}
    </div>
  );
}

function SupportInner({ initialOpen }: { initialOpen: string | null }) {
  const { user } = useSession();
  const { reloadSupport } = useDashboardData();
  const list = useApi<{ items: SupportTicketSummary[]; unread: number }>('/me/support');
  const [open, setOpen] = useState<string | null>(initialOpen);
  const [thanks, setThanks] = useState('');
  const first = user?.name.split(/\s+/)[0] ?? '';

  const refresh = () => {
    list.reload();
    reloadSupport();
  };

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="rounded-[22px] bg-gradient-to-r from-brand-900 via-brand-800 to-brand px-5 py-5 text-white sm:px-7 sm:py-6">
        <p className="text-[13px] text-white/75">Help & support</p>
        <h1 className="mt-0.5 text-[1.6rem] leading-tight text-white sm:text-[2rem]">
          How can we help{first ? `, ${first}` : ''}?
        </h1>
        <p className="mt-1.5 text-sm text-white/85">
          Tell us what went wrong. You can follow every reply on this page.
        </p>
      </div>

      {thanks && (
        <p
          role="status"
          className="rounded-xl bg-success-50 p-3 text-sm font-semibold text-success"
        >
          {thanks}
        </p>
      )}

      <div className="grid min-w-0 items-start gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <NewRequest
          onCreated={(t) => {
            setThanks(`Request ${t.ticketId} sent. We will reply here soon.`);
            setOpen(t.id);
            refresh();
          }}
        />

        <div className="flex min-w-0 flex-col gap-5">
          {open && (
            <Conversation key={open} id={open} onClose={() => setOpen(null)} onChanged={refresh} />
          )}

          <div className="rounded-2xl border border-[#e6eaf2] bg-white pt-5">
            <div className="flex items-baseline justify-between px-5 pb-2">
              <h2 className="text-[1.35rem] leading-tight">My requests</h2>
              {list.data && (
                <span className="text-[13px] text-ink-muted">{list.data.items.length} total</span>
              )}
            </div>
            {list.error && (
              <p className="m-5 rounded-lg bg-danger-50 p-3 text-danger">{list.error}</p>
            )}
            {list.loading && !list.data && (
              <div className="flex flex-col gap-3 p-5">
                <div className="skeleton h-14 rounded-xl" />
                <div className="skeleton h-14 rounded-xl" />
              </div>
            )}
            {list.data?.items.length === 0 && (
              <p className="flex flex-col items-center gap-2 px-5 pb-8 pt-4 text-center text-sm text-ink-muted">
                <ChatIcon size={28} className="text-brand/60" />
                No requests yet. Anything you send shows up here.
              </p>
            )}
            <ul>
              {list.data?.items.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(t.id)}
                    aria-current={open === t.id ? 'true' : undefined}
                    className={`block w-full border-t border-[#eef1f6] px-5 py-3.5 text-left hover:bg-[#f8f9fd] ${open === t.id ? 'bg-[#f5f7ff] shadow-[inset_3px_0_0_#f97316]' : ''}`}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-ink-muted">
                        {t.ticketId}
                        {t.topic ? ` · ${SUPPORT_TOPIC_LABELS[t.topic]}` : ''}
                      </span>
                      <StatusChip status={t.status} />
                    </span>
                    <span className="mt-1 block truncate text-sm font-bold">{t.subject}</span>
                    <span className="mt-1 flex items-center justify-between gap-2 text-xs text-ink-muted">
                      {when(t.lastMessageAt)}
                      {t.unread && (
                        <span className="flex items-center gap-1.5 font-bold text-accent-700">
                          <span className="h-2 w-2 rounded-full bg-accent" />
                          New reply from NEXUS
                        </span>
                      )}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function WithParams() {
  // Opened from a link, e.g. /dashboard/support?open=…
  const open = useSearchParams().get('open');
  const id = open && /^[a-f0-9]{24}$/i.test(open) ? open : null;
  return <SupportInner key={id ?? 'list'} initialOpen={id} />;
}

export default function SupportPage() {
  return (
    <Suspense fallback={<div className="skeleton h-64 rounded-2xl" />}>
      <WithParams />
    </Suspense>
  );
}
