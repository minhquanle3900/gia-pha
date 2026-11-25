import React, { useState } from 'react';
import {
  AlertCircle,
  Bell,
  BellOff,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  Send,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { HeritageAvatar } from '../../components/HeritageAvatar';
import { useGenealogy } from '../../context/GenealogyContext';
import { useAnniversaryNotifications } from '../../hooks/useAnniversaryNotifications';
import { formatLunarAnniversary } from '../../utils/dateUtils';

interface NotificationSettingsModalProps {
  open: boolean;
  onClose: () => void;
}

export const NotificationSettingsModal: React.FC<NotificationSettingsModalProps> = ({
  open,
  onClose,
}) => {
  const { people } = useGenealogy();
  const {
    isSupported,
    permission,
    settings,
    updateSettings,
    requestPermission,
    sendTestNotification,
    togglePersonTracking,
    checkRemindersNow,
  } = useAnniversaryNotifications();

  const [testStatus, setTestStatus] = useState<'idle' | 'sending' | 'success' | 'failed'>('idle');
  const [triggerStatus, setTriggerStatus] = useState<string | null>(null);

  if (!open) return null;

  // Filter deceased ancestors with anniversaries
  const ancestors = people.filter(
    (p) =>
      !p.isLiving &&
      ((p.deathAnniversaryLunar && (p.deathAnniversaryLunar.day || p.deathAnniversaryLunar.month)) ||
        p.deathDate)
  );

  const handleGrantPermission = async () => {
    const granted = await requestPermission();
    if (granted) {
      updateSettings({ enabled: true });
    }
  };

  const handleSendTest = async () => {
    setTestStatus('sending');
    const ok = await sendTestNotification();
    if (ok) {
      setTestStatus('success');
      setTimeout(() => setTestStatus('idle'), 3000);
    } else {
      setTestStatus('failed');
      setTimeout(() => setTestStatus('idle'), 4000);
    }
  };

  const handleCheckNow = async () => {
    const res = await checkRemindersNow();
    if (res.sentCount > 0) {
      setTriggerStatus(
        `Đã gửi thành công ${res.sentCount} thông báo nhắc nhở ngày giỗ đến trình duyệt!`
      );
    } else {
      setTriggerStatus('Hiện tại không có ngày giỗ nào rơi vào mốc cần nhắc nhở.');
    }
    setTimeout(() => setTriggerStatus(null), 4000);
  };

  const toggleLeadDay = (day: number) => {
    const current = settings.leadDays;
    const exists = current.includes(day);
    const next = exists ? current.filter((d) => d !== day) : [...current, day].sort((a, b) => a - b);
    updateSettings({ leadDays: next });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-2xl p-6 sm:p-7 space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#E7DFD4] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#FAF1D6] text-[#8C6D32]">
                <Bell className="w-4 h-4" />
              </span>
              <h3 className="text-lg font-serif font-bold text-[#1F1913]">
                Cài Đặt Thông Báo Trình Duyệt
              </h3>
            </div>
            <p className="text-xs text-stone-500">
              Nhận thông báo nhắc nhở trước ngày giỗ, tiết lễ kỵ của tiền nhân trực tiếp trên thiết
              bị của bạn.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Browser Permission Status Banner */}
        <div className="p-4 rounded-2xl border bg-[#FAF8F5] space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#3C3228]">Quyền thông báo trình duyệt</span>
            {permission === 'granted' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#EAF2ED] text-[#1B3B2B] border border-[#D2E2D7]">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Đã cấp quyền</span>
              </span>
            ) : permission === 'denied' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Bị chặn trong trình duyệt</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                <Clock className="w-3.5 h-3.5" />
                <span>Chưa kích hoạt</span>
              </span>
            )}
          </div>

          {permission !== 'granted' && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
              <p className="text-xs text-stone-600">
                {permission === 'denied'
                  ? 'Trình duyệt đang chặn thông báo từ trang web này. Vui lòng bấm vào biểu tượng ổ khóa cạnh thanh địa chỉ để cho phép "Notifications".'
                  : 'Cho phép Gia Phả Việt gửi thông báo trên màn hình khi đến kỳ tiết giỗ.'}
              </p>
              {permission !== 'denied' && (
                <button
                  type="button"
                  onClick={handleGrantPermission}
                  className="shrink-0 px-3.5 py-2 rounded-xl bg-[#1B3B2B] hover:bg-[#28503C] text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  Cấp quyền ngay
                </button>
              )}
            </div>
          )}

          {/* Test Notification Trigger */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-200/60">
            <span className="text-[11px] text-stone-500">
              Kiểm tra khả năng hiển thị thông báo và âm thanh trên máy
            </span>
            <button
              type="button"
              onClick={handleSendTest}
              disabled={testStatus === 'sending'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D5CABE] text-[#1B3B2B] hover:bg-stone-50 text-xs font-semibold transition-colors disabled:opacity-50"
            >
              <Send className="w-3 h-3 text-[#8C6D32]" />
              <span>
                {testStatus === 'sending'
                  ? 'Đang gửi...'
                  : testStatus === 'success'
                  ? 'Đã gửi thông báo!'
                  : testStatus === 'failed'
                  ? 'Chưa thể gửi (Kiểm tra quyền)'
                  : 'Gửi thông báo mẫu'}
              </span>
            </button>
          </div>
        </div>

        {/* Enable / Disable Master Toggle */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl border border-[#E7DFD4] bg-[#FAF8F5]/80">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-[#1F1913]">Bật hệ thống nhắc nhở tự động</p>
            <p className="text-[11px] text-stone-500">
              Tự động kiểm tra và nhắc nhở khi bạn mở ứng dụng hoặc hoạt động nền
            </p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enabled}
              onChange={(e) => updateSettings({ enabled: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-stone-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-stone-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1B3B2B]" />
          </label>
        </div>

        {/* Lead Days Settings */}
        <div className="space-y-2.5">
          <label className="block text-xs font-bold text-[#3C3228]">
            Thời điểm gửi lời nhắc trước ngày giỗ
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { days: 0, label: 'Đúng ngày giỗ', desc: 'Sáng ngày chính kỵ' },
              { days: 1, label: 'Trước 1 ngày', desc: 'Sắp cỗ, hương hoa' },
              { days: 3, label: 'Trước 3 ngày', desc: 'Báo tin cho họ hàng' },
              { days: 7, label: 'Trước 7 ngày', desc: 'Chuẩn bị lễ lớn' },
            ].map(({ days, label, desc }) => {
              const active = settings.leadDays.includes(days);
              return (
                <button
                  key={days}
                  type="button"
                  onClick={() => toggleLeadDay(days)}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    active
                      ? 'border-[#1B3B2B] bg-[#EAF2ED] text-[#1B3B2B] shadow-xs'
                      : 'border-[#E7DFD4] bg-white text-stone-600 hover:border-stone-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">{label}</span>
                    {active && <Check className="w-3.5 h-3.5" />}
                  </div>
                  <p className="text-[10px] text-stone-500 mt-0.5">{desc}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scope Selection: All ancestors vs selected */}
        <div className="space-y-2.5">
          <label className="block text-xs font-bold text-[#3C3228]">Phạm vi tiền nhân áp dụng</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => updateSettings({ allAncestors: true })}
              className={`p-3 rounded-xl border text-left transition-all ${
                settings.allAncestors
                  ? 'border-[#1B3B2B] bg-[#EAF2ED] text-[#1B3B2B]'
                  : 'border-[#E7DFD4] bg-white text-stone-600 hover:border-stone-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">Tất cả tiền nhân ({ancestors.length})</span>
                {settings.allAncestors && <Check className="w-3.5 h-3.5" />}
              </div>
              <p className="text-[10px] text-stone-500 mt-0.5">
                Nhắc nhở toàn bộ các ngày giỗ đã ghi chép trong gia phả
              </p>
            </button>

            <button
              type="button"
              onClick={() => updateSettings({ allAncestors: false })}
              className={`p-3 rounded-xl border text-left transition-all ${
                !settings.allAncestors
                  ? 'border-[#1B3B2B] bg-[#EAF2ED] text-[#1B3B2B]'
                  : 'border-[#E7DFD4] bg-white text-stone-600 hover:border-stone-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold">
                  Chỉ tiền nhân được chọn ({settings.trackedPersonIds.length})
                </span>
                {!settings.allAncestors && <Check className="w-3.5 h-3.5" />}
              </div>
              <p className="text-[10px] text-stone-500 mt-0.5">
                Chỉ nhắc nhở những bậc trưởng bối, chi trực hệ bạn đánh dấu
              </p>
            </button>
          </div>

          {/* List of ancestors if selective tracking */}
          {!settings.allAncestors && (
            <div className="space-y-1.5 max-h-48 overflow-y-auto p-2 rounded-xl border border-[#E7DFD4] bg-[#FAF8F5]">
              {ancestors.map((person) => {
                const isChecked = settings.trackedPersonIds.includes(person.id);
                return (
                  <div
                    key={person.id}
                    onClick={() => togglePersonTracking(person.id)}
                    className="flex items-center justify-between p-2 rounded-lg bg-white hover:bg-stone-50 cursor-pointer border border-stone-200 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <HeritageAvatar
                        fullName={person.fullName}
                        portraitUrl={person.portraitUrl}
                        gender={person.gender}
                        size="xs"
                      />
                      <div>
                        <p className="text-xs font-bold text-[#1F1913]">{person.fullName}</p>
                        <p className="text-[10px] text-[#8C6D32]">
                          {formatLunarAnniversary(person.deathAnniversaryLunar)}
                        </p>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => {}}
                      className="accent-[#1B3B2B] w-4 h-4 cursor-pointer"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Trigger status feedback */}
        {triggerStatus && (
          <div className="p-3 rounded-xl bg-[#EAF2ED] border border-[#D2E2D7] text-xs text-[#1B3B2B] font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#1B3B2B] shrink-0" />
            <span>{triggerStatus}</span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-[#E7DFD4]">
          <button
            type="button"
            onClick={handleCheckNow}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#D5CABE] bg-white text-xs font-semibold text-[#8C6D32] hover:bg-stone-50 transition-colors"
            title="Kiểm tra ngay xem hôm nay hoặc những ngày tới có lễ giỗ nào cần báo không"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Kiểm tra ngày giỗ hôm nay</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-[#1B3B2B] hover:bg-[#28503C] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            Hoàn tất & Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
