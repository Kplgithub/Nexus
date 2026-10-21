import { z } from 'zod';
import type { AiImageKind, AiImageRequest, AiImageResult } from '@nexus/shared';
import { aiImagesEnabled, env } from '../config/env.js';
import { AppError, badRequest } from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import { storeImage } from './upload.service.js';

/**
 * Generates decorative site imagery (home hero, section art) in three steps:
 *   1. Claude turns the admin's brief into a detailed image prompt + alt text.
 *   2. OpenAI renders the image (WebP).
 *   3. The bytes go through the normal upload path (type check, size cap, Cloudinary).
 *
 * These images are illustrative. They are deliberately NOT offered for property
 * galleries: a generated photo of a flat that doesn't exist would mislead renters.
 */

const PRESETS: Record<AiImageKind, { size: '1536x1024'; hint: string }> = {
  hero: {
    size: '1536x1024',
    hint: 'wide cinematic website hero background, uncluttered, no strong detail on the left third where headline text sits, works well under a dark overlay',
  },
  section: {
    size: '1536x1024',
    hint: 'editorial landscape image for a website section or social share card, one clear subject, balanced composition',
  },
};

const SYSTEM_PROMPT = [
  'You write prompts for an AI image generator for NEXUS Estate, a property rental website in India.',
  'Reply with ONLY a JSON object (no markdown) with keys "imagePrompt" and "alt".',
  'imagePrompt: 50-90 words of concrete visual description: subject, setting, composition, lighting, lens/mood.',
  'The image is a mood/illustrative image for the website, not a photo of a specific property for rent.',
  'Never ask for text, letters, signage, logos, watermarks, brand names, or real identifiable people.',
  'alt: one plain sentence under 125 characters describing what the image shows.',
].join(' ');

const PROMPT_TIMEOUT_MS = 30_000;
const IMAGE_TIMEOUT_MS = 120_000;

const claudeReply = z.object({
  imagePrompt: z.string().trim().min(20).max(2000),
  alt: z.string().trim().min(3).max(300),
});

export async function generateSiteImage(input: AiImageRequest): Promise<AiImageResult> {
  if (!aiImagesEnabled) {
    throw new AppError(
      503,
      'AI_IMAGES_DISABLED',
      'AI images are not set up. Add ANTHROPIC_API_KEY and OPENAI_API_KEY on the server.',
    );
  }
  const preset = PRESETS[input.kind];
  const { imagePrompt, alt } = await writePrompt(input.brief, preset.hint);
  const prompt = `${imagePrompt}. ${preset.hint}. Style: ${env.AI_BRAND_STYLE}. No text, no watermark.`;
  const bytes = await renderImage(prompt, preset.size);
  const stored = await storeImage(bytes);
  const [w, h] = preset.size.split('x').map(Number);
  return {
    ...stored,
    width: stored.width ?? w,
    height: stored.height ?? h,
    alt: alt.replace(/[<>]/g, '').slice(0, 160),
    prompt,
  };
}

async function writePrompt(brief: string, hint: string) {
  const res = await callProvider(
    'Claude',
    'https://api.anthropic.com/v1/messages',
    PROMPT_TIMEOUT_MS,
    {
      headers: {
        'x-api-key': env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: {
        model: env.AI_PROMPT_MODEL,
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `Image purpose: ${hint}\nBrand style: ${env.AI_BRAND_STYLE}\n\nAdmin's brief: ${brief}`,
          },
        ],
      },
    },
  );

  const text = ((res as { content?: { type: string; text?: string }[] }).content ?? [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text ?? '')
    .join('')
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/```$/, '')
    .trim();

  try {
    return claudeReply.parse(JSON.parse(text));
  } catch {
    logger.warn({ preview: text.slice(0, 200) }, 'AI prompt reply was not valid JSON');
    throw providerFailed();
  }
}

async function renderImage(prompt: string, size: string): Promise<Buffer> {
  const res = await callProvider(
    'OpenAI',
    'https://api.openai.com/v1/images/generations',
    IMAGE_TIMEOUT_MS,
    {
      headers: { authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: {
        model: env.AI_IMAGE_MODEL,
        prompt,
        size,
        quality: env.AI_IMAGE_QUALITY,
        output_format: 'webp',
        output_compression: 85,
        n: 1,
      },
    },
  );
  const b64 = (res as { data?: { b64_json?: string }[] }).data?.[0]?.b64_json;
  if (!b64) throw providerFailed();
  return Buffer.from(b64, 'base64');
}

async function callProvider(
  name: 'Claude' | 'OpenAI',
  url: string,
  timeoutMs: number,
  opts: { headers: Record<string, string>; body: unknown },
): Promise<unknown> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...opts.headers },
      body: JSON.stringify(opts.body),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (err) {
    logger.error({ err, provider: name }, 'AI provider unreachable');
    throw providerFailed();
  }

  const json: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const error = (json as { error?: { code?: string; type?: string; message?: string } } | null)
      ?.error;
    // Log status and provider error code only — never request bodies or keys.
    logger.error(
      { provider: name, status: res.status, code: error?.code ?? error?.type },
      'AI provider error',
    );
    if (error?.code === 'moderation_blocked' || error?.code === 'content_policy_violation') {
      throw badRequest('The image service declined this description. Try different wording.');
    }
    throw providerFailed();
  }
  return json;
}

const providerFailed = () =>
  new AppError(502, 'AI_IMAGE_FAILED', 'Image generation failed. Please try again in a moment.');
