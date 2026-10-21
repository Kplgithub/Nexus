'use client';

import Image from 'next/image';
import { useState } from 'react';
import type { AiImageKind, AiImageResult } from '@nexus/shared';
import { useAdmin } from '@/components/admin/AdminShell';
import { errMsg, useApi } from '@/components/admin/useApi';
import { apiFetch } from '@/lib/client-api';

/**
 * Generates decorative site art (e.g. the home hero) from a short brief.
 * Not offered for property galleries — listing photos must be real.
 */
export function AiImageGenerator({
  kind = 'hero',
  placeholder = 'e.g. Jaipur skyline at golden hour with modern apartment towers and the Aravalli hills behind',
  useLabel = 'Use this image',
  onUse,
}: {
  kind?: AiImageKind;
  placeholder?: string;
  useLabel?: string;
  onUse: (image: AiImageResult) => void;
}) {
  const { toast, can } = useAdmin();
  const status = useApi<{ enabled: boolean }>('/admin/ai-images/status');
  const [brief, setBrief] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<AiImageResult | null>(null);

  if (!can('admin') || status.loading) return null;

  if (!status.data?.enabled) {
    return (
      <p className="rounded-lg bg-surface p-3 text-sm text-ink-muted">
        AI image generation is off. Add <code>ANTHROPIC_API_KEY</code> and{' '}
        <code>OPENAI_API_KEY</code> to the API server&apos;s environment to turn it on.
      </p>
    );
  }

  async function generate() {
    setBusy(true);
    try {
      const { data } = await apiFetch<AiImageResult>('/admin/ai-images', {
        method: 'POST',
        body: { kind, brief },
      });
      setResult(data);
    } catch (err) {
      toast(errMsg(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  const tooShort = brief.trim().length < 10;

  return (
    <div className="rounded-lg border border-line p-4">
      <label htmlFor={`ai-brief-${kind}`} className="field-label">
        Generate with AI
      </label>
      <textarea
        id={`ai-brief-${kind}`}
        className="field min-h-20"
        maxLength={500}
        placeholder={placeholder}
        value={brief}
        disabled={busy}
        onChange={(e) => setBrief(e.target.value)}
      />
      <p className="field-hint">
        Describe the scene in a sentence. Text, logos and people are left out automatically.
      </p>

      <button
        type="button"
        className="btn btn-outline btn-sm mt-3"
        onClick={generate}
        disabled={busy || tooShort}
      >
        {busy ? 'Generating… (up to a minute)' : result ? 'Generate another' : 'Generate image'}
      </button>

      {result && (
        <div className="mt-4 max-w-xl">
          <div className="relative aspect-[3/2] overflow-hidden rounded-md bg-surface">
            {/* Admin-only preview: load directly so local dev uploads (localhost) also show. */}
            <Image src={result.url} alt={result.alt} fill unoptimized className="object-cover" />
          </div>
          <p className="mt-2 text-xs text-ink-muted">{result.alt}</p>
          <button
            type="button"
            className="btn btn-primary btn-sm mt-3"
            onClick={() => {
              onUse(result);
              toast('Image selected. Click “Save settings” to publish it.');
            }}
          >
            {useLabel}
          </button>
        </div>
      )}
    </div>
  );
}
