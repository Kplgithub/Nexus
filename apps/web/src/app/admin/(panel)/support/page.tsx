'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useRef, useState } from 'react';
import {
  ADMIN_PATH,
  SUPPORT_STATUSES,
  SUPPORT_STATUS_LABELS,
  SUPPORT_TOPICS,
  SUPPORT_TOPIC_LABELS,
  USER_ROLES,
  USER_ROLE_LABELS,
  formatIndianPhone,
  type AdminSupportCounts,
  type AdminSupportTicket,
  type SupportStatus,
  type SupportTicketSummary,
  type UserRole,
} from '@nexus/shared';
import { PageTitle, Skeleton, useAdmin } from '@/components/admin/AdminShell';
import { A } from '@/components/admin/AdminIcons';
import { errMsg, useApi } from '@/components/admin/useApi';
import { apiFetch } from '@/lib/client-api';

type ListData = { items: SupportTicketSummary[]; counts: AdminSupportCounts };

const ROLE_TONE: Record<UserRole, { chip: string; avatar: string }> = {
  seeker: { chip: 'bg-sky-50 text-sky-700', avatar: 'bg-sky-700' },
  individual: { chip: 'bg-amber-50 text-amber-800', avatar: 'bg-amber-800' },
  agent: { chip: 'bg-violet-50 text-violet-700', avatar: 'bg-violet-700' },
  builder: { chip: 'bg-emerald-50 text-emerald-800', avatar: 'bg-emerald-800' },
};
const STATUS_TONE: Record<SupportStatus, string> = {
  open: 'bg-accent-50 text-accent-700',
  'in-progress': 'bg-brand-50 text-brand',
  resolved: 'bg-success-50 text-success',
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

function ago(iso: string) {
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)} min`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr`;
  if (s < 2 * 86400) return 'Yesterday';
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
const stamp = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
const who = (u: SupportTicketSummary['user']) =>
  u.companyName && u.role !== 'seeker' && u.role !== 'individual'
    ? `${u.name} · ${u.companyName}`
    : u.name;
const fmtMins = (m: number | null) => {
  if (m == null) return '–';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 48 ? `${h}h ${m % 60}m` : `${Math.round(h / 24)} days`;
};

function RoleChip({ role }: { role: UserRole }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-bold ${ROLE_TONE[role].chip}`}>
      {USER_ROLE_LABELS[role]}
    </span>
  );
}
function StatusChip({ status }: { status: SupportStatus }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11.5px] font-bold ${STATUS_TONE[status]}`}>
      {SUPPORT_STATUS_LABELS[status]}
    </span>
  );
}
function Av({ name, role, size = 36 }: { name: string; role: UserRole; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full font-extrabold text-white ${ROLE_TONE[role].avatar}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials(name)}
    </span>
  );
}

