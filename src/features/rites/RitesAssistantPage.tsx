import React, { useId, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  Calendar,
  CheckCircle,
  CheckSquare,
  Compass,
  Copy,
  Flame,
  MapPin,
  Sparkles,
  Users,
  Utensils,
} from 'lucide-react';
import { HeritageAvatar } from '../../components/HeritageAvatar';
import { useGenealogy } from '../../context/GenealogyContext';
import {
  calculateUpcomingAnniversaries,
  getCanChiYear,
  PrayerTemplate,
  REGIONAL_RITE_GUIDES,
  RITE_PREPARATION_CHECKLIST,
  TRADITIONAL_PRAYERS,
  VietnameseRegion,
} from '../../services/lunarCalendarService';
import { useAnniversaryNotifications } from '../../hooks/useAnniversaryNotifications';
import { NotificationSettingsModal } from '../history/NotificationSettingsModal';

interface RitesAssistantPageProps {
  onSelectPerson: (personId: string) => void;
}

const riteTabs = [
  { key: 'calendar', label: 'Lịch giỗ tiền nhân', icon: Calendar },
  { key: 'prayers', label: 'Sổ văn khấn', icon: BookOpen },
  { key: 'regional', label: 'Phong tục ba miền', icon: Compass },
  { key: 'checklist', label: 'Chuẩn bị lễ giỗ', icon: CheckSquare },
] as const;

const riteRegions = [
  { id: 'north', label: 'Miền Bắc', prayerId: 'prayer_truong_toc' },
  { id: 'central', label: 'Miền Trung', prayerId: 'prayer_mien_trung_tien_thuong' },
  { id: 'south', label: 'Miền Nam', prayerId: 'prayer_mien_nam_dam_gio' },
] as const;

const regionalTerms = [
  ['father', 'Cha / Bố'],
  ['mother', 'Mẹ / Má'],
  ['grandfather', 'Ông'],
  ['grandmother', 'Bà'],
  ['elderBrother', 'Anh trưởng / Anh Hai'],
  ['uncle', 'Bác / Chú / Cậu'],
] as const;

const focusOutline = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-600';

