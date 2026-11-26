import React from 'react';
import { DeviceStorageStatus } from './useDeviceStorageStatus';

interface StoragePressureNoticeProps {
  storage: DeviceStorageStatus;
  onOpenDetails: () => void;
}

export function StoragePressureNotice({ storage, onOpenDetails }: StoragePressureNoticeProps) {
  const pressure = storage.estimate?.pressure;
  if (pressure !== 'near-full' && pressure !== 'critical') return null;

  return (
    <aside className="heritage-ui flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:text-amber-100" aria-label="Cảnh báo dung lượng lưu trữ" role="status">
      <p className="min-w-0 flex-1 basis-48"><strong>{pressure === 'critical' ? 'Dung lượng website sắp chạm hạn mức.' : 'Dung lượng website đang gần đầy.'}</strong> Hãy sao lưu JSON trước khi thêm tư liệu lớn.</p>
      <button type="button" className="min-h-11 min-w-11 rounded-xl border border-amber-700 bg-white px-3 py-2 text-sm font-semibold text-[#1B3B2B] hover:bg-stone-50" onClick={onOpenDetails}>Xem lưu trữ và sao lưu</button>
    </aside>
  );
}