function TicketPanel({
  id,
  onBack,
  onChanged,
}: {
  id: string;
  onBack: () => void;
  onChanged: () => void;
}) {
  const { toast } = useAdmin();
  const { data, error, reload } = useApi<AdminSupportTicket>(`/admin/support/${id}`);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data) onChanged();
    // On a phone the request replaces the list, so start at its top.
    if (data && window.matchMedia('(max-width: 1023px)').matches)
      top.current?.scrollIntoView({ block: 'start' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  async function send(body: { message?: string; status?: SupportStatus }) {
    setBusy(true);
    try {
      await apiFetch(`/admin/support/${id}/reply`, { method: 'POST', body });
      if (body.message) setText('');
      toast(body.message ? 'Reply sent' : `Marked ${SUPPORT_STATUS_LABELS[body.status!]}`);
      reload();
      onChanged();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  if (error) return <p className="m-5 rounded-lg bg-danger-50 p-3 text-danger">{error}</p>;
  if (!data)
    return (
      <div className="flex flex-col gap-3 p-5">
        <Skeleton className="h-12 w-2/3" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  const phoneDigits = data.user.phone.replace(/\D/g, '');

  return (
    <div ref={top} className="scroll-mt-20 p-4 sm:p-5">
      <button
        type="button"
        onClick={onBack}
        className="mb-3 flex items-center gap-1 text-sm font-bold text-brand lg:hidden"
      >
        ‹ All requests
      </button>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Av name={data.user.name} role={data.user.role} size={44} />
          <div className="min-w-0">
            <p className="truncate text-base font-bold">{who(data.user)}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-muted">
              <RoleChip role={data.user.role} />
              <span>{formatIndianPhone(data.user.phone)}</span>
              {data.userInfo?.premiumUntil && new Date(data.userInfo.premiumUntil) > new Date() && (
                <span>· Premium plan</span>
              )}
              <Link
                href={`${ADMIN_PATH}/users/${data.user.id}`}
                className="font-semibold text-brand"
              >
                Profile
              </Link>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <a href={`tel:${data.user.phone}`} className="btn btn-outline btn-sm gap-1.5">
            <A.phone width={15} height={15} /> Call
          </a>
          <a
            href={`https://wa.me/${phoneDigits}`}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm text-success"
          >
            WhatsApp
          </a>
        </div>
      </div>

      <div className="mt-4 rounded-2xl border border-line bg-[#fafbfe] p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-[12.5px] text-ink-muted">
          <StatusChip status={data.status} />
          <span>
            {data.ticketId}
            {data.topic ? ` · ${SUPPORT_TOPIC_LABELS[data.topic]}` : ''} · Opened{' '}
            {stamp(data.createdAt)}
          </span>
          {data.property && (
            <Link
              href={`/properties/${data.property.slug}`}
              target="_blank"
              className="font-semibold text-brand"
            >
              {data.property.title}
            </Link>
          )}
        </div>
        <ul className="flex flex-col gap-3">
          {data.messages.map((m, i) => (
            <li
              key={i}
              className={`flex items-end gap-2 ${m.from === 'admin' ? 'justify-end' : ''}`}
            >
              {m.from === 'user' && <Av name={data.user.name} role={data.user.role} size={28} />}
              <div
                className={`max-w-[82%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                  m.from === 'admin'
                    ? 'rounded-br-md bg-brand text-white'
                    : 'rounded-bl-md border border-line bg-white'
                }`}
              >
                {m.from === 'admin' && (
                  <p className="mb-1 text-xs font-bold text-white/75">NEXUS Support · {m.by}</p>
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
                          className="h-20 w-20 rounded-lg object-cover"
                        />
                      </a>
                    ))}
                  </span>
                )}
                <span className="mt-1 block text-[11px] opacity-70">{stamp(m.at)}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) void send({ message: text.trim() });
        }}
        className="mt-4"
      >
        <label htmlFor="sp-reply" className="sr-only">
          Reply
        </label>
        <textarea
          id="sp-reply"
          className="field min-h-[84px]"
          maxLength={2000}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Write a reply to ${data.user.name.split(/\s+/)[0]}…`}
        />
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-semibold text-ink-muted">Status:</span>
            <div role="group" aria-label="Status" className="adm-seg">
              {SUPPORT_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={data.status === s}
                  className={data.status === s ? '!bg-brand-50 !text-brand' : ''}
                  disabled={busy}
                  onClick={() => data.status !== s && void send({ status: s })}
                >
                  {SUPPORT_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>
          <button type="submit" disabled={busy || !text.trim()} className="btn btn-primary gap-1.5">
            <A.arrow width={15} height={15} />
            Send reply
          </button>
        </div>
      </form>
    </div>
  );
}

function Inner({ initialOpen }: { initialOpen: string | null }) {
  const { refreshBadges } = useAdmin();
  const [role, setRole] = useState<UserRole | ''>('');
  // A link from the bell (?open=…) shows every status, so the request is in the list.
  const [status, setStatus] = useState<SupportStatus | ''>(initialOpen ? '' : 'open');
  const [topic, setTopic] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<string | null>(initialOpen);
  const qs = new URLSearchParams({
    ...(role && { role }),
    ...(status && { status }),
    ...(topic && { topic }),
    ...(search && { q: search }),
    limit: '50',
  });
  const list = useApi<ListData>(`/admin/support?${qs}`);
  const c = list.data?.counts;

  const changed = () => {
    list.reload();
    refreshBadges();
  };

  const roleTabs: [UserRole | '', string][] = [
    ['', 'All'],
    ...USER_ROLES.map((r): [UserRole, string] => [r, USER_ROLE_LABELS[r]]),
  ];
  const statusTabs: [SupportStatus | '', string][] = [
    ...SUPPORT_STATUSES.map((s): [SupportStatus, string] => [s, SUPPORT_STATUS_LABELS[s]]),
    ['', 'All'],
  ];

  return (
    <>
      <PageTitle
        title="Support"
        sub="Requests from buyers, tenants, owners, agents and builders. Your reply shows in their dashboard."
      >
        <form
          role="search"
          className="flex w-full gap-2 sm:w-auto"
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(q.trim());
          }}
        >
          <label htmlFor="sp-q" className="sr-only">
            Search
          </label>
          <input
            id="sp-q"
            className="field sm:w-72"
            placeholder="Search name, phone or NX-S id"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button type="submit" className="btn btn-outline" aria-label="Search">
            <A.search width={16} height={16} />
          </button>
        </form>
      </PageTitle>

      <div className="mb-5 grid grid-cols-3 gap-3 lg:grid-cols-4">
        {(
          [
            ['Open', c?.stats.open, 'border-t-accent', 'Waiting for reply'],
            ['In progress', c?.stats.inProgress, 'border-t-brand', 'Being worked on'],
            ['Resolved · 7 days', c?.stats.resolved7d, 'border-t-success', 'Closed this week'],
            [
              'Avg first reply',
              c ? fmtMins(c.stats.avgFirstReplyMins) : undefined,
              'border-t-brand-900',
              'Last 30 days',
            ],
          ] as const
        ).map(([l, n, tone, hint], i) => (
          <div
            key={l}
            className={`card border-t-[3px] p-3 sm:p-4 ${tone} ${i === 3 ? 'hidden lg:block' : ''}`}
          >
            <p className="truncate text-xs font-semibold text-ink-muted">{l}</p>
            <p className="mt-0.5 text-xl font-bold sm:text-2xl">{n ?? '–'}</p>
            <p className="hidden text-xs text-ink-muted sm:block">{hint}</p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div
          role="tablist"
          aria-label="Who raised it"
          className="flex gap-5 overflow-x-auto border-b border-line px-4 [scrollbar-width:none] sm:gap-7 sm:px-5"
        >
          {roleTabs.map(([k, l]) => {
            const on = role === k;
            const n = c ? c.roles[k || 'all'] : null;
            return (
              <button
                key={k || 'all'}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setRole(k)}
                className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-[2.5px] px-0.5 py-3 text-sm font-bold ${
                  on
                    ? 'border-brand text-brand'
                    : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                {l}
                {n != null && (
                  <span
                    className={`rounded-full px-2 text-[11.5px] ${on ? 'bg-brand text-white' : 'bg-brand-50 text-brand'}`}
                  >
                    {n}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 sm:px-5">
          <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
            {statusTabs.map(([k, l]) => {
              const on = status === k;
              const n = c ? c.statuses[k || 'all'] : null;
              return (
                <button
                  key={k || 'all'}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setStatus(k)}
                  className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-bold ${
                    on
                      ? 'border-brand-900 bg-brand-900 text-white'
                      : 'border-line bg-white text-ink-soft'
                  }`}
                >
                  {l}
                  {n != null && (
                    <span
                      className={`rounded-full px-1.5 text-[11.5px] ${on ? 'bg-accent text-black' : 'bg-surface text-ink'}`}
                    >
                      {n}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <label className="flex items-center gap-2 text-[13px] text-ink-muted">
            Topic
            <select
              className="rounded-lg border border-line bg-white px-2 py-1.5 text-[13px] text-ink"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            >
              <option value="">All</option>
              {SUPPORT_TOPICS.map((t) => (
                <option key={t} value={t}>
                  {SUPPORT_TOPIC_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="lg:grid lg:grid-cols-[400px_1fr]">
          <div className={`border-line lg:border-r ${open ? 'hidden lg:block' : ''}`}>
            {list.error && (
              <p className="m-4 rounded-lg bg-danger-50 p-3 text-danger">{list.error}</p>
            )}
            {list.loading && !list.data && (
              <div className="flex flex-col gap-3 p-4">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            )}
            {list.data?.items.length === 0 && (
              <p className="p-10 text-center text-sm text-ink-muted">
                Nothing here. New requests from users show up in this list.
              </p>
            )}
            <ul>
              {list.data?.items.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setOpen(t.id)}
                    aria-current={open === t.id ? 'true' : undefined}
                    className={`flex w-full gap-3 border-b border-line px-4 py-3.5 text-left hover:bg-[#f8f9fd] ${open === t.id ? 'bg-[#f5f7ff] shadow-[inset_3px_0_0_#f97316]' : ''}`}
                  >
                    <Av name={t.user.name} role={t.user.role} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="truncate text-sm font-bold">{who(t.user)}</span>
                        <span className="shrink-0 text-xs text-ink-muted">
                          {ago(t.lastMessageAt)}
                        </span>
                      </span>
                      <span className="my-1 flex flex-wrap items-center gap-1.5">
                        <RoleChip role={t.user.role} />
                        <StatusChip status={t.status} />
                        {t.unread && (
                          <span
                            className="h-2 w-2 rounded-full bg-accent"
                            aria-label="New message"
                          />
                        )}
                      </span>
                      <span className="block truncate text-[13.5px] font-semibold text-ink-soft">
                        {t.subject}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-ink-muted">
                        {t.ticketId}
                        {t.topic ? ` · ${SUPPORT_TOPIC_LABELS[t.topic]}` : ''}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className={open ? '' : 'hidden lg:block'}>
            {open ? (
              <TicketPanel key={open} id={open} onBack={() => setOpen(null)} onChanged={changed} />
            ) : (
              <p className="flex h-full min-h-[240px] flex-col items-center justify-center gap-2 p-10 text-center text-sm text-ink-muted">
                <A.chat width={30} height={30} className="text-brand/60" />
                Choose a request to read and reply.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function WithParams() {
  const open = useSearchParams().get('open');
  const id = open && /^[a-f0-9]{24}$/i.test(open) ? open : null;
  // A new ?open= link (from the bell) starts the page again on that request.
  return <Inner key={id ?? 'list'} initialOpen={id} />;
}

export default function SupportAdminPage() {
  return (
    <Suspense fallback={<Skeleton className="h-64 w-full" />}>
      <WithParams />
    </Suspense>
  );
}
