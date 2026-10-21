import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

// Keys must exist before src/config/env.ts is first imported.
vi.hoisted(() => {
  process.env.ANTHROPIC_API_KEY = 'test-anthropic-key';
  process.env.OPENAI_API_KEY = 'test-openai-key';
});

import { createAdmin, resetDb, signIn, startDb, stopDb } from './helpers.js';

// Smallest buffer our upload type-sniffer accepts as WebP.
const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0x24, 0, 0, 0]),
  Buffer.from('WEBPVP8 '),
  Buffer.alloc(32),
]);

const claudeOk = {
  content: [
    {
      type: 'text',
      text: '```json\n{"imagePrompt":"Wide view of a modern Jaipur apartment complex at golden hour, Aravalli hills behind, soft warm light, quiet tree-lined street","alt":"Modern apartment towers in Jaipur at sunset with hills behind"}\n```',
    },
  ],
};
const openaiOk = { data: [{ b64_json: WEBP.toString('base64') }] };

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function mockProviders(claude: Response, openai?: Response) {
  const fn = vi.fn(async (url: string | URL | Request) => {
    const u = String(url);
    if (u.includes('anthropic.com')) return claude;
    if (u.includes('openai.com')) return openai ?? json(200, openaiOk);
    throw new Error(`unexpected fetch ${u}`);
  });
  vi.stubGlobal('fetch', fn);
  return fn;
}

let app: Express;
let s: Awaited<ReturnType<typeof signIn>>;

beforeAll(async () => {
  app = await startDb();
});
afterAll(stopDb);
beforeEach(async () => {
  await resetDb();
  await createAdmin();
  s = await signIn(app);
});
afterEach(() => vi.unstubAllGlobals());

const brief = { kind: 'hero', brief: 'Jaipur skyline at golden hour with modern apartments' };

describe('AI site images', () => {
  it('reports that the feature is enabled', async () => {
    const res = await s.get('/api/v1/admin/ai-images/status');
    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({ enabled: true });
  });

  it('writes a prompt, renders, stores and returns the image', async () => {
    const fetchMock = mockProviders(json(200, claudeOk));
    const res = await s.post('/api/v1/admin/ai-images', brief);

    expect(res.status).toBe(200);
    expect(res.body.data.url).toMatch(/\.webp$/);
    expect(res.body.data.alt).toBe('Modern apartment towers in Jaipur at sunset with hills behind');
    expect(res.body.data.prompt).toContain('Aravalli');
    expect(res.body.data.prompt).toContain('No text');
    expect(JSON.stringify(res.body)).not.toContain('test-openai-key');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, claudeInit] = fetchMock.mock.calls[0]! as unknown as [string, RequestInit];
    expect((claudeInit.headers as Record<string, string>)['x-api-key']).toBe('test-anthropic-key');
    expect(JSON.parse(String(claudeInit.body)).messages[0].content).toContain('Jaipur skyline');
    const [, openaiInit] = fetchMock.mock.calls[1]! as unknown as [string, RequestInit];
    expect(JSON.parse(String(openaiInit.body))).toMatchObject({
      size: '1536x1024',
      output_format: 'webp',
    });
  });

  it('is limited to the admin role', async () => {
    await createAdmin('editor', 'editor@example.test');
    const ed = await signIn(app, 'editor@example.test');
    mockProviders(json(200, claudeOk));
    const res = await ed.post('/api/v1/admin/ai-images', brief);
    expect(res.status).toBe(403);
  });

  it('requires a session and CSRF token', async () => {
    const anon = await request(app).post('/api/v1/admin/ai-images').send(brief);
    expect(anon.status).toBe(401);
    const noCsrf = await s.agent.post('/api/v1/admin/ai-images').send(brief);
    expect(noCsrf.status).toBe(403);
  });

  it('validates the brief', async () => {
    const res = await s.post('/api/v1/admin/ai-images', { kind: 'hero', brief: 'short' });
    expect(res.status).toBe(422);
    expect(res.body.error.details.brief).toBeDefined();
  });

  it('turns a provider content refusal into a friendly 400', async () => {
    mockProviders(
      json(200, claudeOk),
      json(400, { error: { code: 'moderation_blocked', message: 'blocked' } }),
    );
    const res = await s.post('/api/v1/admin/ai-images', brief);
    expect(res.status).toBe(400);
    expect(res.body.error.message).toMatch(/different wording/);
  });

  it('fails cleanly when the prompt reply is not JSON', async () => {
    mockProviders(json(200, { content: [{ type: 'text', text: 'Sure! Here is a prompt…' }] }));
    const res = await s.post('/api/v1/admin/ai-images', brief);
    expect(res.status).toBe(502);
    expect(res.body.error.code).toBe('AI_IMAGE_FAILED');
  });
});
