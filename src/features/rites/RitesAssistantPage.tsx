import React, { useMemo, useState } from 'react';
import {
  Bell,
  BookOpen,
  Calendar,
  CheckCircle,
  CheckSquare,
  Clock,
  Compass,
  Copy,
  FileText,
  Flame,
  Info,
  MapPin,
  Printer,
  Sparkles,
  Square,
  Users,
  Utensils,
} from 'lucide-react';
import { HeritageAvatar } from '../../components/HeritageAvatar';
import { useGenealogy } from '../../context/GenealogyContext';
import { Person } from '../../models/genealogy';
import { formatLunarAnniversary } from '../../utils/dateUtils';
import {
  calculateUpcomingAnniversaries,
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

export const RitesAssistantPage: React.FC<RitesAssistantPageProps> = ({ onSelectPerson }) => {
  const { people, settings } = useGenealogy();
  const { permission, settings: notifSettings } = useAnniversaryNotifications();
  const [notifModalOpen, setNotifModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<'calendar' | 'prayers' | 'regional' | 'checklist'>('calendar');
  const [selectedRegion, setSelectedRegion] = useState<VietnameseRegion>('north');
  const [prayerRegionFilter, setPrayerRegionFilter] = useState<'all' | VietnameseRegion>('all');
  const [selectedPrayer, setSelectedPrayer] = useState<PrayerTemplate>(TRADITIONAL_PRAYERS[0]);
  const [representativeName, setRepresentativeName] = useState('Trưởng nam / Tộc trưởng');
  const [copySuccess, setCopySuccess] = useState(false);

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
    await navigator.clipboard.writeText(renderedPrayerText);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2500);
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7DFD4] pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1B3B2B] tracking-tight flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[#8C6D32]" />
            <span>Trợ Lý Lễ Giỗ & Nghi Lễ Âm Lịch</span>
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Tự động tính ngày dương tương ứng, sổ văn khấn cổ truyền và danh mục chuẩn bị lễ giỗ họ.
          </p>
        </div>

        {/* Tab switchers */}
        <div className="flex items-center gap-1.5 bg-[#F1EBE1] p-1 rounded-2xl border border-[#E3D9CC] overflow-x-auto max-w-full">
          {[
            { key: 'calendar', label: 'Lịch giỗ tiền nhân', icon: Calendar },
            { key: 'prayers', label: 'Sổ văn khấn', icon: BookOpen },
            { key: 'regional', label: 'Phong tục 3 Miền', icon: Compass },
            { key: 'checklist', label: 'Nghi thức chuẩn bị', icon: CheckSquare },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as 'calendar' | 'prayers' | 'regional' | 'checklist')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#1B3B2B] text-white shadow-xs'
                    : 'text-[#5C4F42] hover:text-[#1B3B2B]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 1. LỊCH GIỖ & NHẮC NHỞ */}
      {/* ========================================================================= */}
      {activeTab === 'calendar' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs text-amber-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Năm hiện tại: <strong>{new Date().getFullYear()}</strong> (Can Chi:{' '}
                <strong>{upcomingAnniversaries[0]?.canChiYear || 'Bính Ngọ'}</strong>). Con cháu nên
                lên kế hoạch cúng giỗ trước 1–2 tuần.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setNotifModalOpen(true)}
              className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-amber-300 hover:bg-amber-100/60 text-amber-900 font-semibold text-xs transition-colors shadow-xs"
            >
              <Bell className="w-3.5 h-3.5 text-amber-700" />
              <span>
                Cài đặt thông báo{permission === 'granted' && notifSettings.enabled ? ' (Đang bật)' : ''}
              </span>
            </button>
          </div>

          {upcomingAnniversaries.length === 0 ? (
            <div className="p-12 text-center bg-[#FFFDF9] rounded-2xl border border-[#E7DFD4] space-y-3">
              <Calendar className="w-10 h-10 text-stone-300 mx-auto" />
              <p className="text-sm font-serif font-bold text-stone-700">
                Chưa có ngày giỗ âm lịch nào được ghi nhận
              </p>
              <p className="text-xs text-stone-500">
                Hãy vào hồ sơ các thành viên đã khuất và điền "Ngày giỗ Âm lịch" để ứng dụng tự động
                tính toán.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcomingAnniversaries.map((anniv) => {
                const p = anniv.person;
                const isUpcomingSoon = anniv.daysRemaining >= 0 && anniv.daysRemaining <= 14;

                return (
                  <div
                    key={p.id}
                    onClick={() => onSelectPerson(p.id)}
                    className={`p-4 rounded-2xl bg-[#FFFDF9] border transition-all cursor-pointer shadow-xs hover:shadow-md flex flex-col justify-between ${
                      isUpcomingSoon
                        ? 'border-amber-400 ring-2 ring-amber-100 bg-amber-50/20'
                        : 'border-[#E7DFD4] hover:border-[#1B3B2B]/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2.5">
                        <HeritageAvatar
                          fullName={p.fullName}
                          portraitUrl={p.portraitUrl}
                          gender={p.gender}
                          size="md"
                          isLiving={false}
                        />

                        <div className="text-right">
                          <span
                            className={`text-[11px] font-bold tabular-nums ${
                              anniv.daysRemaining < 0
                                ? 'text-stone-400'
                                : anniv.daysRemaining <= 7
                                ? 'text-red-700'
                                : anniv.daysRemaining <= 30
                                ? 'text-[#8C6D32]'
                                : 'text-[#1B3B2B]'
                            }`}
                          >
                            {anniv.daysRemaining < 0
                              ? 'Đã qua'
                              : anniv.daysRemaining === 0
                              ? 'Hôm nay giỗ'
                              : `Còn ${anniv.daysRemaining} ngày`}
                          </span>
                        </div>
                      </div>

                      <h3 className="font-serif font-bold text-sm text-[#1F1913] hover:text-[#1B3B2B] truncate">
                        {p.fullName}
                      </h3>

                      <p className="text-xs text-[#8C6D32] font-semibold mt-0.5">
                        Ngày {anniv.lunarDay} tháng {anniv.lunarMonth} (Âm lịch)
                      </p>

                      <p className="text-[11px] text-stone-500 mt-0.5">
                        Dương lịch ước tính: {anniv.solarDate.toLocaleDateString('vi-VN')}
                      </p>

                      {p.clanRole && (
                        <p className="text-[10px] text-stone-400 mt-1">Vai vế: {p.clanRole}</p>
                      )}

                      {anniv.lunarNote && (
                        <p className="text-[10px] text-amber-900 italic mt-1 bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                          {anniv.lunarNote}
                        </p>
                      )}
                    </div>

                    {p.burialPlace && (
                      <div className="mt-3 pt-2 border-t border-stone-100 flex items-center gap-1 text-[10px] text-stone-400 truncate">
                        <MapPin className="w-3 h-3 text-[#1B3B2B] shrink-0" />
                        <span className="truncate">{p.burialPlace}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SỔ VĂN KHẤN CỔ TRUYỀN */}
      {/* ========================================================================= */}
      {activeTab === 'prayers' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left: Template Selector */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
              Chọn Bài Văn Khấn
            </h3>
            <div className="space-y-2">
              {TRADITIONAL_PRAYERS.map((prayer) => (
                <div
                  key={prayer.id}
                  onClick={() => setSelectedPrayer(prayer)}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                    selectedPrayer.id === prayer.id
                      ? 'bg-[#1B3B2B] text-white border-[#1B3B2B] shadow-xs'
                      : 'bg-[#FFFDF9] border-[#E7DFD4] text-[#332A22] hover:bg-stone-50'
                  }`}
                >
                  <h4 className="font-serif font-bold text-xs">{prayer.title}</h4>
                  <p
                    className={`text-[10px] mt-0.5 ${
                      selectedPrayer.id === prayer.id ? 'text-[#DBC599]' : 'text-stone-500'
                    }`}
                  >
                    {prayer.targetRitual}
                  </p>
                </div>
              ))}
            </div>

            {/* Customization field */}
            <div className="p-3 rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] space-y-2">
              <label className="block text-[11px] font-semibold text-stone-600">
                Người đứng cúng (Tín chủ):
              </label>
              <input
                type="text"
                value={representativeName}
                onChange={(e) => setRepresentativeName(e.target.value)}
                placeholder="VD: Trưởng nam Trần Văn Khải"
                className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-2.5 py-1.5 outline-none focus:border-[#1B3B2B]"
              />
            </div>
          </div>

          {/* Right: Rendered Prayer Preview & Copy */}
          <div className="md:col-span-2 rounded-3xl bg-[#FFFDF9] border border-[#E7DFD4] p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7DFD4] pb-3">
              <div>
                <h3 className="text-base font-serif font-bold text-[#1F1913]">
                  {selectedPrayer.title}
                </h3>
                <p className="text-xs text-[#8C6D32]">{selectedPrayer.regionalNotes}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyPrayer}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF8F5] border border-[#D5CABE] text-xs font-semibold text-[#1B3B2B] hover:bg-stone-100 transition-colors"
                >
                  {copySuccess ? (
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                  <span>{copySuccess ? 'Đã sao chép' : 'Sao chép văn khấn'}</span>
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 rounded-2xl bg-[#FAF8F5] border border-[#E7DFD4] font-serif text-xs sm:text-sm text-[#2C241C] leading-relaxed whitespace-pre-line max-h-[60vh] overflow-y-auto select-text">
              {renderedPrayerText}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. NGHI THỨC & DANH MỤC CHUẨN BỊ */}
      {/* ========================================================================= */}
      {activeTab === 'checklist' && (
        <div className="max-w-3xl mx-auto rounded-3xl bg-[#FFFDF9] border border-[#E7DFD4] p-6 shadow-sm space-y-6">
          <div className="border-b border-[#E7DFD4] pb-3">
            <h3 className="text-base font-serif font-bold text-[#1F1913] flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-[#1B3B2B]" />
              <span>Danh Mục Việc Cần Chuẩn Bị Ngày Giỗ Họ</span>
            </h3>
            <p className="text-xs text-stone-500">
              Phân công việc chu đáo giúp ngày giỗ tổ và giỗ tiền nhân diễn ra trang nghiêm, thuận hòa.
            </p>
          </div>

          <div className="space-y-3">
            {RITE_PREPARATION_CHECKLIST.map((item) => {
              const isDone = checkedTasks.has(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleTask(item.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex items-start gap-3 ${
                    isDone
                      ? 'bg-emerald-50/60 border-emerald-200 text-stone-400'
                      : 'bg-[#FAF8F5] border-[#E7DFD4] text-[#1F1913] hover:bg-white'
                  }`}
                >
                  <button type="button" className="mt-0.5">
                    {isDone ? (
                      <CheckSquare className="w-4 h-4 text-emerald-700" />
                    ) : (
                      <Square className="w-4 h-4 text-stone-400" />
                    )}
                  </button>

                  <div className="flex-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#8C6D32] block mb-0.5">
                      {item.category}
                    </span>
                    <p className={`text-xs ${isDone ? 'line-through text-stone-400' : 'font-medium'}`}>
                      {item.task}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. PHONG TỤC CÚNG GIỖ 3 MIỀN (BẮC - TRUNG - NAM) */}
      {/* ========================================================================= */}
      {activeTab === 'regional' && (
        <div className="space-y-6 max-w-5xl mx-auto">
          {/* Region Switcher Bar */}
          <div className="p-3 bg-[#FFFDF9] rounded-2xl border border-[#E7DFD4] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#8C6D32]" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C6D32]">
                  Không Gian Văn Hóa & Lễ Tục
                </h3>
                <p className="text-sm font-serif font-bold text-[#1B3B2B]">
                  Nghi Lễ Gia Tiên Theo 3 Miền Đất Nước
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#EFE9DF] border border-[#DDD4C7]">
              {[
                { id: 'north', name: 'Miền Bắc' },
                { id: 'central', name: 'Miền Trung' },
                { id: 'south', name: 'Miền Nam' },
              ].map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setSelectedRegion(r.id as VietnameseRegion)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    selectedRegion === r.id
                      ? 'bg-[#1B3B2B] text-white shadow-xs'
                      : 'text-[#5C4F42] hover:text-[#1B3B2B]'
                  }`}
                >
                  {r.name}
                </button>
              ))}
            </div>
          </div>

          {/* Active Region Content Card */}
          {(() => {
            const currentGuide = REGIONAL_RITE_GUIDES[selectedRegion];
            return (
              <div className="space-y-6">
                <div className="p-5 rounded-3xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-sm space-y-2">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-bold uppercase tracking-wider text-[#1B3B2B]">
                      {currentGuide.regionName}
                    </span>
                    <span aria-hidden="true" className="text-stone-300">·</span>
                    <span className="text-[#8C6D32] italic">
                      {currentGuide.subTitle}
                    </span>
                  </div>
                  <h4 className="text-lg font-serif font-bold text-[#1F1913]">
                    Đặc trưng nghi lễ & chuẩn mực phong tục thờ cúng
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Traditional Banquet Dishes */}
                  <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#E7DFD4] pb-2">
                      <Utensils className="w-4 h-4 text-[#8C6D32]" />
                      <h4 className="text-sm font-serif font-bold text-[#1B3B2B]">
                        Mâm Cỗ Cúng Giỗ Truyền Thống
                      </h4>
                    </div>
                    <ul className="space-y-2 text-xs text-[#332920]">
                      {currentGuide.traditionalDishes.map((dish, idx) => (
                        <li key={idx} className="flex items-start gap-2 p-2 rounded-xl bg-[#FAF7F2] border border-[#E7DFD4]/70">
                          <span className="w-5 h-5 rounded-full bg-[#1B3B2B]/10 text-[#1B3B2B] font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed">{dish}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Regional Kinship Dialect Terms */}
                  <div className="p-5 rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-xs space-y-4">
                    <div className="flex items-center gap-2 border-b border-[#E7DFD4] pb-2">
                      <Users className="w-4 h-4 text-[#8C6D32]" />
                      <h4 className="text-sm font-serif font-bold text-[#1B3B2B]">
                        Xưng Hô Thân Tộc Theo Phương Ngữ
                      </h4>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E7DFD4]">
                        <span className="text-stone-400 text-[10px] block">Cha / Bố</span>
                        <span className="font-bold text-[#1B3B2B] text-xs">{currentGuide.kinshipTerms.father}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E7DFD4]">
                        <span className="text-stone-400 text-[10px] block">Mẹ / Má</span>
                        <span className="font-bold text-[#1B3B2B] text-xs">{currentGuide.kinshipTerms.mother}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E7DFD4]">
                        <span className="text-stone-400 text-[10px] block">Ông Nội / Cố</span>
                        <span className="font-bold text-[#1B3B2B] text-xs">{currentGuide.kinshipTerms.grandfather}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E7DFD4]">
                        <span className="text-stone-400 text-[10px] block">Bà Nội / Mệ</span>
                        <span className="font-bold text-[#1B3B2B] text-xs">{currentGuide.kinshipTerms.grandmother}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E7DFD4]">
                        <span className="text-stone-400 text-[10px] block">Anh Trưởng / Anh Hai</span>
                        <span className="font-bold text-[#1B3B2B] text-xs">{currentGuide.kinshipTerms.elderBrother}</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E7DFD4]">
                        <span className="text-stone-400 text-[10px] block">Bác / Chú / Cậu</span>
                        <span className="font-bold text-[#1B3B2B] text-xs">{currentGuide.kinshipTerms.uncle}</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-stone-200">
                      <h5 className="text-xs font-semibold text-[#8C6D32] mb-1.5 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5" />
                        <span>Tập quán cúng tế & Nghi lễ cốt lõi</span>
                      </h5>
                      <ul className="space-y-1 text-xs text-stone-600">
                        {currentGuide.customRituals.map((r, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-[#8C6D32] font-bold">•</span>
                            <span>{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Altar arrangement & spiritual notes */}
                  <div className="md:col-span-2 p-5 rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-xs space-y-3">
                    <div className="flex items-center gap-2 border-b border-[#E7DFD4] pb-2">
                      <Sparkles className="w-4 h-4 text-[#8C6D32]" />
                      <h4 className="text-sm font-serif font-bold text-[#1B3B2B]">
                        Lưu Ý Bài Trí Hương Án & Bàn Thờ Gia Tiên
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {currentGuide.altarArrangementTips.map((tip, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E7DFD4] text-xs text-stone-700 leading-relaxed">
                          <span className="font-bold text-[#1B3B2B] block mb-1">Quy tắc {idx + 1}</span>
                          {tip}
                        </div>
                      ))}
                    </div>

                    {/* Regional Prayer Direct Action */}
                    <div className="p-3.5 rounded-xl bg-[#FAF5EB] border border-[#8C6D32]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-2">
                      <div>
                        <p className="text-xs font-bold text-[#1B3B2B]">
                          Văn khấn cổ truyền phù hợp cho {currentGuide.regionName}
                        </p>
                        <p className="text-[11px] text-[#8C6D32]">
                          Xem và tự động điền tên tiền nhân, tộc trưởng vào bài văn cúng theo đúng phong tục vùng miền.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const prayerId =
                            selectedRegion === 'north'
                              ? 'prayer_truong_toc'
                              : selectedRegion === 'central'
                              ? 'prayer_mien_trung_tien_thuong'
                              : 'prayer_mien_nam_dam_gio';
                          const p = TRADITIONAL_PRAYERS.find((item) => item.id === prayerId);
                          if (p) setSelectedPrayer(p);
                          setActiveTab('prayers');
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-[#1B3B2B] text-white text-xs font-semibold hover:bg-[#28503C] transition-colors shrink-0"
                      >
                        Mở bài văn khấn vùng này →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
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
