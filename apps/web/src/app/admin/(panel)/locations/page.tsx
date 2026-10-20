'use client';

import { useState } from 'react';
import { slugify, type City, type Locality } from '@nexus/shared';
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
        Cities and localities power search filters and location pages. A locality page is indexed by
        search engines only when it has published listings or a written introduction — so write a
        short, genuine introduction for areas you want to rank for.
      </p>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-danger-50 p-3 text-danger">
          {error}
        </p>
      )}
      {loading && !data && <p className="text-ink-muted">Loading…</p>}
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
            <input
              id="nc-state"
              className="field"
              required
              value={newCity.state}
              onChange={(e) => setNewCity((s) => ({ ...s, state: e.target.value }))}
            />
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
          localities: c.localities.map((l) => ({
            name: l.name,
            slug: l.slug,
            active: l.active,
            intro: l.intro,
            seoTitle: l.seoTitle ?? '',
            seoDescription: l.seoDescription ?? '',
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

  function addLocality(e: React.FormEvent) {
    e.preventDefault();
    const name = newLocality.trim();
    if (!name) return;
    const slug = slugify(name);
    if (c.localities.some((l) => l.slug === slug)) {
      toast('That locality already exists', 'error');
      return;
    }
    setC((s) => ({ ...s, localities: [...s.localities, { name, slug, active: true, intro: '' }] }));
    setNewLocality('');
  }

  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {c.name}{' '}
          <span className="text-sm font-normal text-ink-muted">
            /rentals/{c.slug} · {c.publishedCount ?? 0} live listings
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
          City introduction (shown on /rentals/{c.slug})
        </label>
        <textarea
          id={`intro-${c.id}`}
          className="field"
          maxLength={4000}
          disabled={!canEdit}
          value={c.intro}
          onChange={(e) => setC((s) => ({ ...s, intro: e.target.value }))}
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
                  placeholder="SEO title (optional)"
                  disabled={!canEdit}
                  value={l.seoTitle ?? ''}
                  onChange={(e) => setLoc(l.slug, { seoTitle: e.target.value })}
                />
                <input
                  aria-label="Meta description"
                  className="field text-sm"
                  maxLength={170}
                  placeholder="Meta description (optional)"
                  disabled={!canEdit}
                  value={l.seoDescription ?? ''}
                  onChange={(e) => setLoc(l.slug, { seoDescription: e.target.value })}
                />
              </div>
            )}
          </li>
        ))}
      </ul>

      {canEdit && (
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <form onSubmit={addLocality} className="flex gap-2">
            <label className="sr-only" htmlFor={`nl-${c.id}`}>
              New locality
            </label>
            <input
              id={`nl-${c.id}`}
              className="field w-56"
              placeholder="New locality name"
              value={newLocality}
              onChange={(e) => setNewLocality(e.target.value)}
            />
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
