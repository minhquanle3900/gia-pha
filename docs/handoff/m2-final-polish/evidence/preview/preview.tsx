import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '../../../../../src/index.css';
import '../../../../../src/styles/heritageTypography.css';
import { LocalDataSafetyPanel } from '../../../../../src/features/data-safety/LocalDataSafetyPanel';
import { StoragePressureNotice } from '../../../../../src/features/data-safety/StoragePressureNotice';
import { normalizeStorageEstimate } from '../../../../../src/features/data-safety/storageStatus';
import type { DeviceStorageStatus } from '../../../../../src/features/data-safety/useDeviceStorageStatus';

function Preview() {
  const [mode, setMode] = useState('near-full');
  const [dark, setDark] = useState(false);
  const [backups, setBackups] = useState(0);
  const [details, setDetails] = useState(0);
  const storage: DeviceStorageStatus = {
    estimate: ['near-full', 'critical', 'normal'].includes(mode)
      ? normalizeStorageEstimate({ usage: mode === 'critical' ? 95e6 : mode === 'near-full' ? 80e6 : 10e6, quota: 100e6 }) : null,
    status: mode === 'unsupported' ? 'unsupported' : mode === 'error' ? 'error' : 'available',
    error: mode === 'error' ? 'Không đọc được ước tính dung lượng từ trình duyệt. Bạn vẫn có thể sao lưu JSON.' : null,
    persistence: 'best-effort',
    loading: false,
    refresh: async () => { setMode('normal'); },
  };
  return <main className="mx-auto max-w-2xl space-y-4 p-4">
    <h1 className="heritage-ui text-xl font-bold">QA fixture · Không phải dung lượng thật</h1>
    <p>Chỉ dùng dữ liệu mô phỏng để kiểm tra trạng thái hiển thị. Không ghi IndexedDB, không gửi tệp.</p>
    <div className="flex flex-wrap gap-2">
      <label>Trạng thái <select className="min-h-11 border p-2" value={mode} onChange={event => setMode(event.target.value)}>
        <option value="normal">Bình thường</option><option value="near-full">Gần đầy 80%</option><option value="critical">Sắp đầy 95%</option><option value="unsupported">Không hỗ trợ</option><option value="error">Lỗi tạm thời</option>
      </select></label>
      <button type="button" className="min-h-11 border px-3" onClick={() => { document.documentElement.classList.toggle('dark', !dark); setDark(!dark); }}>Đổi theme QA</button>
    </div>
    <p role="status">Yêu cầu mở sao lưu: {backups}; mở chi tiết: {details}</p>
    <StoragePressureNotice storage={storage} onOpenDetails={() => setDetails(value => value + 1)} />
    <LocalDataSafetyPanel settings={{ id: 'default', schemaVersion: 1, clanName: 'QA tổng hợp', clanMotto: '', ancestralHallLocation: '', updatedAt: '2026-10-01T00:00:00.000Z', lastBackupAt: '2026-10-01T00:00:00.000Z' }} storage={storage} onOpenBackup={() => setBackups(value => value + 1)} />
  </main>;
}
createRoot(document.getElementById('root')!).render(<Preview />);
