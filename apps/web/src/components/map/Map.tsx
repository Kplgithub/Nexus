'use client';

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import type { GeoPointValue } from '@nexus/shared';

/**
 * OpenStreetMap via Leaflet. Leaflet touches `window` on import, so it is loaded
 * in an effect and the map only exists in the browser; the server renders a
 * same-sized placeholder.
 */

export type MapMarker = GeoPointValue & {
  /** Short text on the pin, e.g. "₹45 L". */
  label?: string;
  /** Popup title; links to href when set. */
  title?: string;
  href?: string;
  kind?: 'property' | 'project' | 'landmark';
};

type L = typeof import('leaflet');

/** Jaipur, for maps with nothing to show yet. */
export const DEFAULT_CENTER: GeoPointValue = { lat: 26.9124, lng: 75.7873 };

const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  );

function pinIcon(leaflet: L, m: Pick<MapMarker, 'label' | 'kind'>) {
  const cls =
    m.kind === 'landmark'
      ? 'nx-pin nx-pin-landmark'
      : m.kind === 'project'
        ? 'nx-pin nx-pin-project'
        : 'nx-pin';
  return leaflet.divIcon({
    className: '',
    html: `<span class="${cls}">${m.label ? esc(m.label) : ''}</span>`,
    iconSize: undefined,
    iconAnchor: [0, 0],
  });
}

function useLeaflet() {
  const [leaflet, setLeaflet] = useState<L | null>(null);
  useEffect(() => {
    let live = true;
    void import('leaflet').then((mod) => live && setLeaflet((mod.default ?? mod) as L));
    return () => {
      live = false;
    };
  }, []);
  return leaflet;
}

function MapFrame({
  className,
  label,
  children,
  innerRef,
}: {
  className?: string;
  label: string;
  children?: React.ReactNode;
  innerRef: React.Ref<HTMLDivElement>;
}) {
  return (
    <div
      className={`relative isolate overflow-hidden rounded-xl border border-line bg-surface ${className ?? 'h-72'}`}
    >
      <div ref={innerRef} role="region" aria-label={label} className="absolute inset-0" />
      {children}
    </div>
  );
}

/** Read-only map with one or more pins. Fits all pins into view. */
export function MapView({
  markers,
  center,
  zoom = 14,
  className,
  label = 'Map',
  /** Draw a soft circle instead of an exact pin (owners' approximate location). */
  approximate,
}: {
  markers: MapMarker[];
  center?: GeoPointValue | null;
  zoom?: number;
  className?: string;
  label?: string;
  approximate?: boolean;
}) {
  const leaflet = useLeaflet();
  const el = useRef<HTMLDivElement>(null);
  const key = JSON.stringify([markers, center, approximate]);

  useEffect(() => {
    if (!leaflet || !el.current) return;
    const start = center ?? markers[0] ?? DEFAULT_CENTER;
    const map = leaflet
      .map(el.current, { scrollWheelZoom: false })
      .setView([start.lat, start.lng], zoom);
    leaflet.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);

    const points: [number, number][] = [];
    for (const m of markers) {
      points.push([m.lat, m.lng]);
      if (approximate && m.kind !== 'landmark') {
        leaflet
          .circle([m.lat, m.lng], {
            radius: 250,
            color: '#1e40af',
            weight: 1.5,
            fillColor: '#1e40af',
            fillOpacity: 0.15,
          })
          .addTo(map);
        continue;
      }
      const marker = leaflet.marker([m.lat, m.lng], {
        icon: pinIcon(leaflet, m),
        title: m.title,
        keyboard: true,
      });
      if (m.title) {
        marker.bindPopup(
          m.href
            ? `<a href="${esc(m.href)}" class="nx-popup-link">${esc(m.title)}</a>`
            : `<span>${esc(m.title)}</span>`,
        );
      }
      marker.addTo(map);
    }
    if (points.length > 1 && !center) map.fitBounds(points, { padding: [40, 40], maxZoom: 15 });
    return () => {
      map.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaflet, key, zoom]);

  return (
    <MapFrame innerRef={el} className={className} label={label}>
      {!leaflet && <MapLoading />}
    </MapFrame>
  );
}

/**
 * Drop or drag a pin. Clicking the map moves it. "Use locality centre" helps
 * when the poster cannot find the exact spot.
 */
export function PinPicker({
  value,
  onChange,
  fallbackCenter,
  className,
  label = 'Choose the location on the map',
}: {
  value: GeoPointValue | null;
  onChange: (v: GeoPointValue | null) => void;
  fallbackCenter?: GeoPointValue | null;
  className?: string;
  label?: string;
}) {
  const leaflet = useLeaflet();
  const el = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import('leaflet').Map | null>(null);
  const markerRef = useRef<import('leaflet').Marker | null>(null);
  const changeRef = useRef(onChange);
  useEffect(() => {
    changeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!leaflet || !el.current) return;
    const start = value ?? fallbackCenter ?? DEFAULT_CENTER;
    const map = leaflet.map(el.current).setView([start.lat, start.lng], value ? 16 : 14);
    leaflet.tileLayer(TILE_URL, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(map);
    map.on('click', (e) => changeRef.current(round(e.latlng)));
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // The map is created once; value changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaflet]);

  // Keep the marker in sync with the value.
  useEffect(() => {
    const map = mapRef.current;
    if (!leaflet || !map) return;
    if (!value) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      const m = leaflet.marker([value.lat, value.lng], {
        draggable: true,
        icon: pinIcon(leaflet, {}),
        title: 'Property location (drag to adjust)',
      });
      m.on('dragend', () => changeRef.current(round(m.getLatLng())));
      m.addTo(map);
      markerRef.current = m;
    } else {
      markerRef.current.setLatLng([value.lat, value.lng]);
    }
  }, [leaflet, value]);

  // Move the view when the locality (fallback centre) changes and no pin is set.
  useEffect(() => {
    if (!value && fallbackCenter && mapRef.current)
      mapRef.current.setView([fallbackCenter.lat, fallbackCenter.lng], 14);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallbackCenter?.lat, fallbackCenter?.lng]);

  return (
    <div>
      <MapFrame innerRef={el} className={className ?? 'h-80'} label={label}>
        {!leaflet && <MapLoading />}
      </MapFrame>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-ink-muted">
          {value
            ? `Pin set at ${value.lat.toFixed(5)}, ${value.lng.toFixed(5)}`
            : 'Tap the map to drop a pin.'}
        </span>
        {fallbackCenter && !value && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => onChange(fallbackCenter)}
          >
            Use locality centre
          </button>
        )}
        {value && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(null)}>
            Remove pin
          </button>
        )}
      </div>
    </div>
  );
}

const round = (p: { lat: number; lng: number }): GeoPointValue => ({
  lat: Math.round(p.lat * 1e6) / 1e6,
  lng: Math.round(p.lng * 1e6) / 1e6,
});

function MapLoading() {
  return (
    <div className="absolute inset-0 grid place-items-center text-sm text-ink-muted">
      Loading map…
    </div>
  );
}
