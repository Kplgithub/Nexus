import { readFileSync } from 'node:fs';
import { ADMIN_PATH } from '@nexus/shared';
import { describe, expect, it } from 'vitest';

describe('admin address', () => {
  it('is in the proxy matcher (a matcher must be a plain string, not the constant)', () => {
    const proxy = readFileSync(new URL('../proxy.ts', import.meta.url), 'utf8');
    expect(proxy).toContain(`'${ADMIN_PATH}',`);
    expect(proxy).toContain(`'${ADMIN_PATH}/:path*',`);
  });

  it('is not advertised in robots.txt', () => {
    const robots = readFileSync(new URL('../app/robots.ts', import.meta.url), 'utf8');
    expect(robots).not.toContain(ADMIN_PATH);
    expect(robots).not.toContain('ADMIN_PATH');
  });
});
