export type StoragePressure = 'unknown' | 'normal' | 'near-full' | 'critical';
export type StoragePersistence = 'unknown' | 'persistent' | 'best-effort';

export interface StorageReader {
  estimate?: () => Promise<{ usage?: unknown; quota?: unknown } | undefined>;
  persisted?: () => Promise<boolean>;
}

export interface DeviceStorageEstimate {
  usageBytes: number | null;
  quotaBytes: number | null;
  ratio: number | null;
  pressure: StoragePressure;
}

export interface DeviceStorageRead {
  estimate: DeviceStorageEstimate | null;
  status: 'unsupported' | 'available' | 'error';
  persistence: StoragePersistence;
  error: string | null;
}

export const STORAGE_NEAR_FULL_RATIO = 0.8;
export const STORAGE_CRITICAL_RATIO = 0.95;

export function normalizeStorageEstimate(
  value?: { usage?: unknown; quota?: unknown },
): DeviceStorageEstimate {
  const usageBytes = typeof value?.usage === 'number' && Number.isFinite(value.usage) && value.usage >= 0
    ? value.usage : null;
  const quotaBytes = typeof value?.quota === 'number' && Number.isFinite(value.quota) && value.quota > 0
    ? value.quota : null;
  const measuredRatio = usageBytes !== null && quotaBytes !== null ? usageBytes / quotaBytes : null;
  const ratio = measuredRatio !== null && Number.isFinite(measuredRatio) ? measuredRatio : null;
  const pressure: StoragePressure = ratio === null ? 'unknown'
    : ratio >= STORAGE_CRITICAL_RATIO ? 'critical'
    : ratio >= STORAGE_NEAR_FULL_RATIO ? 'near-full' : 'normal';

  return { usageBytes, quotaBytes, ratio, pressure };
}

export async function readDeviceStorageStatus(storage?: StorageReader): Promise<DeviceStorageRead> {
  const canEstimate = typeof storage?.estimate === 'function';
  const canReadPersistence = typeof storage?.persisted === 'function';
  const [estimate, persistence] = await Promise.allSettled([
    canEstimate ? Promise.resolve().then(() => storage.estimate!()) : Promise.resolve(undefined),
    canReadPersistence ? Promise.resolve().then(() => storage.persisted!()) : Promise.resolve(undefined),
  ]);
  const persistenceStatus: StoragePersistence = persistence.status === 'fulfilled'
    ? persistence.value === true ? 'persistent' : persistence.value === false ? 'best-effort' : 'unknown'
    : 'unknown';

  if (!canEstimate) {
    return { estimate: null, status: 'unsupported', persistence: persistenceStatus, error: null };
  }
  if (estimate.status === 'rejected') {
    return {
      estimate: null,
      status: 'error',
      persistence: persistenceStatus,
      error: 'Không đọc được ước tính dung lượng từ trình duyệt. Bạn vẫn có thể sao lưu JSON.',
    };
  }
  return {
    estimate: normalizeStorageEstimate(estimate.value),
    status: 'available',
    persistence: persistenceStatus,
    error: null,
  };
}

export function formatStorageBytes(value: number | null): string {
  if (value === null) return 'Chưa xác định';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const unit = value > 0 ? Math.max(0, Math.min(Math.floor(Math.log10(value) / 3), units.length - 1)) : 0;
  return `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(value / (1000 ** unit))} ${units[unit]}`;
}
