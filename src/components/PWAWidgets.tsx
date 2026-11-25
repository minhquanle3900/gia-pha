import React from 'react';
import { Download, WifiOff } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAWidgets: React.FC = () => {
  const { isInstallable, isOnline, triggerInstall } = usePWAInstall();

  return (
    <div className="flex items-center gap-2">
      {!isOnline && (
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-medium shadow-xs"
          title="Ứng dụng đang hoạt động hoàn toàn ngoại tuyến từ bộ nhớ thiết bị"
        >
          <WifiOff className="w-3.5 h-3.5 text-amber-700" />
          <span>Ngoại tuyến (Offline-First)</span>
        </div>
      )}

      {isInstallable && (
        <button
          type="button"
          onClick={triggerInstall}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#C19B4C] hover:bg-[#A98436] text-white text-xs font-semibold shadow-xs transition-colors"
          title="Cài đặt Gia Phả Việt vào màn hình chính của điện thoại hoặc máy tính"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Cài ứng dụng</span>
        </button>
      )}
    </div>
  );
};
