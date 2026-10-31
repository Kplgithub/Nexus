'use client';

import { useState } from 'react';
import {
  INDIAN_STATES,
  LANDMARK_KINDS,
  LANDMARK_KIND_LABELS,
  slugify,
  type City,
  type DealSeo,
  type LandmarkKind,
  type Locality,
} from '@nexus/shared';
import { PinPicker } from '@/components/map/Map';
import { PageTitle, useAdmin } from '@/components/admin/AdminShell';
import { errMsg, useApi } from '@/components/admin/useApi';
import { apiFetch } from '@/lib/client-api';

export default function LocationsPage() {
  const { toast, can } = useAdmin();
  const { data, error, loading, reload } = useApi<City[]>('/admin/locations');
  const [newCity, setNewCity] = useState({ name: '', state: 'Rajasthan' });

  async function createCity(e: React.FormEvent) {
    e.preventDefault();
    try {
      await apiFetch('/admin/locations', {
        method: 'POST',
        body: { name: newCity.name, state: newCity.state, localities: [] },
      });
      toast(`Added ${newCity.name}`);
      setNewCity({ name: '', state: 'Rajasthan' });
      reload();
    } catch (err) {
      toast(errMsg(err), 'error');
    }
  }

  return (
    <>
      <PageTitle title="Locations" />
      <p className="mb-6 max-w-3xl text-sm text-ink-muted">
        Only the cities and localities added here appear on the website — in search, filters, the
        posting form and location pages. Untick “Active” to hide one without deleting it. A location
        page is indexed by search engines only when it has live listings or a written introduction.
      </p>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-50 p-3 text-danger">
          {error}
        </p>
      )}
      {loading && !data && <p className="text-ink-muted">Loading…</p>}
      {data?.length === 0 && (
        <div className="card mb-6 p-8 text-center">
          <p className="font-semibold">No cities yet</p>
          <p className="mt-1 text-sm text-ink-muted">
            Add your first city below, then add its localities. Nothing is shown on the website
            until you do.
          </p>
        </div>
      )}
      <div className="space-y-6">
        {data?.map((c) => (
          <CityEditor
            key={c.id + c.localities.length}
            city={c}
            onSaved={reload}
            canEdit={can('admin')}
          />
        ))}
      </div>
      {can('admin') && (
        <form
          onSubmit={createCity}
          className="card mt-8 grid gap-3 p-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <div>
            <label htmlFor="nc-name" className="field-label">
              New city
            </label>
            <input
              id="nc-name"
              className="field"
              required
              minLength={2}
              value={newCity.name}
              onChange={(e) => setNewCity((s) => ({ ...s, name: e.target.value }))}
            />
          </div>
          <div>
            <label htmlFor="nc-state" className="field-label">
              State
            </label>
            <select
              id="nc-state"
              className="field"
              required
              value={newCity.state}
              onChange={(e) => setNewCity((s) => ({ ...s, state: e.target.value }))}
            >
              {INDIAN_STATES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn-primary">
            Add city
          </button>
        </form>
      )}
    </>
  );
}