export const RitesAssistantPage: React.FC<RitesAssistantPageProps> = ({ onSelectPerson }) => {
  const { people, settings } = useGenealogy();
  const { permission, settings: notifSettings } = useAnniversaryNotifications();
  const [notifModalOpen, setNotifModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<(typeof riteTabs)[number]['key']>('calendar');
  const [selectedRegion, setSelectedRegion] = useState<VietnameseRegion>('north');
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerTemplate>(TRADITIONAL_PRAYERS[0]);
  const [representativeName, setRepresentativeName] = useState('Trưởng nam / Tộc trưởng');
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied' | 'error'>('idle');
  const prayerSelectId = useId();
  const representativeId = useId();
  const currentYear = new Date().getFullYear();
  const currentGuide = REGIONAL_RITE_GUIDES[selectedRegion];

  // Checked state for preparation checklist
  const [checkedTasks, setCheckedTasks] = useState<Set<string>>(new Set());

  // Upcoming anniversaries
  const upcomingAnniversaries = useMemo(() => {
    return calculateUpcomingAnniversaries(people);
  }, [people]);

  const toggleTask = (id: string) => {
    setCheckedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Interpolated prayer text
  const renderedPrayerText = useMemo(() => {
    let t = selectedPrayer.text;
    t = t.replace(/{CLAN_NAME}/g, settings.clanName || 'Việt Nam');
    t = t.replace(/{HALL_LOCATION}/g, settings.ancestralHallLocation || 'Từ đường gia tộc');
    t = t.replace(/{REPRESENTATIVE_NAME}/g, representativeName);
    t = t.replace(/{CAN_CHI_YEAR}/g, `${new Date().getFullYear()}`);

    const nearest = upcomingAnniversaries[0];
    if (nearest) {
      t = t.replace(
        /{LUNAR_DATE}/g,
        `Ngày ${nearest.lunarDay} tháng ${nearest.lunarMonth} Âm lịch`
      );
      t = t.replace(/{ANCESTOR_NAME}/g, nearest.person.fullName);
      t = t.replace(/{ANCESTOR_ROLE}/g, nearest.person.clanRole || 'Tiền nhân');
      t = t.replace(
        /{ANCESTOR_GEN}/g,
        nearest.person.generation ? `Đời thứ ${nearest.person.generation}` : 'Thế hệ trước'
      );
    } else {
      t = t.replace(/{LUNAR_DATE}/g, 'Ngày rằm tiết lệ Âm lịch');
      t = t.replace(/{ANCESTOR_NAME}/g, 'Đức Tiền Nhân');
      t = t.replace(/{ANCESTOR_ROLE}/g, 'Bậc Tiên Liệt');
      t = t.replace(/{ANCESTOR_GEN}/g, 'Các Đời');
    }
    t = t.replace(/{RESIDENCE_LOCATION}/g, settings.ancestralHallLocation || 'Việt Nam');
    return t;
  }, [selectedPrayer, settings, representativeName, upcomingAnniversaries]);

  const handleCopyPrayer = async () => {
    try {
      await navigator.clipboard.writeText(renderedPrayerText);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus('idle'), 2500);
    } catch {
      setCopyStatus('error');
    }
  };

  const selectPrayer = (prayer: PrayerTemplate) => {
    setSelectedPrayer(prayer);
    setCopyStatus('idle');
  };

  return (
    <div className="min-w-0 space-y-5 pb-16 sm:space-y-6">
      <header className="flex items-center gap-3 sm:gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl border border-ivory-200 bg-gold-100 text-gold-700 dark:border-[#374A3D] dark:bg-[#283426] dark:text-[#E5BE6C]">
          <Calendar aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="heritage-display text-3xl text-forest-800 dark:text-emerald-200 sm:text-4xl">
            Lễ giỗ và nghi lễ
          </h2>
          <p className="heritage-intro mt-0.5 text-base text-gold-700 dark:text-[#E5BE6C]">Tưởng nhớ tiền nhân</p>
        </div>
      </header>

      <div role="group" aria-label="Nội dung lễ giỗ" className="grid min-w-0 grid-cols-2 gap-1.5 rounded-2xl border border-ivory-200 bg-ivory-100 p-1.5 dark:border-[#374A3D] dark:bg-[#1F2E25] sm:grid-cols-4">
        {riteTabs.map(({ key, label, icon: Icon }) => {
          const isActive = activeTab === key;
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveTab(key)}
              className={`flex min-h-11 min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2 text-xs font-semibold transition-colors sm:gap-2 sm:text-sm ${focusOutline} ${
                isActive
                  ? 'bg-forest-800 text-white shadow-xs'
                  : 'text-bark-600 hover:bg-ivory-200 dark:text-stone-200 dark:hover:bg-[#334538]'
              }`}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              <span>{label}</span>
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. LỊCH GIỖ & NHẮC NHỞ */}
      {/* ========================================================================= */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border border-ivory-200 bg-[#FFFDF9] p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-bark-800 dark:text-stone-200">
              Năm {currentYear} <span aria-hidden="true" className="mx-1 text-gold-700 dark:text-gold-500">·</span> {getCanChiYear(currentYear)}
            </p>
            <button
              type="button"
              onClick={() => setNotifModalOpen(true)}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-ivory-300 px-3 py-2 text-sm font-semibold text-forest-800 transition-colors hover:bg-ivory-100 dark:border-[#374A3D] dark:text-emerald-200 dark:hover:bg-[#26382D] ${focusOutline}`}
            >
              <Bell aria-hidden="true" className="size-4 shrink-0 text-gold-700 dark:text-gold-500" />
              <span>
                Cài đặt thông báo{permission === 'granted' && notifSettings.enabled ? ' (Đang bật)' : ''}
              </span>
            </button>
          </div>

          {upcomingAnniversaries.length === 0 ? (
            <div className="space-y-2 rounded-2xl border border-ivory-200 bg-[#FFFDF9] px-4 py-8 text-center sm:py-12">
              <Calendar aria-hidden="true" className="mx-auto size-7 text-gold-700 dark:text-gold-500" />
              <p className="font-serif text-xl font-bold text-bark-900 dark:text-stone-100">
                Chưa có ngày giỗ âm lịch nào được ghi nhận
              </p>
              <p className="mx-auto max-w-md text-sm text-bark-600 dark:text-stone-300">
                Thêm ngày giỗ âm lịch trong hồ sơ thành viên đã khuất để xem ngày dương lịch tương ứng.
              </p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {upcomingAnniversaries.map((anniv) => {
                const p = anniv.person;
                const isUpcomingSoon = anniv.daysRemaining >= 0 && anniv.daysRemaining <= 14;

                return (
                  <li
                    key={p.id}
                    className={`group relative flex min-w-0 flex-col gap-3 rounded-2xl border bg-[#FFFDF9] p-4 shadow-xs transition-colors hover:border-gold-600 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-gold-600 ${
                        isUpcomingSoon ? 'border-gold-500 dark:border-gold-700' : 'border-ivory-200 dark:border-[#374A3D]'
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      <HeritageAvatar
                        fullName={p.fullName}
                        portraitUrl={p.portraitUrl}
                        gender={p.gender}
                        size="sm"
                        isLiving={false}
                      />
                      <div className="min-w-0 flex-1">
                        <h3>
                          <button
                            type="button"
                            onClick={() => onSelectPerson(p.id)}
                            className="block text-left font-serif text-xl leading-snug font-bold wrap-anywhere text-bark-900 after:absolute after:inset-0 focus:outline-none dark:text-stone-100"
                          >
                            {p.fullName}
                          </button>
                        </h3>
                        {p.clanRole && <span className="block text-sm wrap-anywhere text-bark-600 dark:text-stone-300">{p.clanRole}</span>}
                      </div>
                      <ArrowUpRight aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-gold-700 group-hover:text-forest-800 dark:text-gold-500" />
                    </div>

                    <span className="grid grid-cols-2 gap-2 rounded-xl bg-ivory-50 p-3 text-xs dark:bg-[#1F2E25]">
                      <span>
                        <span className="block text-bark-600 dark:text-stone-300">Âm lịch</span>
                        <span className="mt-0.5 block text-sm font-semibold tabular-nums text-bark-900 dark:text-stone-100">
                          {anniv.lunarDay}/{anniv.lunarMonth}
                        </span>
                      </span>
                      <span>
                        <span className="block text-bark-600 dark:text-stone-300">Dương lịch (ước tính)</span>
                        <span className="mt-0.5 block text-sm font-semibold tabular-nums text-bark-900 dark:text-stone-100">
                          {anniv.solarDate.toLocaleDateString('vi-VN')}
                        </span>
                      </span>
                    </span>
                    {anniv.lunarNote && (
                      <span className="text-sm leading-relaxed wrap-anywhere text-bark-600 italic dark:text-stone-300">
                        {anniv.lunarNote}
                      </span>
                    )}
                    {p.burialPlace && (
                      <span className="flex items-start gap-1.5 text-xs wrap-anywhere text-bark-600 dark:text-stone-300">
                        <MapPin aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-gold-700 dark:text-gold-500" />
                        {p.burialPlace}
                      </span>
                    )}
                    <span className={`mt-auto self-start rounded-full px-2.5 py-1 text-xs font-semibold ${isUpcomingSoon
                      ? 'bg-gold-100 text-gold-700 dark:bg-[#342D20] dark:text-amber-200'
                      : 'bg-forest-50 text-forest-800 dark:bg-[#25372C] dark:text-emerald-200'
                    }`}>
                      {anniv.daysRemaining < 0
                        ? 'Đã qua'
                        : anniv.daysRemaining === 0 ? 'Hôm nay' : `Còn ${anniv.daysRemaining} ngày`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SỔ VĂN KHẤN CỔ TRUYỀN */}
      {/* ========================================================================= */}
      {activeTab === 'prayers' && (
        <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(14rem,1fr)_minmax(0,2.25fr)] lg:items-start">
          <div className="min-w-0 space-y-4 rounded-2xl border border-ivory-200 bg-[#FFFDF9] p-4 dark:border-[#374A3D] sm:p-5">
            <div className="space-y-1.5 lg:hidden">
              <label htmlFor={prayerSelectId} className="text-sm font-semibold text-bark-800 dark:text-stone-200">
                Bài văn khấn
              </label>
              <select
                id={prayerSelectId}
                value={selectedPrayer.id}
                onChange={(e) => {
                  const prayer = TRADITIONAL_PRAYERS.find((item) => item.id === e.target.value);
                  if (prayer) selectPrayer(prayer);
                }}
                className={`min-h-11 w-full rounded-xl border border-ivory-300 bg-white px-3 py-2 text-base text-bark-900 ${focusOutline}`}
              >
                {TRADITIONAL_PRAYERS.map((prayer) => (
                  <option key={prayer.id} value={prayer.id}>{prayer.title}</option>
                ))}
              </select>
            </div>
            <div role="group" aria-label="Bài văn khấn" className="hidden lg:grid lg:gap-1.5">
              {TRADITIONAL_PRAYERS.map((prayer) => (
                <button
                  key={prayer.id}
                  type="button"
                  aria-pressed={selectedPrayer.id === prayer.id}
                  onClick={() => selectPrayer(prayer)}
                  className={`min-h-11 rounded-xl border px-3 py-2.5 text-left transition-colors ${focusOutline} ${
                    selectedPrayer.id === prayer.id
                      ? 'border-forest-800 bg-forest-800 text-white'
                      : 'border-transparent text-bark-900 hover:bg-ivory-50 dark:text-stone-100 dark:hover:bg-[#1F2E25]'
                  }`}
                >
                  <span className="block text-sm font-semibold">{prayer.title}</span>
                  <span
                    className={`mt-0.5 block text-xs ${
                      selectedPrayer.id === prayer.id ? 'text-[#DBC599]' : 'text-bark-600 dark:text-stone-300'
                    }`}
                  >
                    {prayer.targetRitual}
                  </span>
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <label htmlFor={representativeId} className="block text-sm font-semibold text-bark-800 dark:text-stone-200">
                Người đứng cúng (tín chủ)
              </label>
              <input
                id={representativeId}
                type="text"
                value={representativeName}
                onChange={(e) => setRepresentativeName(e.target.value)}
                placeholder="VD: Trưởng nam Trần Văn Khải"
                className={`min-h-11 w-full rounded-xl border border-ivory-300 bg-white px-3 py-2 text-base text-bark-900 ${focusOutline}`}
              />
            </div>
          </div>

          <section className="min-w-0 space-y-4 rounded-2xl border border-ivory-200 bg-[#FFFDF9] p-4 shadow-xs dark:border-[#374A3D] sm:p-6">
            <div className="flex flex-col gap-3 border-b border-ivory-200 pb-4 dark:border-[#374A3D] sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1">
                <h3 className="heritage-heading text-2xl text-bark-900 dark:text-stone-100">
                  {selectedPrayer.title}
                </h3>
                <p className="text-sm text-gold-700 dark:text-[#E5BE6C]">{selectedPrayer.regionalNotes}</p>
              </div>

              <button
                type="button"
                onClick={handleCopyPrayer}
                className={`inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-ivory-300 px-3 py-2 text-sm font-semibold text-forest-800 transition-colors hover:bg-ivory-100 dark:border-[#374A3D] dark:text-emerald-200 dark:hover:bg-[#26382D] ${focusOutline}`}
              >
                {copyStatus === 'copied'
                  ? <CheckCircle aria-hidden="true" className="size-4" />
                  : <Copy aria-hidden="true" className="size-4" />}
                <span>{copyStatus === 'copied' ? 'Đã sao chép' : 'Sao chép văn khấn'}</span>
              </button>
            </div>

            <div role="status" className={copyStatus === 'error' ? 'text-sm text-red-800 dark:text-red-200' : 'sr-only'}>
              {copyStatus === 'copied' && 'Đã sao chép bài văn khấn.'}
              {copyStatus === 'error' && 'Không sao chép được. Bạn có thể chọn và sao chép văn bản bên dưới.'}
            </div>
            <p className="heritage-body select-text rounded-xl bg-ivory-50 p-3 text-lg wrap-anywhere whitespace-pre-line text-bark-900 dark:bg-[#1F2E25] dark:text-stone-100 sm:p-6">
              {renderedPrayerText}
            </p>
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. NGHI THỨC & DANH MỤC CHUẨN BỊ */}
      {/* ========================================================================= */}
      {activeTab === 'checklist' && (
        <section className="mx-auto max-w-3xl space-y-4 rounded-2xl border border-ivory-200 bg-[#FFFDF9] p-4 dark:border-[#374A3D] sm:p-6">
          <h3 className="border-b border-ivory-200 pb-3 font-serif text-2xl leading-tight font-bold text-bark-900 dark:border-[#374A3D] dark:text-stone-100">
            Việc cần chuẩn bị
          </h3>
          <ul className="space-y-2">
            {RITE_PREPARATION_CHECKLIST.map((item) => {
              const isDone = checkedTasks.has(item.id);
              return (
                <li key={item.id}>
                  <label className={`flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors focus-within:border-gold-600 ${
                    isDone
                      ? 'border-forest-600/30 bg-forest-50 dark:border-[#374A3D] dark:bg-[#25372C]'
                      : 'border-ivory-200 bg-ivory-50 hover:border-gold-600 dark:border-[#374A3D] dark:bg-[#1F2E25]'
                  }`}>
                    <input
                      type="checkbox"
                      checked={isDone}
                      onChange={() => toggleTask(item.id)}
                      className={`mt-0.5 size-5 shrink-0 accent-forest-800 ${focusOutline}`}
                    />
                    <span className="min-w-0">
                      <span className="mb-0.5 block text-xs font-semibold text-gold-700 dark:text-[#E5BE6C]">{item.category}</span>
                      <span className={`block text-sm text-bark-900 dark:text-stone-100 ${isDone ? 'line-through' : ''}`}>{item.task}</span>
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ========================================================================= */}
      {/* 3. PHONG TỤC CÚNG GIỖ 3 MIỀN (BẮC - TRUNG - NAM) */}
      {/* ========================================================================= */}
      {activeTab === 'regional' && (
        <div className="mx-auto max-w-6xl space-y-4">
          <header className="flex min-w-0 flex-col gap-4 rounded-2xl border border-ivory-200 bg-[#FFFDF9] p-4 dark:border-[#374A3D] sm:p-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 space-y-1">
              <h3 className="heritage-heading text-2xl text-bark-900 dark:text-stone-100">{currentGuide.regionName}</h3>
              <p className="text-sm text-gold-700 dark:text-[#E5BE6C]">{currentGuide.subTitle}</p>
            </div>
            <div role="group" aria-label="Vùng miền" className="grid min-w-0 grid-cols-3 gap-1 rounded-xl bg-ivory-100 p-1 dark:bg-[#1F2E25] lg:min-w-72">
              {riteRegions.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selectedRegion === id}
                  onClick={() => setSelectedRegion(id)}
                  className={`min-h-11 rounded-lg px-1.5 py-2 text-xs font-semibold transition-colors sm:px-3 sm:text-sm ${focusOutline} ${
                    selectedRegion === id
                      ? 'bg-forest-800 text-white'
                      : 'text-bark-600 hover:bg-ivory-200 dark:text-stone-200 dark:hover:bg-[#334538]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </header>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="space-y-3 rounded-2xl border border-ivory-200 bg-[#FFFDF9] p-4 dark:border-[#374A3D] sm:p-5">
              <h4 className="flex items-center gap-2 font-serif text-xl font-bold text-forest-800 dark:text-emerald-200">
                <Utensils aria-hidden="true" className="size-4 shrink-0 text-gold-700 dark:text-gold-500" />
                Mâm cỗ truyền thống
              </h4>
              <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-bark-800 marker:text-gold-700 dark:text-stone-200">
                {currentGuide.traditionalDishes.map((dish) => <li key={dish}>{dish}</li>)}
              </ul>
            </section>

            <section className="space-y-4 rounded-2xl border border-ivory-200 bg-[#FFFDF9] p-4 dark:border-[#374A3D] sm:p-5">
              <h4 className="flex items-center gap-2 font-serif text-xl font-bold text-forest-800 dark:text-emerald-200">
                <Users aria-hidden="true" className="size-4 shrink-0 text-gold-700 dark:text-gold-500" />
                Xưng hô thân tộc
              </h4>
              <dl className="grid grid-cols-2 gap-2">
                {regionalTerms.map(([key, label]) => (
                  <div key={key} className="min-w-0 rounded-xl bg-ivory-50 p-2.5 dark:bg-[#1F2E25]">
                    <dt className="text-xs text-bark-600 dark:text-stone-300">{label}</dt>
                    <dd className="mt-0.5 text-sm font-semibold wrap-anywhere text-bark-900 dark:text-stone-100">{currentGuide.kinshipTerms[key]}</dd>
                  </div>
                ))}
              </dl>
              <div className="space-y-2 border-t border-ivory-200 pt-3 dark:border-[#374A3D]">
                <h5 className="flex items-center gap-2 text-sm font-semibold text-bark-900 dark:text-stone-100">
                  <Flame aria-hidden="true" className="size-4 shrink-0 text-gold-700 dark:text-gold-500" />
                  Tập quán và nghi lễ
                </h5>
                <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-bark-800 marker:text-gold-700 dark:text-stone-200">
                  {currentGuide.customRituals.map((ritual) => <li key={ritual}>{ritual}</li>)}
                </ul>
              </div>
            </section>

            <section className="space-y-4 rounded-2xl border border-ivory-200 bg-[#FFFDF9] p-4 dark:border-[#374A3D] sm:p-5 lg:col-span-2">
              <h4 className="flex items-center gap-2 font-serif text-xl font-bold text-forest-800 dark:text-emerald-200">
                <Sparkles aria-hidden="true" className="size-4 shrink-0 text-gold-700 dark:text-gold-500" />
                Bài trí bàn thờ gia tiên
              </h4>
              <ul className="grid gap-3 sm:grid-cols-3">
                {currentGuide.altarArrangementTips.map((tip) => (
                  <li key={tip} className="rounded-xl bg-ivory-50 p-3 text-sm leading-relaxed text-bark-800 dark:bg-[#1F2E25] dark:text-stone-200">
                    {tip}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  const prayerId = riteRegions.find((region) => region.id === selectedRegion)?.prayerId;
                  const prayer = TRADITIONAL_PRAYERS.find((item) => item.id === prayerId);
                  if (prayer) selectPrayer(prayer);
                  setActiveTab('prayers');
                  window.scrollTo({ top: 0 });
                }}
                className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-forest-800 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-forest-700 sm:w-auto ${focusOutline}`}
              >
                <BookOpen aria-hidden="true" className="size-4" />
                Mở bài văn khấn vùng này
              </button>
            </section>
          </div>
        </div>
      )}

      {/* Browser Notification Settings Modal */}
      <NotificationSettingsModal
        open={notifModalOpen}
        onClose={() => setNotifModalOpen(false)}
      />
    </div>
  );
};
