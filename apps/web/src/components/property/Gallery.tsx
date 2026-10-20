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
      <div className="grid aspect-[16/9] place-items-center rounded-[var(--radius-card)] bg-surface text-ink-muted">
        <div className="flex flex-col items-center gap-2">
          <ImageIcon size={40} />
          <span>Photos coming soon</span>
        </div>
      </div>
    );
  }

  const main = images[0]!;
  const thumbs = images.slice(1, 5);

  return (
    <>
      <div className="grid gap-2 overflow-hidden rounded-[var(--radius-card)] md:grid-cols-4 md:grid-rows-2">
        <button
          type="button"
          className="relative aspect-[4/3] md:col-span-2 md:row-span-2 md:aspect-auto md:min-h-[26rem]"
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
            className="object-cover"
          />
        </button>
        {thumbs.map((img, i) => (
          <button
            key={img.url + i}
            type="button"
            className="relative hidden aspect-[4/3] md:block"
            onClick={() => {
              setIndex(i + 1);
              setOpen(true);
            }}
            aria-label={`Open photo ${i + 2} of ${count}`}
          >
            <Image
              src={img.url}
              alt={img.alt || title}
              fill
              sizes="25vw"
              className="object-cover"
            />
            {i === thumbs.length - 1 && count > 5 && (
              <span className="absolute inset-0 grid place-items-center bg-black/50 text-lg font-semibold text-white">
                +{count - 5} photos
              </span>
            )}
          </button>
        ))}
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