function CityEditor({
  city,
  onSaved,
  canEdit,
}: {
  city: City;
  onSaved: () => void;
  canEdit: boolean;
}) {
  const { toast } = useAdmin();
  const [c, setC] = useState(city);
  const [newLocality, setNewLocality] = useState('');
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const setLoc = (slug: string, patch: Partial<Locality>) =>
    setC((s) => ({
      ...s,
      localities: s.localities.map((l) => (l.slug === slug ? { ...l, ...patch } : l)),
    }));

  async function save() {
    setBusy(true);
    try {
      await apiFetch(`/admin/locations/${c.id}`, {
        method: 'PATCH',
        body: {
          name: c.name,
          state: c.state,
          active: c.active,
          intro: c.intro,
          seoTitle: c.seoTitle ?? '',
          seoDescription: c.seoDescription ?? '',
          buySeo: dealSeoBody(c.buySeo),
          rentSeo: dealSeoBody(c.rentSeo),
          localities: c.localities.map((l) => ({
            name: l.name,
            slug: l.slug,
            active: l.active,
            intro: l.intro,
            seoTitle: l.seoTitle ?? '',
            seoDescription: l.seoDescription ?? '',
            buySeo: dealSeoBody(l.buySeo),
            rentSeo: dealSeoBody(l.rentSeo),
            center: l.center ?? null,
            highlights: (l.highlights ?? []).map((h) => h.trim()).filter((h) => h.length >= 2),
            landmarks: (l.landmarks ?? [])
              .map((m) => ({ ...m, name: m.name.trim() }))
              .filter((m) => m.name.length >= 2),
          })),
        },
      });
      toast(`${c.name} saved`);
      onSaved();
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  /** Add one or many localities (separated by commas or new lines). Saved with the city. */
  function addLocality(e: React.FormEvent) {
    e.preventDefault();
    const names = newLocality
      .split(/[\n,]/)
      .map((n) => n.trim())
      .filter((n) => n.length >= 2);
    if (!names.length) return;
    const existing = new Set(c.localities.map((l) => l.slug));
    const fresh: Locality[] = [];
    for (const name of names) {
      const slug = slugify(name);
      if (!slug || existing.has(slug)) continue;
      existing.add(slug);
      fresh.push({ name, slug, active: true, intro: '' });
    }
    if (!fresh.length) {
      toast('Those localities already exist', 'error');
      return;
    }
    setC((s) => ({ ...s, localities: [...s.localities, ...fresh] }));
    setNewLocality('');
    toast(`${fresh.length} added — click Save ${c.name} to publish`);
  }

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {c.name}{' '}
          <span className="text-sm font-normal text-ink-muted">
            {c.state} · /buy/{c.slug} · /rent/{c.slug} · {c.publishedCount ?? 0} live listings
          </span>
        </h2>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-[var(--color-brand)]"
            checked={c.active}
            disabled={!canEdit}
            onChange={(e) => setC((s) => ({ ...s, active: e.target.checked }))}
          />
          Active
        </label>
      </div>
      <div className="mt-4 grid gap-3">
        <label className="field-label" htmlFor={`intro-${c.id}`}>
          City introduction (shown on the city’s Buy and Rent pages)
        </label>
        <textarea
          id={`intro-${c.id}`}
          className="field"
          maxLength={4000}
          disabled={!canEdit}
          value={c.intro}
          onChange={(e) => setC((s) => ({ ...s, intro: e.target.value }))}
        />
        <DealSeoFields
          idPrefix={`c-${c.id}`}
          place={c.name}
          paths={{ buy: `/buy/${c.slug}`, rent: `/rent/${c.slug}` }}
          buy={c.buySeo}
          rent={c.rentSeo}
          disabled={!canEdit}
          onChange={(patch) => setC((s) => ({ ...s, ...patch }))}
        />
      </div>

      <h3 className="mt-6 font-semibold">Localities ({c.localities.length})</h3>
      <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
        {c.localities.map((l) => (
          <li key={l.slug} className="p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <input
                  aria-label={`${l.name} name`}
                  className="field w-56 text-sm"
                  value={l.name}
                  disabled={!canEdit}
                  onChange={(e) => setLoc(l.slug, { name: e.target.value })}
                />
                <span className="text-xs text-ink-muted">
                  /{l.slug} · {l.publishedCount ?? 0} live{l.intro ? ' · has intro' : ''}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-sm">
                  <input
                    type="checkbox"
                    className="size-4 accent-[var(--color-brand)]"
                    checked={l.active}
                    disabled={!canEdit}
                    onChange={(e) => setLoc(l.slug, { active: e.target.checked })}
                  />
                  Active
                </label>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setOpen(open === l.slug ? null : l.slug)}
                >
                  {open === l.slug ? 'Hide' : 'Page content'}
                </button>
              </div>
            </div>
            {open === l.slug && (
              <div className="mt-3 grid gap-3">
                <label className="text-sm font-medium" htmlFor={`li-${l.slug}`}>
                  Introduction (unique, factual, 2–4 sentences)
                </label>
                <textarea
                  id={`li-${l.slug}`}
                  className="field"
                  maxLength={3000}
                  disabled={!canEdit}
                  value={l.intro}
                  onChange={(e) => setLoc(l.slug, { intro: e.target.value })}
                />
                <input
                  aria-label="SEO title"
                  className="field text-sm"
                  maxLength={70}
                  placeholder="Fallback SEO title for both pages (optional)"
                  disabled={!canEdit}
                  value={l.seoTitle ?? ''}
                  onChange={(e) => setLoc(l.slug, { seoTitle: e.target.value })}
                />
                <input
                  aria-label="Meta description"
                  className="field text-sm"
                  maxLength={170}
                  placeholder="Fallback meta description for both pages (optional)"
                  disabled={!canEdit}
                  value={l.seoDescription ?? ''}
                  onChange={(e) => setLoc(l.slug, { seoDescription: e.target.value })}
                />
                <DealSeoFields
                  idPrefix={`l-${c.id}-${l.slug}`}
                  place={`${l.name}, ${c.name}`}
                  paths={{
                    buy: `/buy/${c.slug}/${l.slug}`,
                    rent: `/rent/${c.slug}/${l.slug}`,
                  }}
                  buy={l.buySeo}
                  rent={l.rentSeo}
                  disabled={!canEdit}
                  onChange={(patch) => setLoc(l.slug, patch)}
                />
                <label className="mt-2 text-sm font-medium" htmlFor={`lh-${l.slug}`}>
                  Highlights for the locality guide (one per line, up to 10)
                </label>
                <textarea
                  id={`lh-${l.slug}`}
                  className="field"
                  disabled={!canEdit}
                  placeholder={'e.g. 10 minutes to Ajmer Road\nWide roads and parks'}
                  value={(l.highlights ?? []).join('\n')}
                  onChange={(e) =>
                    setLoc(l.slug, { highlights: e.target.value.split('\n').slice(0, 10) })
                  }
                />
                <p className="mt-2 text-sm font-medium">Nearby places</p>
                <ul className="space-y-2">
                  {(l.landmarks ?? []).map((m, i) => (
                    <li key={i} className="flex flex-wrap gap-2">
                      <select
                        aria-label="Kind"
                        className="field w-40 text-sm"
                        disabled={!canEdit}
                        value={m.kind}
                        onChange={(e) =>
                          setLoc(l.slug, {
                            landmarks: (l.landmarks ?? []).map((x, j) =>
                              j === i ? { ...x, kind: e.target.value as LandmarkKind } : x,
                            ),
                          })
                        }
                      >
                        {LANDMARK_KINDS.map((k) => (
                          <option key={k} value={k}>
                            {LANDMARK_KIND_LABELS[k]}
                          </option>
                        ))}
                      </select>
                      <input
                        aria-label="Name"
                        className="field min-w-48 flex-1 text-sm"
                        maxLength={80}
                        disabled={!canEdit}
                        value={m.name}
                        onChange={(e) =>
                          setLoc(l.slug, {
                            landmarks: (l.landmarks ?? []).map((x, j) =>
                              j === i ? { ...x, name: e.target.value } : x,
                            ),
                          })
                        }
                      />
                      {canEdit && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() =>
                            setLoc(l.slug, {
                              landmarks: (l.landmarks ?? []).filter((_, j) => j !== i),
                            })
                          }
                        >
                          Remove
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
                {canEdit && (l.landmarks ?? []).length < 30 && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm w-fit"
                    onClick={() =>
                      setLoc(l.slug, {
                        landmarks: [...(l.landmarks ?? []), { kind: 'school', name: '' }],
                      })
                    }
                  >
                    Add nearby place
                  </button>
                )}
                <p className="mt-2 text-sm font-medium">Map centre of {l.name}</p>
                <PinPicker
                  value={l.center ?? null}
                  onChange={(v) => canEdit && setLoc(l.slug, { center: v })}
                  fallbackCenter={c.localities.find((x) => x.center)?.center ?? null}
                  className="h-64"
                  label={`Map centre of ${l.name}`}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      {canEdit && (
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <form onSubmit={addLocality} className="flex flex-1 flex-wrap items-end gap-2">
            <div className="min-w-64 flex-1">
              <label className="field-label" htmlFor={`nl-${c.id}`}>
                Add localities
              </label>
              <textarea
                id={`nl-${c.id}`}
                className="field min-h-11"
                rows={1}
                placeholder="One name, or several separated by commas"
                value={newLocality}
                onChange={(e) => setNewLocality(e.target.value)}
              />
            </div>
            <button type="submit" className="btn btn-outline">
              Add
            </button>
          </form>
          <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>
            {busy ? 'Saving…' : `Save ${c.name}`}
          </button>
        </div>
      )}
    </section>
  );
}

/**
 * Trimmed Buy/Rent copy; undefined when the page never had any. Cleared fields are sent
 * as empty strings so the database keeps the editor's choice instead of dropping it.
 */
function dealSeoBody(s?: DealSeo) {
  if (!s) return undefined;
  return {
    title: s.title?.trim() ?? '',
    description: s.description?.trim() ?? '',
    h1: s.h1?.trim() ?? '',
    intro: s.intro?.trim() ?? '',
  };
}

/** Separate search copy for the Buy and the Rent page of a city or locality. */
function DealSeoFields({
  idPrefix,
  place,
  paths,
  buy,
  rent,
  disabled,
  onChange,
}: {
  idPrefix: string;
  place: string;
  paths: { buy: string; rent: string };
  buy?: DealSeo;
  rent?: DealSeo;
  disabled: boolean;
  onChange: (patch: { buySeo?: DealSeo; rentSeo?: DealSeo }) => void;
}) {
  const deals = [
    {
      key: 'buySeo',
      label: 'Buy page',
      path: paths.buy,
      value: buy,
      h1: `Flats & Property for Sale in ${place}`,
    },
    {
      key: 'rentSeo',
      label: 'Rent page',
      path: paths.rent,
      value: rent,
      h1: `Flats & Houses for Rent in ${place}`,
    },
  ] as const;
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {deals.map((d) => {
        const v = d.value ?? {};
        const set = (patch: DealSeo) => onChange({ [d.key]: { ...v, ...patch } });
        return (
          <fieldset key={d.key} className="grid gap-2 rounded-lg border border-line p-3">
            <legend className="px-1 text-sm font-medium">
              {d.label} <span className="font-normal text-ink-muted">{d.path}</span>
            </legend>
            <span className="text-xs text-ink-muted">SEO title</span>
            <input
              aria-label={`${d.label} SEO title`}
              className="field text-sm"
              maxLength={70}
              placeholder={`SEO title, e.g. ${d.h1}`}
              disabled={disabled}
              value={v.title ?? ''}
              onChange={(e) => set({ title: e.target.value })}
            />
            <span className="text-xs text-ink-muted">Meta description</span>
            <textarea
              aria-label={`${d.label} meta description`}
              className="field text-sm"
              rows={2}
              maxLength={170}
              placeholder="Meta description (up to 160 characters)"
              disabled={disabled}
              value={v.description ?? ''}
              onChange={(e) => set({ description: e.target.value })}
            />
            <span className="text-xs text-ink-muted">Page heading (H1)</span>
            <input
              aria-label={`${d.label} H1`}
              className="field text-sm"
              maxLength={90}
              placeholder={`Page heading (H1), default: ${d.h1}`}
              disabled={disabled}
              value={v.h1 ?? ''}
              onChange={(e) => set({ h1: e.target.value })}
            />
            <span className="text-xs text-ink-muted">Introduction for this page</span>
            <textarea
              id={`${idPrefix}-${d.key}-intro`}
              aria-label={`${d.label} introduction`}
              className="field text-sm"
              rows={3}
              maxLength={3000}
              placeholder="Introduction for this page only (uses the main introduction when empty)"
              disabled={disabled}
              value={v.intro ?? ''}
              onChange={(e) => set({ intro: e.target.value })}
            />
          </fieldset>
        );
      })}
    </div>
  );
}
