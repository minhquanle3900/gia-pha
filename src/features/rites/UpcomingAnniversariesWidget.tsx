import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Bell,
  BellRing,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  Flame,
  Info,
  MapPin,
  Send,
  Sparkles,
  Users,
} from 'lucide-react';
import { HeritageAvatar } from '../../components/HeritageAvatar';
import { useGenealogy } from '../../context/GenealogyContext';
import { useAnniversaryNotifications } from '../../hooks/useAnniversaryNotifications';
import { NavigationTab, Person } from '../../models/genealogy';
import {
  calculateUpcomingAnniversaries,
  UpcomingAnniversaryInfo,
} from '../../services/lunarCalendarService';
import { formatFlexibleDate, formatLunarAnniversary } from '../../utils/dateUtils';
import { NotificationSettingsModal } from '../history/NotificationSettingsModal';

interface UpcomingAnniversariesWidgetProps {
  onSelectPerson: (personId: string) => void;
  onNavigate: (tab: NavigationTab) => void;
}

export const UpcomingAnniversariesWidget: React.FC<UpcomingAnniversariesWidgetProps> = ({
  onSelectPerson,
  onNavigate,
}) => {
  const { people, branches, getBranchById } = useGenealogy();

  const [scope, setScope] = useState<'30days' | 'all'>('30days');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const { permission, requestPermission, sendImmediateReminderForPerson } =
    useAnniversaryNotifications();

  // Calculate upcoming anniversaries relative to today
  const allUpcoming = useMemo(() => {
    return calculateUpcomingAnniversaries(people, new Date());
  }, [people]);

  // Filter based on branch and 30-day window
  const filteredList = useMemo(() => {
    let list = allUpcoming;

    if (selectedBranch !== 'all') {
      list = list.filter((item) => item.person.branchId === selectedBranch);
    }

    if (scope === '30days') {
      // Days remaining between 0 (today) and 30
      list = list.filter((item) => item.daysRemaining >= 0 && item.daysRemaining <= 30);
    }

    return list;
  }, [allUpcoming, selectedBranch, scope]);

  // The very next anniversary (even if beyond 30 days) for fallback display
  const nextSingleAnniversary = useMemo(() => {
    return allUpcoming.find((item) => item.daysRemaining >= 0) || allUpcoming[0] || null;
  }, [allUpcoming]);

  const handleSendReminder = async (person: Person) => {
    if (permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) {
        setNotifModalOpen(true);
        return;
      }
    }

    const success = await sendImmediateReminderForPerson(person);
    if (success) {
      setToastMessage(`Đã gửi thông báo nhắc lễ giỗ của tiền nhân ${person.fullName}!`);
    } else {
      setToastMessage(`Không thể gửi thông báo. Hãy kiểm tra cài đặt trình duyệt.`);
    }
    setTimeout(() => setToastMessage(null), 3500);
  };

  return (
    <div className="heritage-anniversaries rounded-3xl bg-linear-to-br from-[#FFFDF9] via-[#FAF7F2] to-[#FAF4EB] dark:from-[#17241C] dark:via-[#152219] dark:to-[#101713] border-2 border-[#EADCC8] dark:border-[#3B4D40] p-5 sm:p-6 shadow-sm space-y-5 relative overflow-hidden transition-all">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8DDCD] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-[#FAF0DC] dark:bg-[#2B2618] text-[#8C3A27] dark:text-[#E5BE6C] border border-[#E3CCA0] dark:border-[#64502A]">
              <Flame className="w-4 h-4 fill-[#8C3A27]" />
            </span>
            <h3 className="text-base sm:text-lg font-serif font-bold text-[#1F1913]">
              Nhắc Nhở Ngày Giỗ & Tiết Kỵ Sắp Tới
            </h3>
            {filteredList.length > 0 && (
              <span className="text-xs font-serif font-bold text-[#8C3A27] dark:text-[#E5BE6C] tabular-nums">
                · {filteredList.length} lễ giỗ
              </span>
            )}
          </div>
          <p className="text-xs text-[#6E5F50] dark:text-[#B9AEA0]">
            Tự động quy đổi âm dương lịch và nhắc nhở con cháu chuẩn bị lễ vật, cáo giỗ Tiên Thường và Chính Kỵ
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* 30 days vs All toggle */}
          <div className="inline-flex p-1 rounded-xl bg-[#EDE4D6] dark:bg-[#1F2E25] border border-[#DDD0BF] dark:border-[#3B4D40] text-xs">
            <button
              type="button"
              onClick={() => setScope('30days')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                scope === '30days'
                  ? 'bg-[#1B3B2B] text-white shadow-xs'
                  : 'text-[#6A5A4A] dark:text-[#C9BFB1] hover:text-[#1F1913] dark:hover:text-white'
              }`}
            >
              Trong 30 ngày tới
            </button>
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                scope === 'all'
                  ? 'bg-[#1B3B2B] text-white shadow-xs'
                  : 'text-[#6A5A4A] dark:text-[#C9BFB1] hover:text-[#1F1913] dark:hover:text-white'
              }`}
            >
              Tất cả trong năm
            </button>
          </div>

          {/* Branch filter if multiple branches */}
          {branches.length > 1 && (
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-[#D5CABE] bg-white text-xs font-semibold text-[#3D3126]"
            >
              <option value="all">Tất cả chi họ</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          {/* Notification settings modal trigger */}
          <button
            type="button"
            onClick={() => setNotifModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D5CABE] text-[#1B3B2B] hover:bg-stone-50 text-xs font-semibold shadow-2xs transition-colors"
            title="Cài đặt thông báo trình duyệt nhắc ngày giỗ"
          >
            <Bell className="w-3.5 h-3.5 text-[#C19B4C]" />
            <span className="hidden xl:inline">Cài đặt chuông báo</span>
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-medium flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-stone-400 hover:text-stone-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Anniversaries List or Empty State */}
      {filteredList.length === 0 ? (
        <div className="p-6 rounded-2xl bg-white border border-[#E7DFD4] text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FAF7F2] text-[#8C6D32] border border-[#E8DDCD] flex items-center justify-center mx-auto">
            <Calendar className="w-6 h-6 text-[#C19B4C]" />
          </div>

          <div className="space-y-1">
            <h4 className="font-serif font-bold text-sm text-[#1F1913]">
              Không có ngày giỗ nào trong 30 ngày tới
            </h4>
            <p className="text-xs text-[#695A4B] dark:text-[#B9AEA0] max-w-md mx-auto leading-relaxed">
              Trong 30 ngày tới không có tiết kỵ của các bậc tiền nhân. Con cháu có thể chuyển sang
              chế độ xem toàn năm hoặc tra cứu sổ văn khấn gia tiên.
            </p>
          </div>

          {nextSingleAnniversary && (
            <div className="pt-2 max-w-md mx-auto">
              <div className="p-3 rounded-xl bg-[#FAF5EB] dark:bg-[#1F2E25] border border-[#E8DDCD] dark:border-[#3B4D40] flex items-center justify-between gap-3 text-left">
                <div className="flex items-center gap-2.5">
                  <HeritageAvatar
                    fullName={nextSingleAnniversary.person.fullName}
                    portraitUrl={nextSingleAnniversary.person.portraitUrl}
                    gender={nextSingleAnniversary.person.gender}
                    size="sm"
                    isLiving={false}
                  />
                  <div>
                    <span className="text-[10px] font-bold text-[#8C6D32] uppercase">
                      Lễ giỗ gần nhất tiếp theo:
                    </span>
                    <p className="text-xs font-serif font-bold text-[#1F1913]">
                      {nextSingleAnniversary.person.fullName}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      Ngày {nextSingleAnniversary.lunarDay}/{nextSingleAnniversary.lunarMonth} Âm lịch
                      · Còn {nextSingleAnniversary.daysRemaining} ngày
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectPerson(nextSingleAnniversary.person.id)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-[#D5CABE] text-[#1B3B2B] text-xs font-semibold hover:bg-stone-50 shrink-0"
                >
                  Xem hồ sơ
                </button>
              </div>
            </div>
          )}

          <div className="pt-1">
            <button
              type="button"
              onClick={() => setScope('all')}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1B3B2B] hover:underline"
            >
              <span>Xem danh sách ngày giỗ cả năm</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredList.map((item) => {
            const branch = item.person.branchId ? getBranchById(item.person.branchId) : undefined;
            const isToday = item.daysRemaining === 0;
            const isTomorrow = item.daysRemaining === 1;
            const isVerySoon = item.daysRemaining <= 3;

            return (
              <div
                key={item.person.id}
                className={`rounded-2xl border transition-all p-4 flex flex-col justify-between space-y-3 shadow-2xs hover:shadow-sm ${
                  isToday
                    ? 'bg-gradient-to-br from-[#FFF5F2] to-[#FFEDE8] dark:from-[#321F1B] dark:to-[#2A1717] border-rose-300 dark:border-rose-700 ring-2 ring-rose-300/40'
                    : isTomorrow
                    ? 'bg-gradient-to-br from-[#FFF8EE] to-[#FFF1DE] dark:from-[#302716] dark:to-[#252014] border-amber-300 dark:border-amber-700 ring-1 ring-amber-300/40'
                    : 'bg-white border-[#E7DFD4] hover:border-[#C19B4C]'
                }`}
              >
                {/* Card Top: Avatar, Names, and Countdown Badge */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <HeritageAvatar
                        fullName={item.person.fullName}
                        portraitUrl={item.person.portraitUrl}
                        gender={item.person.gender}
                        size="md"
                        isLiving={false}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.person.generation && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-[#1B3B2B]/10 text-[#1B3B2B]">
                              Đời {item.person.generation}
                            </span>
                          )}
                          {branch && (
                            <span className="text-[10px] text-stone-500 font-medium truncate max-w-[100px]">
                              {branch.name}
                            </span>
                          )}
                        </div>
                        <h4
                          onClick={() => onSelectPerson(item.person.id)}
                          className="text-sm font-serif font-bold text-[#1F1913] hover:text-[#1B3B2B] cursor-pointer truncate"
                          title={item.person.fullName}
                        >
                          {item.person.fullName}
                        </h4>
                        {item.person.clanRole && (
                          <p className="text-[10px] text-[#8C6D32] font-semibold truncate">
                            {item.person.clanRole}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Countdown Label */}
                    <div className="shrink-0 text-right tabular-nums">
                      {isToday ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#8C3A27] text-white shadow-xs">
                          <Flame className="w-3 h-3 fill-white" />
                          <span>HÔM NAY (Chính Kỵ)</span>
                        </span>
                      ) : isTomorrow ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-[#C19B4C] text-[#2E241E] shadow-xs">
                          <Clock className="w-3 h-3" />
                          <span>NGÀY MAI (Tiên Thường)</span>
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold ${
                            isVerySoon ? 'text-[#8C3A27] dark:text-[#F0B6A5]' : 'text-[#695843] dark:text-[#C9BFB1]'
                          }`}
                        >
                          <Clock className="w-3 h-3 text-[#C19B4C]" />
                          <span>Còn {item.daysRemaining} ngày</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dates Box */}
                  <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#ECE4D8] space-y-1 text-xs">
                    <div className="flex items-center justify-between text-[#8C3A27] dark:text-[#F0B6A5] font-semibold">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Ngày Âm lịch:</span>
                      </span>
                      <span>
                        {item.lunarDay} tháng {item.lunarMonth} Âm lịch
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-stone-600 text-[11px]">
                      <span>Dương lịch năm nay:</span>
                      <span className="font-medium text-stone-800">
                        {item.solarDate.toLocaleDateString('vi-VN', {
                          weekday: 'short',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    </div>

                    {item.lunarNote && (
                      <p className="text-[11px] text-[#6B5A47] dark:text-[#B9AEA0] italic pt-0.5 border-t border-stone-200 line-clamp-1">
                        "{item.lunarNote}"
                      </p>
                    )}
                  </div>

                  {item.person.burialPlace && (
                    <div className="flex items-center gap-1 text-[11px] text-stone-500 truncate">
                      <MapPin className="w-3 h-3 text-[#C19B4C] shrink-0" />
                      <span className="truncate">Phần mộ: {item.person.burialPlace}</span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-[#F0EAE1] flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectPerson(item.person.id)}
                    className="text-xs font-semibold text-[#1B3B2B] hover:underline"
                  >
                    Xem hồ sơ
                  </button>

                  <div className="flex items-center gap-1.5">
                    {/* Send immediate reminder button */}
                    <button
                      type="button"
                      onClick={() => handleSendReminder(item.person)}
                      className="p-1.5 rounded-lg border border-[#D5CABE] bg-white text-stone-600 hover:text-[#1B3B2B] hover:bg-stone-50 text-xs transition-colors"
                      title="Phát thông báo nhắc nhở ngày giỗ tới trình duyệt"
                    >
                      <BellRing className="w-3.5 h-3.5 text-[#C19B4C]" />
                    </button>

                    {/* View prayers in Rites Assistant */}
                    <button
                      type="button"
                      onClick={() => onNavigate('rites')}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#1B3B2B] hover:bg-[#28503C] text-white text-xs font-semibold transition-colors"
                      title="Mở Sổ văn khấn và hướng dẫn cúng tế"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Văn khấn</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Cultural Ritual Tip Footer */}
      <div className="p-3.5 rounded-2xl bg-[#FAF6EE] dark:bg-[#1F2E25] border border-[#E6DCB8] dark:border-[#3B4D40] flex items-start gap-2.5 text-xs text-[#6B5B47] dark:text-[#B9AEA0] leading-relaxed">
        <Info className="w-4 h-4 text-[#C19B4C] shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <strong className="text-[#3E3326] dark:text-[#EDE6DC]">Phong tục cúng giỗ gia tiên cổ truyền:</strong>
          <p>
            Chiều hôm trước ngày giỗ cử hành <strong>Lễ Tiên Thường</strong> (lễ cáo giỗ, thỉnh rước
            chư vị tiên tổ về ngự). Sáng ngày hôm sau là <strong>Lễ Chính Kỵ</strong> (dâng mâm cỗ cúng,
            đọc bài văn khấn và sum họp con cháu nội ngoại).
          </p>
        </div>
      </div>

      {/* Notification Settings Modal */}
      <NotificationSettingsModal
        open={notifModalOpen}
        onClose={() => setNotifModalOpen(false)}
      />
    </div>
  );
};

export { UpcomingAnniversariesWidget as DeathAnniversaryReminder };

