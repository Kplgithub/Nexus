'use client';

import { useEffect } from 'react';

/** Reader counts as active for this long after their last scroll, tap, key or mouse move. */
const IDLE_MS = 60_000;
/** How often progress is sent while the reader is on the page. */
const HEARTBEAT_MS = 15_000;
const VISITOR_KEY = 'nexus_reader';

const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

function visitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id || !/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
      id = newId();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return newId();
  }
}

type Saved = { sessionId: string; seconds: number; scroll: number };

/**
 * Measures how long the article is actually read (tab visible and the reader active)
 * and how far down it they get, and sends it to the API. One session per article per
 * browser tab, so a refresh continues the same reading instead of counting a new one.
 * Nothing personal is sent: the reader id is random and stays in this browser.
 */
export function ReadTracker({ postId, bodyId }: { postId: string; bodyId: string }) {
  useEffect(() => {
    const storeKey = `nexus_read:${postId}`;
    let saved: Saved | null = null;
    try {
      saved = JSON.parse(sessionStorage.getItem(storeKey) ?? 'null') as Saved | null;
    } catch {
      /* storage unavailable */
    }
    const state: Saved = {
      sessionId: saved?.sessionId ?? newId(),
      seconds: saved?.seconds ?? 0,
      scroll: saved?.scroll ?? 0,
    };
    const visitor = visitorId();
    const referrer = document.referrer || undefined;
    let lastActive = Date.now();
    let lastSent = -1;

    const persist = () => {
      try {
        sessionStorage.setItem(storeKey, JSON.stringify(state));
      } catch {
        /* ignore */
      }
    };

    const measureScroll = () => {
      const el = document.getElementById(bodyId);
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const total = rect.height;
      if (total <= 0) return;
      const seen = window.innerHeight - rect.top;
      const pct = Math.max(0, Math.min(100, Math.round((seen / total) * 100)));
      if (pct > state.scroll) state.scroll = pct;
    };

    const send = (final = false) => {
      persist();
      const key = state.seconds * 1000 + state.scroll;
      if (key === lastSent && !final) return;
      lastSent = key;
      const body = JSON.stringify({
        sessionId: state.sessionId,
        visitorId: visitor,
        seconds: state.seconds,
        scroll: state.scroll,
        referrer,
      });
      const url = `/api/v1/blog/${postId}/read`;
      if (final && navigator.sendBeacon) {
        navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }));
        return;
      }
      void fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        keepalive: true,
      }).catch(() => {});
    };

    const onActivity = () => {
      lastActive = Date.now();
    };
    const onScroll = () => {
      onActivity();
      measureScroll();
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') send(true);
    };
    const onPageHide = () => send(true);

    // One second of reading is counted only while the tab is visible and the reader is not idle.
    const tick = window.setInterval(() => {
      if (document.visibilityState === 'visible' && Date.now() - lastActive < IDLE_MS)
        state.seconds += 1;
    }, 1000);
    const heartbeat = window.setInterval(() => send(), HEARTBEAT_MS);

    const events = ['mousemove', 'keydown', 'touchstart', 'pointerdown', 'wheel'] as const;
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }));
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', onHide);
    window.addEventListener('pagehide', onPageHide);

    measureScroll();
    send();

    return () => {
      window.clearInterval(tick);
      window.clearInterval(heartbeat);
      events.forEach((e) => window.removeEventListener(e, onActivity));
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', onHide);
      window.removeEventListener('pagehide', onPageHide);
      // Client-side navigation away from the article.
      send(true);
    };
  }, [postId, bodyId]);
  return null;
}
