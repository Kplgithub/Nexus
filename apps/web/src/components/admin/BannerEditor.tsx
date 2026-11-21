'use client';

import Image from 'next/image';
import { useState } from 'react';
import { IMAGE_MAX_BYTES, IMAGE_MIME_TYPES, type HomeBanner } from '@nexus/shared';
import { apiFetch } from '@/lib/client-api';
import { errMsg } from './useApi';

type UploadResult =
  | { ok: true; name: string; image: { url: string } }
  | { ok: false; name: string; error: string };

const PLACEMENTS: { value: HomeBanner['placement']; label: string }[] = [
  { value: 'top', label: 'Top: beside the photo tiles (one only)' },
  { value: 'middle', label: 'Middle: wide banner after agents' },
  { value: 'lower', label: 'Lower: two side by side after tools' },
];

async function upload(file: File) {
  if (!(IMAGE_MIME_TYPES as readonly string[]).includes(file.type))
    throw new Error('Use a JPEG, PNG, WebP or AVIF image');
  if (file.size > IMAGE_MAX_BYTES) throw new Error('Image is larger than 8 MB');
  const form = new FormData();
  form.append('files', file);
  const { data } = await apiFetch<UploadResult[]>('/admin/uploads', { method: 'POST', form });
  const r = data[0];
  if (!r) throw new Error('Upload failed');
  if (!r.ok) throw new Error(r.error);
  return r.image.url;
}

const newBanner = (): HomeBanner => ({
  id: Math.random().toString(36).slice(2, 10),
  placement: 'middle',
  imageUrl: '',
  title: '',
  text: '',
  buttonLabel: '',
  link: '',
  active: true,
});

/** Home page banners: add, edit, reorder and switch off. Saved with the rest of Settings. */
export function BannerEditor({
  banners,
  onChange,
  disabled,
  toast,
}: {
  banners: HomeBanner[];
  onChange: (b: HomeBanner[]) => void;
  disabled: boolean;
  toast: (msg: string, kind?: 'error') => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const set = (i: number, patch: Partial<HomeBanner>) =>
    onChange(banners.map((b, j) => (j === i ? { ...b, ...patch } : b)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...banners];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x!);
    onChange(next);
  };

  return (
    <section className="card grid gap-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Home page banners</h2>
          <p className="text-sm text-ink-muted">
            Offers, partner ads or campaigns. Banners without an image are not shown. Click Save
            settings after changes.
          </p>
        </div>
        {!disabled && banners.length < 12 && (
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => onChange([...banners, newBanner()])}
          >
            Add banner
          </button>
        )}
      </div>

      {banners.length === 0 && <p className="text-sm text-ink-muted">No banners yet.</p>}

      {banners.map((b, i) => (
        <fieldset
          key={b.id}
          disabled={disabled}
          className="grid gap-3 rounded-xl border border-line p-4 md:grid-cols-[12rem_1fr]"
        >
          <legend className="px-1 text-sm font-semibold">Banner {i + 1}</legend>
          <div className="grid content-start gap-2">
            <div className="relative aspect-[16/9] overflow-hidden rounded-lg bg-surface">
              {b.imageUrl ? (
                <Image src={b.imageUrl} alt="" fill unoptimized className="object-cover" />
              ) : (
                <span className="grid h-full place-items-center text-xs text-ink-muted">
                  No image
                </span>
              )}
            </div>
            <label className="btn btn-outline btn-sm cursor-pointer">
              {busy === b.id ? 'Uploading…' : b.imageUrl ? 'Change image' : 'Upload image'}
              <input
                type="file"
                accept={IMAGE_MIME_TYPES.join(',')}
                className="sr-only"
                onChange={async (ev) => {
                  const f = ev.target.files?.[0];
                  ev.target.value = '';
                  if (!f) return;
                  setBusy(b.id);
                  try {
                    set(i, { imageUrl: await upload(f) });
                  } catch (err) {
                    toast(errMsg(err), 'error');
                  } finally {
                    setBusy(null);
                  }
                }}
              />
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="field-label" htmlFor={`bn-place-${b.id}`}>
                Where on the home page
              </label>
              <select
                id={`bn-place-${b.id}`}
                className="field"
                value={b.placement}
                onChange={(ev) => set(i, { placement: ev.target.value as HomeBanner['placement'] })}
              >
                {PLACEMENTS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <Field
              label="Title (optional)"
              id={`bn-title-${b.id}`}
              value={b.title}
              max={80}
              onChange={(v) => set(i, { title: v })}
            />
            <Field
              label="Button text (optional)"
              id={`bn-btn-${b.id}`}
              value={b.buttonLabel}
              max={30}
              onChange={(v) => set(i, { buttonLabel: v })}
            />
            <div className="sm:col-span-2">
              <Field
                label="Short text (optional)"
                id={`bn-text-${b.id}`}
                value={b.text}
                max={200}
                onChange={(v) => set(i, { text: v })}
              />
            </div>
            <div className="sm:col-span-2">
              <Field
                label="Link: a page like /buy, or a full https:// link (optional)"
                id={`bn-link-${b.id}`}
                value={b.link}
                max={300}
                onChange={(v) => set(i, { link: v })}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--color-brand)]"
                  checked={b.active}
                  onChange={(ev) => set(i, { active: ev.target.checked })}
                />
                Show on website
              </label>
              <span className="flex-1" />
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={i === 0}
                onClick={() => move(i, -1)}
              >
                Move up
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={i === banners.length - 1}
                onClick={() => move(i, 1)}
              >
                Move down
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm text-danger"
                onClick={() => onChange(banners.filter((_, j) => j !== i))}
              >
                Remove
              </button>
            </div>
          </div>
        </fieldset>
      ))}
    </section>
  );
}

function Field({
  label,
  id,
  value,
  max,
  onChange,
}: {
  label: string;
  id: string;
  value: string;
  max: number;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="field"
        value={value}
        maxLength={max}
        onChange={(ev) => onChange(ev.target.value)}
      />
    </div>
  );
}
