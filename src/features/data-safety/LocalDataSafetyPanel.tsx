import React, { useEffect, useState } from 'react';
import { AppSettings } from '../../models/genealogy';
import {
  BACKUP_SNOOZE_KEY,
  BACKUP_TIMESTAMP_KEY,
  getBackupStatus,
} from '../../services/backupReminderService';
import { formatStorageBytes } from './storageStatus';
import { DeviceStorageStatus } from './useDeviceStorageStatus';

interface LocalDataSafetyPanelProps {
  settings: AppSettings;
  storage: DeviceStorageStatus;
  onOpenBackup: () => void;
}

const headingClass = 'heritage-ui text-base font-bold text-[#1F1913]';
const buttonClass = 'heritage-ui inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-[#85786A] bg-white px-3 py-2 text-sm font-semibold text-[#1B3B2B] hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50';
const panelClass = 'min-w-0 space-y-3 rounded-2xl border border-[#E7DFD4] bg-[#FAF7F2] p-4';

export function LocalDataSafetyPanel({ settings, storage, onOpenBackup }: LocalDataSafetyPanelProps) {
  const [, refreshBackup] = useState(0);
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === BACKUP_TIMESTAMP_KEY || event.key === BACKUP_SNOOZE_KEY || event.key === null) {
        refreshBackup(value => value + 1);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const backup = getBackupStatus(settings);
  const lastBackupLabel = backup.lastBackupDate
    ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(backup.lastBackupDate))
    : backup.formattedLastBackup;
  const pressure = storage.estimate?.pressure;
  const ratio = storage.estimate?.ratio;
  const percent = ratio === null || ratio === undefined ? null : Math.round(ratio * 100);

  return (
    <div className="heritage-ui min-w-0 space-y-4 break-words text-sm leading-relaxed text-[#54483C]">
      <section className={panelClass} aria-labelledby="device-storage-title" aria-busy={storage.loading}>
        <h3 id="device-storage-title" className={headingClass}>Dung lượng lưu trữ</h3>
        <p>Dung lượng website trên trình duyệt này, gồm gia phả và bộ nhớ ứng dụng ngoại tuyến.</p>
        <p className="text-xs">Đây là ước tính do trình duyệt cung cấp, không phải dung lượng trống của toàn thiết bị.</p>
        {storage.loading && <p role="status">Đang kiểm tra dung lượng…</p>}
        {!storage.loading && storage.status === 'unsupported' && (
          <p>Trình duyệt này không cung cấp ước tính dung lượng. Không thể kết luận bộ nhớ còn đủ hay đã gần đầy.</p>
        )}
        {!storage.loading && storage.error && <p role="alert" className="text-red-800 dark:text-red-200">{storage.error}</p>}
        {storage.estimate && (
          <>
            <dl className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
              <div><dt className="font-semibold">Đã dùng (ước tính)</dt><dd>{formatStorageBytes(storage.estimate.usageBytes)}</dd></div>
              <div><dt className="font-semibold">Hạn mức (ước tính)</dt><dd>{formatStorageBytes(storage.estimate.quotaBytes)}</dd></div>
            </dl>
            {percent !== null ? (
              <div className="space-y-1">
                <progress className="h-3 w-full accent-[#1B3B2B] dark:accent-[#C5A059]" max={100} value={Math.min(percent, 100)} aria-label="Tỷ lệ dùng hạn mức lưu trữ ước tính" />
                <p className="text-xs">Khoảng {percent}% hạn mức được báo cáo.</p>
              </div>
            ) : <p>Chưa đủ thông tin để tính tỷ lệ sử dụng bộ nhớ.</p>}
          </>
        )}
        {(pressure === 'near-full' || pressure === 'critical') && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-900 dark:text-amber-100">
            <p className="font-bold">{pressure === 'critical' ? 'Dung lượng website sắp chạm hạn mức' : 'Dung lượng website đang gần đầy'}</p>
            <p>Hãy xuất JSON và kiểm tra tệp sao lưu trước khi thêm ảnh hoặc âm thanh lớn. Không xóa dữ liệu website để giải phóng chỗ khi chưa có bản sao lưu.</p>
          </div>
        )}
        <p>
          {storage.persistence === 'persistent'
            ? 'Trình duyệt báo đã bật chế độ lưu bền cho website. Việc tự xóa dữ liệu website vẫn có thể xóa gia phả; bạn vẫn cần sao lưu JSON.'
            : storage.persistence === 'best-effort'
            ? 'Website đang dùng chế độ lưu trữ thông thường. Trình duyệt có thể dọn dữ liệu khi cần dung lượng; hãy giữ một bản JSON ngoài trình duyệt.'
            : 'Chưa xác định được chế độ lưu bền của website. Hãy giữ một bản JSON ngoài trình duyệt để có thể phục hồi.'}
        </p>
        <button type="button" className={buttonClass} disabled={storage.loading} onClick={() => { void storage.refresh(); }}>Kiểm tra lại dung lượng</button>
      </section>

      <section className={panelClass} aria-labelledby="device-backup-title">
        <h3 id="device-backup-title" className={headingClass}>Sao lưu JSON</h3>
        <p>Lần sao lưu được ghi nhận gần nhất: <strong>{backup.lastBackupDate ? <time dateTime={backup.lastBackupDate}>{lastBackupLabel}</time> : lastBackupLabel}</strong>.</p>
        {backup.needsBackup && !backup.isSnoozed && (
          <p className="font-semibold">{backup.daysSinceBackup === null ? 'Bạn chưa có thời điểm sao lưu hợp lệ được ghi nhận.' : `Đã ${backup.daysSinceBackup} ngày từ lần sao lưu được ghi nhận.`} Nên xuất bản JSON mới và kiểm tra tệp đã tải.</p>
        )}
        {backup.needsBackup && backup.isSnoozed && <p>Bạn đang tạm hoãn nhắc sao lưu. Có thể xuất JSON bất cứ lúc nào.</p>}
        <p>Thời điểm này không xác nhận tệp vẫn còn trên thiết bị. Hãy kiểm tra tệp trong thư mục Tải xuống và giữ thêm một bản ở nơi riêng tư.</p>
        <button type="button" className={buttonClass} onClick={onOpenBackup}>Mở sao lưu và khôi phục JSON</button>
      </section>

      <section className={panelClass} aria-labelledby="device-privacy-title">
        <h3 id="device-privacy-title" className={headingClass}>Dữ liệu riêng trên thiết bị</h3>
        <p>Gia phả được lưu trong trình duyệt trên thiết bị này. Dữ liệu gắn với địa chỉ website và hồ sơ trình duyệt đang dùng; không tự đồng bộ sang thiết bị khác và không tự chuyển bản sao lưu lên máy chủ.</p>
        <p>Xóa dữ liệu website, dùng trình duyệt hoặc hồ sơ khác, hay đổi địa chỉ ứng dụng có thể khiến bạn không còn thấy gia phả đã lưu.</p>
        <p><strong>PIN chỉ khóa hoặc che một phần giao diện, không mã hóa dữ liệu.</strong> Dữ liệu IndexedDB và tệp JSON vẫn đọc được với quyền truy cập phù hợp. Giữ thiết bị và bản sao lưu ở nơi riêng tư.</p>
      </section>

      <section className={panelClass} aria-labelledby="device-transfer-title">
        <h3 id="device-transfer-title" className={headingClass}>Chuyển gia phả sang thiết bị khác</h3>
        <ol className="list-decimal space-y-2 pl-5">
          <li>Trên thiết bị nguồn, mở sao lưu JSON, tải bản mới và kiểm tra tệp đã có trong thư mục Tải xuống.</li>
          <li>Tự chuyển tệp JSON sang thiết bị đích bằng cách riêng tư bạn chọn, chẳng hạn cáp hoặc công cụ chia sẻ tệp.</li>
          <li>Sao lưu dữ liệu đang có trên thiết bị đích trước. Mở ứng dụng, chọn tệp JSON và đọc kỹ xác nhận gộp hoặc thay thế.</li>
          <li>Đối chiếu thành viên, quan hệ, ảnh và nhật ký sau khi nhập; giữ tệp gốc cho đến khi đã kiểm tra xong.</li>
        </ol>
        <p>JSON giữ các bản ghi và nội dung đã nhúng. Ảnh, âm thanh hoặc tư liệu chỉ còn liên kết ngoài hay URL blob có thể không mở trên thiết bị khác; hãy giữ tệp gốc để bổ sung lại khi cần.</p>
        <p>Tệp JSON có thể chứa thông tin gia đình ở dạng đọc được. Chỉ chuyển cho người được phép nhận dữ liệu.</p>
      </section>
    </div>
  );
}
