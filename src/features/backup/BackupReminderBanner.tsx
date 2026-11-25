import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  Download,
  HardDriveDownload,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useGenealogy } from '../../context/GenealogyContext';
import { NavigationTab } from '../../models/genealogy';
import {
  getBackupStatus,
  recordBackupTimestamp,
  snoozeBackupReminder,
} from '../../services/backupReminderService';
import { exportDatabaseSnapshotJson } from '../../services/jsonBackupService';

interface BackupReminderBannerProps {
  onNavigate: (tab: NavigationTab) => void;
}

export const BackupReminderBanner: React.FC<BackupReminderBannerProps> = ({ onNavigate }) => {
  const { settings, snapshot } = useGenealogy();

  const [dismissedLocally, setDismissedLocally] = useState(false);
  const [justExported, setJustExported] = useState(false);

  const backupStatus = getBackupStatus(settings);

  // If backup is fresh or snoozed or locally dismissed, do not render banner
  if (!backupStatus.needsBackup || backupStatus.isSnoozed || dismissedLocally) {
    return null;
  }

  const handleQuickDownloadJson = async () => {
    if (!snapshot) {
      onNavigate('data');
      return;
    }
    await exportDatabaseSnapshotJson(snapshot);
    recordBackupTimestamp();
    setJustExported(true);
    setTimeout(() => {
      setDismissedLocally(true);
    }, 2500);
  };

  const handleSnooze = () => {
    snoozeBackupReminder(7);
    setDismissedLocally(true);
  };

  if (justExported) {
    return (
      <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 shadow-xs flex items-center justify-between gap-3 text-emerald-900 animate-in fade-in">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">
            Đã tải tệp sao lưu JSON an toàn về máy của bạn! Dữ liệu dòng tộc được bảo tồn trọn vẹn.
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDismissedLocally(true)}
          className="text-stone-400 hover:text-stone-600 p-1"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-linear-to-r from-[#FFFBF2] via-[#FFFDF9] to-[#FAF5EB] border-2 border-[#E5CA97] p-4 sm:p-5 shadow-sm space-y-3 relative overflow-hidden transition-all">
      {/* Background seal watermark */}
      <div className="absolute right-4 -bottom-6 text-7xl font-serif text-[#C19B4C]/10 select-none pointer-events-none">
        保
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Left Information */}
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-[#FAF0DC] text-[#8C6D32] border border-[#E3CCA0] flex items-center justify-center shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5 text-[#9E6F28]" />
          </div>

          <div className="space-y-1 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-serif font-bold text-[#1F1913]">
                Nhắc nhở sao lưu dữ liệu gia phả định kỳ
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FAF0DC] text-[#8C6D32] border border-[#E3CCA0]">
                {backupStatus.daysSinceBackup === null
                  ? 'Chưa từng sao lưu'
                  : `Đã ${backupStatus.daysSinceBackup} ngày chưa sao lưu`}
              </span>
            </div>

            <p className="text-xs text-[#5C4F42] leading-relaxed">
              Dữ liệu phả hệ của dòng họ hiện được lưu trữ an toàn trong bộ nhớ cục bộ của trình duyệt.
              Để phòng ngừa việc vô tình xóa lịch sử duyệt web hoặc đổi thiết bị, quý vị nên tải bản
              sao lưu định kỳ về máy.
            </p>

            <p className="text-[11px] text-stone-500">
              Lần sao lưu gần nhất: <strong>{backupStatus.formattedLastBackup}</strong>
            </p>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex flex-wrap items-center gap-2 shrink-0 self-end md:self-center">
          <button
            type="button"
            onClick={handleQuickDownloadJson}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1B3B2B] hover:bg-[#254F3A] text-white text-xs font-bold shadow-xs transition-colors"
            title="Tải ngay tệp sao lưu JSON đầy đủ về thiết bị"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sao lưu JSON ngay</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('data')}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-white border border-[#D5CABE] text-[#1B3B2B] hover:bg-stone-50 text-xs font-semibold shadow-xs transition-colors"
            title="Đến trung tâm quản lý xuất nhập GEDCOM / JSON"
          >
            <span>Quản lý dữ liệu</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleSnooze}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            title="Nhắc lại sau 7 ngày"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
