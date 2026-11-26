import { describe, expect, it, vi } from 'vitest';
import { normalizeStorageEstimate, readDeviceStorageStatus } from '../features/data-safety/storageStatus';

describe('local storage estimate interpretation', () => {
  it('accepts zero usage as a measured value', () => {
    expect(normalizeStorageEstimate({ usage: 0, quota: 1000 })).toEqual({
      usageBytes: 0, quotaBytes: 1000, ratio: 0, pressure: 'normal',
    });
  });

  it.each([undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY, '1000'])(
    'does not report a safe percentage when quota is invalid: %s', quota => {
      expect(normalizeStorageEstimate({ usage: 50, quota })).toMatchObject({
        usageBytes: 50, quotaBytes: null, ratio: null, pressure: 'unknown',
      });
    },
  );

  it('does not turn missing or invalid usage into a zero estimate', () => {
    for (const usage of [undefined, -1, Number.NaN, Number.POSITIVE_INFINITY, '0']) {
      expect(normalizeStorageEstimate({ usage, quota: 1000 })).toMatchObject({
        usageBytes: null, quotaBytes: 1000, ratio: null, pressure: 'unknown',
      });
    }
  });

  it('does not expose an infinite percentage for inconsistent browser estimates', () => {
    expect(normalizeStorageEstimate({ usage: Number.MAX_VALUE, quota: Number.MIN_VALUE })).toMatchObject({
      ratio: null, pressure: 'unknown',
    });
  });

  it.each([
    [799, 'normal'], [800, 'near-full'], [949, 'near-full'], [950, 'critical'], [1200, 'critical'],
  ] as const)('classifies %i of 1000 bytes without rounding before the threshold', (usage, pressure) => {
    const estimate = normalizeStorageEstimate({ usage, quota: 1000 });
    expect(estimate.pressure).toBe(pressure);
    expect(estimate.ratio).toBe(usage / 1000);
  });
});

describe('read-only browser storage inspection', () => {
  it('reports unsupported estimate rather than an invented available capacity', async () => {
    expect(await readDeviceStorageStatus()).toEqual({
      estimate: null, status: 'unsupported', persistence: 'unknown', error: null,
    });
  });

  it('keeps persistence information when estimate fails', async () => {
    const result = await readDeviceStorageStatus({
      estimate: async () => { throw new Error('Browser refused estimate'); },
      persisted: async () => true,
    });
    expect(result).toMatchObject({ estimate: null, status: 'error', persistence: 'persistent' });
    expect(result.error).toBeTruthy();
    expect(result.error).not.toContain('Browser refused estimate');
  });

  it('keeps the estimate when reading persistence fails', async () => {
    const result = await readDeviceStorageStatus({
      estimate: async () => ({ usage: 850, quota: 1000 }),
      persisted: async () => { throw new Error('Not supported in this context'); },
    });
    expect(result).toMatchObject({ status: 'available', persistence: 'unknown', error: null });
    expect(result.estimate?.pressure).toBe('near-full');
  });

  it('distinguishes best-effort storage from an unknown persistence result', async () => {
    const result = await readDeviceStorageStatus({ estimate: async () => ({}), persisted: async () => false });
    expect(result).toMatchObject({ status: 'available', persistence: 'best-effort' });
    expect(result.estimate?.pressure).toBe('unknown');
  });

  it('catches synchronous browser API errors and permits a later successful read', async () => {
    const estimate = vi.fn()
      .mockImplementationOnce(() => { throw new Error('Temporary failure'); })
      .mockResolvedValueOnce({ usage: 10, quota: 1000 });
    expect((await readDeviceStorageStatus({ estimate })).status).toBe('error');
    expect((await readDeviceStorageStatus({ estimate })).estimate?.pressure).toBe('normal');
  });

  it('does not request persistence or send network requests while inspecting storage', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch');
    const persist = vi.fn();
    const storage = { estimate: vi.fn().mockResolvedValue({ usage: 10, quota: 1000 }), persisted: vi.fn().mockResolvedValue(false), persist };
    try {
      await readDeviceStorageStatus(storage);
      expect(storage.estimate).toHaveBeenCalledOnce();
      expect(storage.persisted).toHaveBeenCalledOnce();
      expect(persist).not.toHaveBeenCalled();
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      fetch.mockRestore();
    }
  });
});
