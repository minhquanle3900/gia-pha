import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../../public/_worker.js';
import { GEMINI_DISABLED_MESSAGE } from '../services/aiBiographyAvailability';

afterEach(() => vi.unstubAllGlobals());

describe('Cloudflare Pages demo boundary', () => {
  it.each(['GET', 'POST', 'OPTIONS', 'DELETE'])('denies API %s without parsing or forwarding data', async method => {
    const outbound = vi.fn(() => { throw new Error('Unexpected outbound request'); });
    vi.stubGlobal('fetch', outbound);
    const assets = { fetch: vi.fn() };
    const response = await worker.fetch(new Request('https://demo.example/api/biography/generate?test=synthetic', {
      method,
      ...(method === 'POST' ? { body: '{malformed' } : {}),
    }), { ASSETS: assets, GEMINI_BIOGRAPHY_ENABLED: 'true', GEMINI_API_KEY: 'synthetic-test-key' });
    expect(response.status).toBe(403);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ error: GEMINI_DISABLED_MESSAGE });
    expect(assets.fetch).not.toHaveBeenCalled();
    expect(outbound).not.toHaveBeenCalled();
  });

  it.each(['/api', '/api/', '/api/unknown/path'])('denies the whole API namespace %s', async pathname => {
    const assets = { fetch: vi.fn() };
    expect((await worker.fetch(new Request('https://demo.example' + pathname), { ASSETS: assets })).status).toBe(403);
    expect(assets.fetch).not.toHaveBeenCalled();
  });

  it('preserves static asset requests when the worker is invoked outside its API routes', async () => {
    const request = new Request('https://demo.example/manifest.webmanifest');
    const response = new Response('synthetic manifest');
    const assets = { fetch: vi.fn().mockResolvedValue(response) };
    expect(await worker.fetch(request, { ASSETS: assets })).toBe(response);
    expect(assets.fetch).toHaveBeenCalledExactlyOnceWith(request);
  });

  it('routes API requests through the deny worker and leaves static assets on Pages', () => {
    const routes = JSON.parse(readFileSync(new URL('../../public/_routes.json', import.meta.url), 'utf8'));
    expect(routes).toEqual({ version: 1, include: ['/api', '/api/*'], exclude: [] });
  });
});
