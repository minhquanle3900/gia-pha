import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceStorageRead, readDeviceStorageStatus } from './storageStatus';

export interface DeviceStorageStatus extends DeviceStorageRead {
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useDeviceStorageStatus(): DeviceStorageStatus {
  const [state, setState] = useState<DeviceStorageRead & { loading: boolean }>({
    estimate: null,
    status: 'unsupported',
    persistence: 'unknown',
    error: null,
    loading: true,
  });
  const mounted = useRef(false);
  const request = useRef(0);

  const refresh = useCallback(async () => {
    const currentRequest = ++request.current;
    if (mounted.current) setState(previous => ({ ...previous, loading: true }));
    let next: DeviceStorageRead;
    try {
      const storage = typeof navigator === 'undefined' ? undefined : navigator.storage;
      next = await readDeviceStorageStatus(storage);
    } catch {
      next = {
        estimate: null,
        status: 'error',
        persistence: 'unknown',
        error: 'Trình duyệt chưa cung cấp được thông tin lưu trữ. Hãy thử kiểm tra lại.',
      };
    }
    if (mounted.current && currentRequest === request.current) setState({ ...next, loading: false });
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    const onFocus = () => { void refresh(); };
    const onVisibility = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      mounted.current = false;
      request.current++;
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [refresh]);

  return { ...state, refresh };
}
