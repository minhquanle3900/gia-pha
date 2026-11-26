import React, { useId, useMemo, useState } from 'react';
import {
  Bell,
  BellRing,
  BookOpen,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Flame,
  Info,
  MapPin,
} from 'lucide-react';
import { HeritageAvatar } from '../../components/HeritageAvatar';
import { useGenealogy } from '../../context/GenealogyContext';
import { useAnniversaryNotifications } from '../../hooks/useAnniversaryNotifications';
import { NavigationTab, Person } from '../../models/genealogy';
import { calculateUpcomingAnniversaries } from '../../services/lunarCalendarService';
import { NotificationSettingsModal } from '../history/NotificationSettingsModal';

interface UpcomingAnniversariesWidgetProps {
  onSelectPerson: (personId: string) => void;
  onNavigate: (tab: NavigationTab) => void;
}

const focusOutline = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-600';

export const UpcomingAnniversariesWidget: React.FC<UpcomingAnniversariesWidgetProps> = ({
  onSelectPerson,
  onNavigate,
}) => {
  const { people, branches, getBranchById } = useGenealogy();

  const [scope, setScope] = useState<'30days' | 'all'>('30days');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const titleId = useId();

  const { permission, requestPermission, sendImmediateReminderForPerson } =
    useAnniversaryNotifications();

  // Calculate upcoming anniversaries relative to today
  const allUpcoming = useMemo(() => {
    return calculateUpcomingAnniversaries(people, new Date());
  }, [people]);

  const branchAnniversaries = useMemo(() => {
    return selectedBranch === 'all'
      ? allUpcoming
      : allUpcoming.filter((item) => item.person.branchId === selectedBranch);
  }, [allUpcoming, selectedBranch]);

  const filteredList = useMemo(() => {
    return scope === 'all'
      ? branchAnniversaries
      : branchAnniversaries.filter((item) => item.daysRemaining >= 0 && item.daysRemaining <= 30);
  }, [branchAnniversaries, scope]);
  const nextSingleAnniversary = branchAnniversaries.find((item) => item.daysRemaining >= 0);

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
    <section aria-labelledby={titleId} className="min-w-0 space-y-4 rounded-2xl border border-ivory-200 bg-[#FFFDF9] p-4 shadow-xs dark:border-[#374A3D] sm:p-5">
      <div className="flex flex-col gap-3 border-b border-ivory-200 pb-4 dark:border-[#374A3D] lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-gold-100 text-gold-700 dark:bg-[#342D20] dark:text-amber-200">
            <Flame aria-hidden="true" className="size-4" />
          </span>
          <h3 id={titleId} className="font-serif text-2xl leading-tight font-bold text-bark-900 dark:text-stone-100">
            Nhắc ngày giỗ
          </h3>
          {filteredList.length > 0 && (
            <span className="rounded-full bg-ivory-100 px-2.5 py-1 text-xs font-semibold text-bark-800 dark:bg-[#25372C] dark:text-stone-200">
              {filteredList.length} lễ giỗ
            </span>
          )}
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <div role="group" aria-label="Phạm vi ngày giỗ" className="grid w-full grid-cols-2 gap-1 rounded-xl bg-ivory-100 p-1 dark:bg-[#1F2E25] sm:w-auto">
            <button
              type="button"
              aria-pressed={scope === '30days'}
              onClick={() => setScope('30days')}
              className={`min-h-11 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${focusOutline} ${
                scope === '30days'
                  ? 'bg-forest-800 text-white'
                  : 'text-bark-600 hover:bg-ivory-200 dark:text-stone-200 dark:hover:bg-[#334538]'
              }`}
            >
              30 ngày tới
            </button>
            <button
              type="button"
              aria-pressed={scope === 'all'}
              onClick={() => setScope('all')}
              className={`min-h-11 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors ${focusOutline} ${
                scope === 'all'
                  ? 'bg-forest-800 text-white'
                  : 'text-bark-600 hover:bg-ivory-200 dark:text-stone-200 dark:hover:bg-[#334538]'
              }`}
            >
              Tất cả
            </button>
          </div>

          {/* Branch filter if multiple branches */}
          {branches.length > 1 && (
            <select
              aria-label="Chi họ"
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className={`min-h-11 min-w-0 max-w-full flex-1 rounded-xl border border-ivory-300 bg-white px-3 text-base text-bark-800 sm:flex-none sm:text-sm ${focusOutline}`}
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
            aria-label="Cài đặt thông báo ngày giỗ"
            onClick={() => setNotifModalOpen(true)}
            className={`inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-ivory-300 px-3 text-sm font-semibold text-forest-800 transition-colors hover:bg-ivory-100 dark:border-[#374A3D] dark:text-emerald-200 dark:hover:bg-[#26382D] ${focusOutline}`}
            title="Cài đặt thông báo trình duyệt nhắc ngày giỗ"
          >
            <Bell aria-hidden="true" className="size-4 text-gold-700 dark:text-gold-500" />
            <span className="hidden xl:inline">Thông báo</span>
          </button>
        </div>
      </div>

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-forest-600/25 bg-forest-50 px-3 text-sm font-medium text-forest-800 dark:bg-[#25372C] dark:text-emerald-200">
          <div role="status" className="flex items-center gap-2 py-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            aria-label="Đóng thông báo"
            onClick={() => setToastMessage(null)}
            className={`min-h-11 min-w-11 shrink-0 rounded-lg text-bark-600 hover:text-bark-900 dark:text-stone-300 ${focusOutline}`}
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Anniversaries List or Empty State */}
      {filteredList.length === 0 ? (
        <div className="space-y-3 rounded-xl bg-ivory-50 p-4 text-center dark:bg-[#1F2E25] sm:p-6">
          <div className="mx-auto grid size-10 place-items-center rounded-xl bg-gold-100 text-gold-700 dark:bg-[#342D20] dark:text-amber-200">
            <Calendar aria-hidden="true" className="size-5" />
          </div>

          <div className="space-y-1">
            <h4 className="font-serif text-xl font-bold text-bark-900 dark:text-stone-100">
              {scope === '30days' ? 'Không có ngày giỗ trong 30 ngày tới' : 'Chưa có ngày giỗ được ghi nhận'}
            </h4>
            {scope === 'all' && (
              <p className="mx-auto max-w-md text-sm text-bark-600 dark:text-stone-300">
                {selectedBranch === 'all' ? 'Thêm ngày giỗ âm lịch trong hồ sơ người đã khuất.' : 'Chọn chi họ khác để xem ngày giỗ.'}
              </p>
            )}
          </div>

          {nextSingleAnniversary && (
            <div className="pt-2 max-w-md mx-auto">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ivory-200 bg-[#FFFDF9] p-3 text-left dark:border-[#374A3D]">
                <div className="flex min-w-0 items-center gap-2.5">
                  <HeritageAvatar
                    fullName={nextSingleAnniversary.person.fullName}
                    portraitUrl={nextSingleAnniversary.person.portraitUrl}
                    gender={nextSingleAnniversary.person.gender}
                    size="sm"
                    isLiving={false}
                  />
                  <div>
                    <span className="text-xs font-semibold text-gold-700 dark:text-[#E5BE6C]">
                      Lễ giỗ tiếp theo
                    </span>
                    <p className="font-serif text-lg leading-snug font-bold wrap-anywhere text-bark-900 dark:text-stone-100">
                      {nextSingleAnniversary.person.fullName}
                    </p>
                    <p className="text-sm text-bark-600 dark:text-stone-300">
                      Ngày {nextSingleAnniversary.lunarDay}/{nextSingleAnniversary.lunarMonth} Âm lịch
                      · Còn {nextSingleAnniversary.daysRemaining} ngày
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onSelectPerson(nextSingleAnniversary.person.id)}
                  className={`min-h-11 shrink-0 rounded-lg border border-ivory-300 px-3 text-sm font-semibold text-forest-800 hover:bg-ivory-100 dark:border-[#374A3D] dark:text-emerald-200 dark:hover:bg-[#26382D] ${focusOutline}`}
                >
                  Xem hồ sơ
                </button>
              </div>
            </div>
          )}

          {scope === '30days' && branchAnniversaries.length > 0 && (
            <button
              type="button"
              onClick={() => setScope('all')}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-forest-800 hover:underline dark:text-emerald-200 ${focusOutline}`}
            >
              <span>Xem tất cả ngày giỗ</span>
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredList.map((item) => {
            const branch = item.person.branchId ? getBranchById(item.person.branchId) : undefined;
            const isToday = item.daysRemaining === 0;
            const isTomorrow = item.daysRemaining === 1;
            const isVerySoon = item.daysRemaining > 1 && item.daysRemaining <= 3;

            return (
              <div
                key={item.person.id}
                className={`flex min-w-0 flex-col justify-between gap-3 rounded-xl border p-3 sm:p-4 ${
                  isToday
                    ? 'border-rose-300 bg-rose-50 dark:border-rose-900'
                    : isTomorrow
                    ? 'border-amber-200 bg-amber-50'
                    : 'border-ivory-200 bg-white dark:border-[#374A3D]'
                }`}
              >
                {/* Card Top: Avatar, Names, and Countdown Badge */}
                <div className="space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2.5">
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
                        <h4 className="font-serif text-lg leading-snug font-bold wrap-anywhere text-bark-900 dark:text-stone-100">
                          {item.person.fullName}
                        </h4>
                        {item.person.clanRole && (
                          <p className="text-xs font-semibold wrap-anywhere text-gold-700 dark:text-gold-500">
                            {item.person.clanRole}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Countdown Label */}
                    <div className="shrink-0 text-right tabular-nums">
                      {isToday ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-[#8C3A27] px-2.5 py-1 text-xs font-bold text-white">
                          <Flame aria-hidden="true" className="size-3" />
                          <span>Hôm nay · Chính Kỵ</span>
                        </span>
                      ) : isTomorrow ? (
                        <span className="inline-flex items-center gap-1 rounded-lg bg-gold-100 px-2.5 py-1 text-xs font-bold text-gold-700 dark:bg-[#342D20] dark:text-amber-200">
                          <Clock aria-hidden="true" className="size-3" />
                          <span>Ngày mai · Tiên Thường</span>
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold ${
                            isVerySoon ? 'text-rose-800' : 'text-bark-600 dark:text-stone-300'
                          }`}
                        >
                          <Clock aria-hidden="true" className="size-3 text-gold-700 dark:text-gold-500" />
                          <span>{item.daysRemaining < 0 ? 'Đã qua' : `Còn ${item.daysRemaining} ngày`}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dates Box */}
                  <div className="space-y-2 rounded-xl bg-ivory-50 p-3 text-xs dark:bg-[#1F2E25]">
                    <dl className="grid grid-cols-2 gap-2">
                      <div>
                        <dt className="text-bark-600 dark:text-stone-300">Âm lịch</dt>
                        <dd className="mt-0.5 text-sm font-semibold tabular-nums text-bark-900 dark:text-stone-100">
                          {item.lunarDay}/{item.lunarMonth}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-bark-600 dark:text-stone-300">Dương lịch (ước tính)</dt>
                        <dd className="mt-0.5 text-sm font-semibold tabular-nums text-bark-900 dark:text-stone-100">
                          {item.solarDate.toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}
                        </dd>
                      </div>
                    </dl>
                    {item.lunarNote && (
                      <p className="wrap-anywhere text-bark-600 italic dark:text-stone-300">
                        {item.lunarNote}
                      </p>
                    )}
                  </div>

                  {item.person.burialPlace && (
                    <div className="flex items-start gap-1.5 text-xs text-bark-600 dark:text-stone-300">
                      <MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-gold-700 dark:text-gold-500" />
                      <span className="min-w-0 wrap-anywhere">Phần mộ: {item.person.burialPlace}</span>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ivory-200 pt-2 dark:border-[#374A3D]">
                  <button
                    type="button"
                    onClick={() => onSelectPerson(item.person.id)}
                    className={`min-h-11 rounded-lg text-sm font-semibold text-forest-800 hover:underline dark:text-emerald-200 ${focusOutline}`}
                  >
                    Xem hồ sơ
                  </button>

                  <div className="flex items-center gap-2">
                    {/* Send immediate reminder button */}
                    <button
                      type="button"
                      aria-label={`Gửi nhắc ngày giỗ cho ${item.person.fullName}`}
                      onClick={() => handleSendReminder(item.person)}
                      className={`grid size-11 place-items-center rounded-lg border border-ivory-300 text-gold-700 transition-colors hover:bg-ivory-100 dark:border-[#374A3D] dark:text-gold-500 dark:hover:bg-[#26382D] ${focusOutline}`}
                      title="Phát thông báo nhắc nhở ngày giỗ tới trình duyệt"
                    >
                      <BellRing aria-hidden="true" className="size-4" />
                    </button>

                    {/* View prayers in Rites Assistant */}
                    <button
                      type="button"
                      onClick={() => onNavigate('rites')}
                      className={`flex min-h-11 items-center gap-1.5 rounded-lg bg-forest-800 px-3 text-xs font-semibold text-white transition-colors hover:bg-forest-700 ${focusOutline}`}
                      title="Mở Sổ văn khấn và hướng dẫn cúng tế"
                    >
                      <BookOpen aria-hidden="true" className="size-4" />
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
      <div className="flex items-start gap-2.5 rounded-xl bg-ivory-50 p-3 text-xs leading-relaxed text-bark-600 dark:bg-[#1F2E25] dark:text-stone-300">
        <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-gold-700 dark:text-gold-500" />
        <div className="space-y-0.5">
          <strong className="text-bark-900 dark:text-stone-100">Phong tục cúng giỗ gia tiên</strong>
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
    </section>
  );
};

export { UpcomingAnniversariesWidget as DeathAnniversaryReminder };

