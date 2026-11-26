'use client';

import { JOURNEY_FLOW_STEPS, type JourneyFlow, type JourneySource } from '@nexus/shared';

const VISITOR_KEY = 'nexus_visitor';
const SESSION_KEY = 'nexus_journey_session';
const SENT_PREFIX = 'nexus_jstep:';

const SEARCH_ENGINES: readonly [RegExp, string][] = [
  [/google\./i, 'Google'],
  [/bing\.com/i, 'Bing'],
  [/duckduckgo\.com/i, 'DuckDuckGo'],
  [/yahoo\./i, 'Yahoo'],
  [/ecosia\.org/i, 'Ecosia'],
  [/yandex\./i, 'Yandex'],
  [/baidu\.com/i, 'Baidu'],
];

const SOCIAL_HOSTS =
  /facebook\.com|fb\.com|instagram\.com|linkedin\.com|t\.co|twitter\.com|x\.com|whatsapp\.com|wa\.me|youtube\.com|youtu\.be/i;

function newId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id || !/^[A-Za-z0-9_-]{6,64}$/.test(id)) {
      id = newId();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return newId();
  }
}

export type AcquisitionInfo = {
  source: JourneySource;
  inviteCode?: string;
  searchEngine?: string;
};

/**
 * Classifies how a visitor arrived: invite link (?invite= / ?ref= / utm_source=invite),
 * search engine or on-site search, social media, direct, or other.
 */
export function detectAcquisitionSource(
  search: string,
  referrer: string,
  pathname = '/',
): AcquisitionInfo {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const inviteParam =
    params.get('invite') ??
    params.get('ref') ??
    params.get('referral') ??
    params.get('inviteCode');
  const utmSource = (params.get('utm_source') ?? '').toLowerCase();
  const utmMedium = (params.get('utm_medium') ?? '').toLowerCase();

  if (inviteParam && inviteParam.trim()) {
    return { source: 'invite', inviteCode: inviteParam.trim().slice(0, 64) };
  }
  if (utmSource === 'invite' || utmSource === 'referral' || utmMedium === 'invite') {
    return {
      source: 'invite',
      inviteCode: (params.get('utm_campaign') ?? 'utm_invite').trim().slice(0, 64),
    };
  }

  if (referrer) {
    try {
      const host = new URL(referrer).hostname;
      for (const [pattern, name] of SEARCH_ENGINES) {
        if (pattern.test(host)) return { source: 'search', searchEngine: name };
      }
      if (SOCIAL_HOSTS.test(host)) return { source: 'social' };
      if (typeof window !== 'undefined' && host === window.location.hostname) {
        // Internal navigation without a prior session falls through to search/direct check.
      } else {
        return { source: 'other' };
      }
    } catch {
      /* invalid referrer */
    }
  }

  if (
    utmMedium === 'organic' ||
    utmMedium === 'cpc' ||
    utmMedium === 'search' ||
    pathname.startsWith('/search') ||
    params.has('q')
  ) {
    return { source: 'search', searchEngine: 'On-site search' };
  }

  return { source: 'direct' };
}

type StoredSession = AcquisitionInfo & { sessionId: string };

function getOrCreateSession(): StoredSession {
  if (typeof window === 'undefined') {
    return { sessionId: 'ssr', source: 'direct' };
  }
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoredSession;
      if (parsed?.sessionId && parsed?.source) {
        // Upgrade session to invite if the user opens an invite link mid-session.
        const current = detectAcquisitionSource(
          window.location.search,
          '',
          window.location.pathname,
        );
        if (current.source === 'invite' && parsed.source !== 'invite') {
          const upgraded: StoredSession = { ...parsed, ...current };
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(upgraded));
          return upgraded;
        }
        return parsed;
      }
    }
  } catch {
    /* ignore storage errors */
  }

  const detected = detectAcquisitionSource(
    window.location.search,
    document.referrer || '',
    window.location.pathname,
  );
  const created: StoredSession = { sessionId: newId(), ...detected };
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(created));
  } catch {
    /* ignore */
  }
  return created;
}

/**
 * Records a user reaching a step in a tracked flow. Safe to call on every step
 * change: deduplicates per (session, flow, step) in sessionStorage and ignores
 * network failures so it never interrupts the user.
 */
export function trackJourneyStep(opts: {
  flow: JourneyFlow;
  step: string;
  stepIndex?: number;
  totalSteps?: number;
  completed?: boolean;
  path?: string;
}) {
  if (typeof window === 'undefined') return;
  const session = getOrCreateSession();
  const visitorId = getVisitorId();
  const steps = JOURNEY_FLOW_STEPS[opts.flow];
  const resolvedIndex =
    opts.stepIndex ?? Math.max(0, steps.findIndex((s) => s.id === opts.step));
  const totalSteps = opts.totalSteps ?? steps.length;

  const dedupeKey = `${SENT_PREFIX}${session.sessionId}:${opts.flow}:${opts.step}`;
  try {
    if (sessionStorage.getItem(dedupeKey)) return;
    sessionStorage.setItem(dedupeKey, '1');
  } catch {
    /* continue */
  }

  const payload = JSON.stringify({
    sessionId: session.sessionId,
    visitorId,
    source: session.source,
    inviteCode: session.inviteCode,
    searchEngine: session.searchEngine,
    flow: opts.flow,
    step: opts.step,
    stepIndex: resolvedIndex,
    totalSteps,
    completed: opts.completed ?? false,
    path: opts.path ?? window.location.pathname,
    referrer: document.referrer || undefined,
  });

  const url = '/api/v1/analytics/journey';
  if (opts.completed && navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([payload], { type: 'application/json' }));
    return;
  }
  void fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}
