'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { PropertyImage } from '@nexus/shared';
import { ChevronLeft, ChevronRight, CloseIcon, ImageIcon } from '../icons';

export function Gallery({ images, title }: { images: PropertyImage[]; title: string }) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const count = images.length;

  const go = useCallback((d: number) => setIndex((i) => (i + d + count) % count), [count]);

  useEffect(() => {
    const el = dialog.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, go]);

  if (!count) {
    return (
      <div className="relative isolate grid aspect-[16/9] place-items-center overflow-hidden rounded-[var(--radius-card)] bg-brand-900 text-white/80">
        <div className="nx-aurora" aria-hidden />
        <div className="relative flex flex-col items-center gap-2">
          <ImageIcon size={40} />
          <span>Photos coming soon</span>
        </div>
      </div>
    );
  }

  const main = images[0]!;
  const thumbs = images.slice(1, 5);
  // Fewer photos: a simpler layout so there are no empty cells.
  const layout =
    thumbs.length >= 4
      ? 'md:grid-cols-4 md:grid-rows-2'
      : thumbs.length >= 2
        ? 'md:grid-cols-3 md:grid-rows-2'
        : thumbs.length === 1
          ? 'md:grid-cols-3'
          : '';
  const tile = 'nx-shine group relative overflow-hidden bg-surface';
  const zoom =
    'object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06]';

  return (
    <>
      <div
        className={`nx-fade-in relative grid gap-2 overflow-hidden rounded-[var(--radius-card)] ${layout}`}
      >
        <button
          type="button"
          className={`${tile} aspect-[4/3] md:aspect-auto md:min-h-[26rem] ${thumbs.length >= 4 ? 'md:col-span-2 md:row-span-2' : thumbs.length >= 2 ? 'md:col-span-2 md:row-span-2' : thumbs.length === 1 ? 'md:col-span-2' : ''}`}
          onClick={() => {
            setIndex(0);
            setOpen(true);
          }}
          aria-label={`Open photo 1 of ${count}`}
        >
          <Image
            src={main.url}
            alt={main.alt || title}
            fill
            priority
            sizes="(min-width: 768px) 50vw, 100vw"
            className={zoom}
          />
          <span className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/45 to-transparent" />
          {main.isDemo && <RepresentativeTag />}
        </button>
        {thumbs.map((img, i) => (
          <button
            key={img.url + i}
            type="button"
            className={`${tile} hidden aspect-[4/3] md:block ${thumbs.length === 1 ? 'md:aspect-auto' : ''}`}
            onClick={() => {
              setIndex(i + 1);
              setOpen(true);
            }}
            aria-label={`Open photo ${i + 2} of ${count}`}
          >
            <Image src={img.url} alt={img.alt || title} fill sizes="25vw" className={zoom} />
            {i === thumbs.length - 1 && count > 5 && (
              <span className="absolute inset-0 grid place-items-center bg-black/50 text-lg font-semibold text-white backdrop-blur-[2px]">
                +{count - 5} photos
              </span>
            )}
          </button>
        ))}
        {count > 1 && (
          <button
            type="button"
            onClick={() => {
              setIndex(0);
              setOpen(true);
            }}
            className="absolute bottom-3 right-3 hidden items-center gap-1.5 rounded-full bg-black/45 px-3.5 py-1.5 text-sm font-semibold text-white ring-1 ring-white/25 backdrop-blur-md transition hover:bg-black/65 md:inline-flex"
          >
            <ImageIcon size={16} /> View all {count} photos
          </button>
        )}
      </div>
      {count > 1 && (
        <button
          type="button"
          className="btn btn-outline btn-sm mt-3 md:hidden"
          onClick={() => setOpen(true)}
        >
          View all {count} photos
        </button>
      )}

      <dialog
        ref={dialog}
        onClose={() => setOpen(false)}
        className="m-auto h-dvh max-h-none w-screen max-w-none bg-black/95 p-0 text-white backdrop:bg-black/80"
        aria-label={`${title} — photos`}
      >
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between p-3">
            <span className="text-sm" aria-live="polite">
              {index + 1} / {count}
            </span>
            <button
              type="button"
              className="btn btn-sm text-white hover:bg-white/10"
              onClick={() => setOpen(false)}
              aria-label="Close photos"
            >
              <CloseIcon />
            </button>
          </div>
          <div className="relative flex-1">
            <Image
              src={images[index]!.url}
              alt={images[index]!.alt || title}
              fill
              sizes="100vw"
              className="object-contain"
            />
            {images[index]!.isDemo && <RepresentativeTag />}
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => go(-1)}
                  aria-label="Previous photo"
                  className="absolute left-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 hover:bg-white/25"
                >
                  <ChevronLeft />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  aria-label="Next photo"
                  className="absolute right-2 top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/15 hover:bg-white/25"
                >
                  <ChevronRight />
                </button>
              </>
            )}
          </div>
          {images[index]!.alt && (
            <p className="p-3 text-center text-sm text-white/80">{images[index]!.alt}</p>
          )}
        </div>
      </dialog>
    </>
  );
}

/** Stock photos (demo data) are labelled so nobody mistakes them for the actual property. */
function RepresentativeTag() {
  return (
    <span className="pointer-events-none absolute left-3 top-3 z-10 rounded-md bg-black/60 px-2 py-1 text-xs font-medium text-white ring-1 ring-white/20 backdrop-blur">
      Representative image
    </span>
  );
}
