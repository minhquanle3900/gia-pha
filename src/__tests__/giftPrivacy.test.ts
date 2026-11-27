import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSeedSnapshot } from '../database/seedData';
import { isGeminiEnabled } from '../services/aiBiographyAvailability';
import { generateBiographyWithAI } from '../services/aiBiographyService';
import { generateFamilyBookPrintableHtml } from '../services/familyBookPdfService';
import { serializeDatabaseBackup } from '../services/jsonBackupService';
import { getLocalSpeechVoices } from '../services/speechSynthesisService';
import { embeddedMediaSource } from '../utils/embeddedMedia';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Gift Edition privacy', () => {
  it('returns the inactive status without sending a biography request', async () => {
    vi.stubEnv('VITE_GEMINI_BIOGRAPHY_ENABLED', undefined);
    const fetch = vi.fn().mockRejectedValue(new Error('Unexpected network request'));
    vi.stubGlobal('fetch', fetch);

    const result = await generateBiographyWithAI({
      fullName: 'Hồ sơ thử nghiệm',
      gender: 'unknown',
      isLiving: true,
      notes: 'Ghi chú tổng hợp',
    });

    expect(fetch).not.toHaveBeenCalled();
    expect(result.error).toContain('AI chưa được kích hoạt');
  });

  it('requires an explicit true flag', () => {
    for (const value of [undefined, '', 'false', 'TRUE', '1']) {
      expect(isGeminiEnabled(value)).toBe(false);
    }
    expect(isGeminiEnabled('true')).toBe(true);
  });

  it('rejects direct biography POSTs while locked, before reading JSON and even with an API key', async () => {
    const denyOutboundFetch = 'data:text/javascript,' + encodeURIComponent(
      'globalThis.fetch = () => { throw new Error("Unexpected server fetch"); };',
    );
    const child = spawn(process.execPath, ['--import', 'tsx', '--import', denyOutboundFetch, 'server.ts'], {
      env: { ...process.env, NODE_ENV: 'production', PORT: '0', GEMINI_BIOGRAPHY_ENABLED: '', GEMINI_API_KEY: 'synthetic-test-key' },
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    try {
      const port = await new Promise<string>((resolve, reject) => {
        let output = '';
        const startup = AbortSignal.timeout(6000);
        startup.addEventListener('abort', () => reject(new Error('API server startup timed out')), { once: true });
        child.stdout.setEncoding('utf8');
        child.stdout.on('data', (chunk) => {
          output += chunk;
          const port = output.match(/Server running on http:\/\/0\.0\.0\.0:(\d+)/)?.[1];
          if (port) resolve(port);
        });
        child.once('error', reject);
        child.once('exit', (code) => reject(new Error(`API server exited with code ${code}`)));
      });

      for (const body of ['{"fullName":"Hồ sơ tổng hợp"}', '{malformed']) {
        const response = await fetch(`http://127.0.0.1:${port}/api/biography/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: AbortSignal.timeout(3000),
        });
        expect(response.status).toBe(403);
        expect(response.headers.get('cache-control')).toBe('no-store');
        expect((await response.json()).error).toContain('AI chưa được kích hoạt');
      }
    } finally {
      if (child.exitCode === null && child.signalCode === null && child.pid) {
        const exited = once(child, 'exit');
        child.kill();
        await exited;
      }
    }
  }, 10000);

  it('only passes embedded media of the expected kind to the renderer', () => {
    for (const path of ['https://media.example/photo.png', '//media.example/photo.png', '/legacy/photo.png', 'blob:https://media.example/1', 'javascript:alert(1)', 'data:text/html,unsafe']) {
      expect(embeddedMediaSource(path, 'image')).toBeUndefined();
      expect(embeddedMediaSource(path, 'audio')).toBeUndefined();
    }
    const photo = 'DATA:Image/png;base64,AA==';
    const audio = 'data:audio/webm;codecs=opus;base64,AA==';
    expect(embeddedMediaSource(photo, 'image')).toBe(photo);
    expect(embeddedMediaSource(audio, 'audio')).toBe(audio);
    expect(embeddedMediaSource(audio, 'image')).toBeUndefined();
  });

  it('excludes remote speech voices from private playback', () => {
    const remote = { voiceURI: 'remote', lang: 'vi-VN', name: 'Vietnamese online', localService: false, default: true };
    const local = { voiceURI: 'device', lang: 'vi-VN', name: 'Vietnamese local', localService: true, default: false };
    expect(getLocalSpeechVoices([remote])).toEqual([]);
    expect(getLocalSpeechVoices([remote, local])).toEqual([local]);
  });

  it('keeps legacy URLs in backup while excluding them from the Family Book HTML', async () => {
    const snapshot = createSeedSnapshot();
    const external = 'https://media.example/legacy-portrait.png';
    const embedded = 'data:image/png;base64,AA==';
    snapshot.people[0].portraitUrl = external;
    snapshot.people[1].portraitUrl = embedded;
    snapshot.media[0].dataUrl = '//media.example/legacy-artifact.jpg';

    const html = generateFamilyBookPrintableHtml(snapshot);
    expect(html).not.toContain(external);
    expect(html).toContain(embedded);

    const backup = JSON.parse(await serializeDatabaseBackup(snapshot));
    expect(backup.people[0].portraitUrl).toBe(external);
    expect(backup.media[0].dataUrl).toBe(snapshot.media[0].dataUrl);
  });
});
