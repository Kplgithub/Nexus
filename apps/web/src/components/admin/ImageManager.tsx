'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import {
  IMAGE_MAX_BYTES,
  IMAGE_MAX_PER_PROPERTY,
  IMAGE_MIME_TYPES,
  type PropertyImage,
} from '@nexus/shared';
import { apiFetch } from '@/lib/client-api';
import { errMsg } from './useApi';

type Pending = { file: File; url: string; error?: string };
type UploadResult =
  | {
      ok: true;
      name: string;
      image: { url: string; publicId: string; width?: number; height?: number };
    }
  | { ok: false; name: string; error: string };

export function ImageManager({
  images,
  cover,
  onChange,
  title,
}: {
  images: PropertyImage[];
  cover: number;
  onChange: (images: PropertyImage[], cover: number) => void;
  title: string;
}) {
  const [pending, setPending] = useState<Pending[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  // Free all preview URLs when the editor closes.
  const created = useRef<string[]>([]);
  useEffect(() => () => created.current.forEach((u) => URL.revokeObjectURL(u)), []);

  function track(url: string) {
    created.current.push(url);
    return url;
  }

  function choose(files: FileList | null) {
    if (!files) return;
    setMessage(null);
    const room = IMAGE_MAX_PER_PROPERTY - images.length - pending.length;
    const list = Array.from(files).slice(0, Math.max(0, room));
    if (files.length > list.length)
      setMessage(`A property can have at most ${IMAGE_MAX_PER_PROPERTY} photos.`);
    setPending((p) => [
      ...p,
      ...list.map((file) => ({
        file,
        url: track(URL.createObjectURL(file)),
        error: !(IMAGE_MIME_TYPES as readonly string[]).includes(file.type)
          ? 'Use JPEG, PNG, WebP or AVIF'
          : file.size > IMAGE_MAX_BYTES
            ? 'Larger than 8 MB'
            : undefined,
      })),
    ]);
    if (input.current) input.current.value = '';
  }

  async function upload() {
    const valid = pending.filter((p) => !p.error);
    if (!valid.length) return;
    setBusy(true);
    setMessage(null);
    const added: PropertyImage[] = [];
    const failed: Pending[] = [];
    // Upload in batches of 10 (API limit).
    for (let i = 0; i < valid.length; i += 10) {
      const batch = valid.slice(i, i + 10);
      const form = new FormData();
      batch.forEach((p) => form.append('files', p.file));
      try {
        const { data } = await apiFetch<UploadResult[]>('/admin/uploads', { method: 'POST', form });
        data.forEach((r, j) => {
          if (r.ok) added.push({ ...r.image, alt: '' });
          else failed.push({ ...batch[j]!, error: r.error });
        });
      } catch (err) {
        batch.forEach((p) => failed.push({ ...p, error: errMsg(err) }));
      }
    }
    onChange([...images, ...added], images.length === 0 && added.length ? 0 : cover);
    setPending([...pending.filter((p) => p.error && !failed.includes(p)), ...failed]);
    setBusy(false);
    setMessage(
      failed.length
        ? `${added.length} uploaded, ${failed.length} failed — see below.`
        : `${added.length} photo(s) uploaded. Remember to save the property.`,
    );
  }

  function move(i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= images.length) return;
    const next = [...images];
    [next[i], next[j]] = [next[j]!, next[i]!];
    const newCover = cover === i ? j : cover === j ? i : cover;
    onChange(next, newCover);
  }

  function remove(i: number) {
    const next = images.filter((_, k) => k !== i);
    const newCover = cover === i ? 0 : cover > i ? cover - 1 : cover;
    onChange(next, Math.min(newCover, Math.max(0, next.length - 1)));
  }

  function setAlt(i: number, alt: string) {
    onChange(
      images.map((img, k) => (k === i ? { ...img, alt } : img)),
      cover,
    );
  }

  return (
    <div>
      {images.length > 0 ? (
        <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {images.map((img, i) => (
            <li
              key={img.url + i}
              className={`rounded-lg border p-2 ${i === cover ? 'border-brand ring-2 ring-brand/30' : 'border-line'}`}
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-surface">
                <Image
                  src={img.url}
                  alt={img.alt || title}
                  fill
                  sizes="300px"
                  className="object-cover"
                />
                {i === cover && (
                  <span className="absolute left-2 top-2 rounded bg-brand px-2 py-0.5 text-xs font-semibold text-white">
                    Cover
                  </span>
                )}
              </div>
              <label className="mt-2 block text-xs font-medium text-ink-muted" htmlFor={`alt-${i}`}>
                Alt text (describe the photo)
              </label>
              <input
                id={`alt-${i}`}
                className="field mt-1 text-sm"
                maxLength={160}
                value={img.alt}
                placeholder="e.g. Living room with balcony"
                onChange={(e) => setAlt(i, e.target.value)}
              />
              <div className="mt-2 flex flex-wrap gap-1">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  aria-label={`Move photo ${i + 1} earlier`}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => move(i, 1)}
                  disabled={i === images.length - 1}
                  aria-label={`Move photo ${i + 1} later`}
                >
                  ↓
                </button>
                {i !== cover && (
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => onChange(images, i)}
                  >
                    Set as cover
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm text-danger"
                  onClick={() => remove(i)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-lg border border-dashed border-line-strong p-6 text-center text-sm text-ink-muted">
          No photos yet. Add at least one before publishing.
        </p>
      )}

      <div className="mt-4 rounded-lg border border-line bg-surface p-4">
        <label htmlFor="img-input" className="field-label">
          Add photos
        </label>
        <input
          ref={input}
          id="img-input"
          type="file"
          accept={IMAGE_MIME_TYPES.join(',')}
          multiple
          onChange={(e) => choose(e.target.files)}
          className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand file:px-3 file:py-2 file:font-semibold file:text-white"
        />
        <p className="field-hint">
          JPEG, PNG, WebP or AVIF, up to 8 MB each. Location data (EXIF) is removed on upload.
        </p>

        {pending.length > 0 && (
          <>
            <ul className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
              {pending.map((p) => (
                <li key={p.url} className="text-xs">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                  <img
                    src={p.url}
                    alt=""
                    className={`aspect-square w-full rounded object-cover ${p.error ? 'opacity-40' : ''}`}
                  />
                  <p className="mt-1 truncate">{p.file.name}</p>
                  {p.error && <p className="text-danger">{p.error}</p>}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={upload}
                disabled={busy || !pending.some((p) => !p.error)}
              >
                {busy ? 'Uploading…' : `Upload ${pending.filter((p) => !p.error).length} photo(s)`}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setPending([])}
                disabled={busy}
              >
                Clear
              </button>
            </div>
          </>
        )}
        {message && (
          <p role="status" className="mt-3 text-sm text-ink-soft">
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
