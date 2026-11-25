import React, { useMemo, useState } from 'react';
import {
  Baby,
  Calendar,
  CalendarCheck,
  CalendarDays,
  Cake,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  Filter,
  Flame,
  Heart,
  Landmark,
  MapPin,
  PartyPopper,
  Printer,
  Search,
  Sparkles,
  Sun,
  Users,
} from 'lucide-react';
import { HeritageAvatar } from '../../components/HeritageAvatar';
import { useGenealogy } from '../../context/GenealogyContext';
import { Person } from '../../models/genealogy';
import {
  buildFamilyYearTimeline,
  FamilyYearEvent,
  FamilyYearEventType,
} from '../../services/familyYearTimelineService';
import { getCanChiYear } from '../../services/lunarCalendarService';

interface FamilyYearTimelineProps {
  onSelectPerson?: (personId: string) => void;
  onNavigateToRites?: () => void;
}

const MONTH_NAMES_VI = [
  'Tháng 1 (Tháng Giêng)',
  'Tháng 2',
  'Tháng 3',
  'Tháng 4',
  'Tháng 5',
  'Tháng 6',
  'Tháng 7',
  'Tháng 8',
  'Tháng 9',
  'Tháng 10',
  'Tháng 11',
  'Tháng 12 (Tháng Chạp)',
];

const SEASONS_VI = [
  { name: 'Mùa Xuân (Khởi sắc & Tế Tổ)', months: [1, 2, 3], icon: Sun, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
  { name: 'Mùa Hạ (Trưởng thành & Tri ân)', months: [4, 5, 6], icon: Sparkles, color: 'text-amber-700 bg-amber-50 border-amber-200' },
  { name: 'Mùa Thu (Vu Lan Báo Hiếu)', months: [7, 8, 9], icon: Flame, color: 'text-rose-700 bg-rose-50 border-rose-200' },
  { name: 'Mùa Đông (Tạ Niên & Sum Họp)', months: [10, 11, 12], icon: Landmark, color: 'text-blue-700 bg-blue-50 border-blue-200' },
];

export const FamilyYearTimeline: React.FC<FamilyYearTimelineProps> = ({
  onSelectPerson,
  onNavigateToRites,
}) => {
  const { people, unions, lifeEvents, branches, settings } = useGenealogy();

  const realCurrentYear = useMemo(() => new Date().getFullYear(), []);
  const [selectedYear, setSelectedYear] = useState<number>(realCurrentYear);
  const [activeFilter, setActiveFilter] = useState<'all' | FamilyYearEventType>('all');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewMode, setViewMode] = useState<'chronological' | 'upcoming' | 'seasons'>('chronological');
  const [collapsedMonths, setCollapsedMonths] = useState<Set<number>>(new Set());
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Compute timeline data
  const timelineData = useMemo(() => {
    return buildFamilyYearTimeline({
      people,
      unions,
      lifeEvents,
      branches,
      settings,
      targetYear: selectedYear,
      referenceDate: new Date(),
      includeDeceasedBirthdays: false,
    });
  }, [people, unions, lifeEvents, branches, settings, selectedYear]);

  // Filter events by type, branch, and search text
  const filteredEvents = useMemo(() => {
    let list = timelineData.events;

    if (activeFilter !== 'all') {
      list = list.filter((e) => e.type === activeFilter);
    }

    if (selectedBranch !== 'all') {
      list = list.filter((e) => e.branch?.id === selectedBranch || e.person?.branchId === selectedBranch);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.subTitle?.toLowerCase().includes(q) ||
          e.person?.fullName.toLowerCase().includes(q) ||
          e.person2?.fullName.toLowerCase().includes(q) ||
          e.person?.tabooName?.toLowerCase().includes(q) ||
          e.person?.commonName?.toLowerCase().includes(q) ||
          e.location?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [timelineData.events, activeFilter, selectedBranch, searchQuery]);

  // Group filtered events by month (1 to 12)
  const filteredByMonth = useMemo(() => {
    const map = new Map<number, FamilyYearEvent[]>();
    for (let m = 1; m <= 12; m++) {
      map.set(m, []);
    }
    for (const evt of filteredEvents) {
      const list = map.get(evt.month) || [];
      list.push(evt);
      map.set(evt.month, list);
    }
    return map;
  }, [filteredEvents]);

  // Upcoming events strictly from today onward in the current year
  const upcomingEvents = useMemo(() => {
    return filteredEvents
      .filter((e) => e.daysRemaining >= 0)
      .sort((a, b) => a.daysRemaining - b.daysRemaining);
  }, [filteredEvents]);

  const toggleMonthCollapse = (month: number) => {
    setCollapsedMonths((prev) => {
      const next = new Set(prev);
      if (next.has(month)) {
        next.delete(month);
      } else {
        next.add(month);
      }
      return next;
    });
  };

  // Export iCalendar (.ics) file so family members can import all family events into Google/Apple Calendar
  const handleExportIcs = () => {
    try {
      const icsLines: string[] = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Gia Pha Viet//Nien Bieu Su Kien Gia Dinh//VI',
        `X-WR-CALNAME:Su Kien Gia Dinh ${settings.clanName} ${selectedYear}`,
        'CALSCALE:GREGORIAN',
      ];

      for (const evt of filteredEvents) {
        const y = evt.year;
        const m = String(evt.month).padStart(2, '0');
        const d = String(evt.day).padStart(2, '0');
        const dtstart = `${y}${m}${d}`;
        // next day for full-day event
        const nextDate = new Date(evt.date);
        nextDate.setDate(nextDate.getDate() + 1);
        const ny = nextDate.getFullYear();
        const nm = String(nextDate.getMonth() + 1).padStart(2, '0');
        const nd = String(nextDate.getDate()).padStart(2, '0');
        const dtend = `${ny}${nm}${nd}`;

        icsLines.push('BEGIN:VEVENT');
        icsLines.push(`UID:${evt.id}@giaphaviet.vn`);
        icsLines.push(`DTSTAMP:${y}0101T000000Z`);
        icsLines.push(`DTSTART;VALUE=DATE:${dtstart}`);
        icsLines.push(`DTEND;VALUE=DATE:${dtend}`);
        icsLines.push(`SUMMARY:${evt.title.replace(/[,;]/g, ' ')}`);
        if (evt.subTitle) {
          icsLines.push(`DESCRIPTION:${evt.subTitle.replace(/[,;]/g, ' ')} - ${evt.lunarDateDisplay || ''}`);
        }
        if (evt.location) {
          icsLines.push(`LOCATION:${evt.location.replace(/[,;]/g, ' ')}`);
        }
        icsLines.push('END:VEVENT');
      }

      icsLines.push('END:VCALENDAR');

      const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Lich_Su_Kien_${settings.clanName.replace(/\s+/g, '_')}_${selectedYear}.ics`;
      a.click();
      URL.revokeObjectURL(url);

      setToastMessage('Đã tải tệp lịch (.ics) thành công để đồng bộ vào điện thoại/Google Calendar!');
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error(err);
    }
  };

  const getEventBadgeAndIcon = (evt: FamilyYearEvent) => {
    switch (evt.type) {
      case 'birthday':
        return {
          icon: Cake,
          iconBg: 'bg-amber-100 text-amber-800',
          typeLabel: 'Sinh nhật',
          borderColor: 'border-amber-200',
          accentText: 'text-amber-800',
        };
      case 'death_anniversary':
        return {
          icon: Flame,
          iconBg: 'bg-[#FAF0DC] text-[#8C6D32]',
          typeLabel: 'Lễ giỗ Tiên tổ',
          borderColor: 'border-[#D5CABE]',
          accentText: 'text-[#8C6D32]',
        };
      case 'wedding':
        return {
          icon: Heart,
          iconBg: 'bg-rose-100 text-rose-800',
          typeLabel: 'Kỷ niệm Ngày cưới',
          borderColor: 'border-rose-200',
          accentText: 'text-rose-800',
        };
      case 'clan_ritual':
        return {
          icon: Landmark,
          iconBg: 'bg-[#EAF2ED] text-[#1B3B2B]',
          typeLabel: 'Đại lễ Dòng họ',
          borderColor: 'border-[#2B5A43]/30',
          accentText: 'text-[#1B3B2B]',
        };
      default:
        return {
          icon: Sparkles,
          iconBg: 'bg-stone-100 text-stone-700',
          typeLabel: 'Sự kiện',
          borderColor: 'border-stone-200',
          accentText: 'text-stone-700',
        };
    }
  };

  const canChiYear = getCanChiYear(selectedYear);

  return (
    <div className="rounded-3xl bg-[#FFFDF9] border border-[#E7DFD4] p-5 sm:p-7 shadow-xs space-y-6 relative overflow-hidden transition-all">
      {/* Decorative Traditional Calligraphic Background Mark */}
      <div className="absolute -right-4 -top-8 text-9xl font-serif text-[#1B3B2B]/4 select-none pointer-events-none">
        春
      </div>

      {/* Top Header & Year Controller */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E7DFD4] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#8C6D32] flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-[#C19B4C]" />
              <span>Niên Biểu Gia Tộc Cả Năm</span>
            </span>
            <span className="text-stone-300">·</span>
            <span className="text-xs font-serif italic text-stone-600">
              Năm {canChiYear}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1F1913] tracking-tight">
            Niên Biểu Sự Kiện Gia Đình Năm {selectedYear}
          </h2>
          <p className="text-xs text-stone-500">
            Tổng hợp sinh nhật, kỵ nhật tiên tổ, kỷ niệm ngày cưới và đại lễ dòng họ theo thứ tự 12 tháng.
          </p>
        </div>

        {/* Year Switcher & Quick Export */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Year Switcher Buttons */}
          <div className="flex items-center bg-[#FAF7F2] p-1 rounded-2xl border border-[#D5CABE]">
            <button
              type="button"
              onClick={() => setSelectedYear((y) => y - 1)}
              className="p-1.5 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-white transition-colors"
              title={`Xem năm ${selectedYear - 1}`}
              aria-label="Năm trước"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 text-xs font-bold text-[#1B3B2B] tabular-nums">
              {selectedYear}
            </span>
            <button
              type="button"
              onClick={() => setSelectedYear((y) => y + 1)}
              className="p-1.5 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-white transition-colors"
              title={`Xem năm ${selectedYear + 1}`}
              aria-label="Năm tiếp theo"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {selectedYear !== realCurrentYear && (
            <button
              type="button"
              onClick={() => setSelectedYear(realCurrentYear)}
              className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition-colors"
            >
              Về năm nay ({realCurrentYear})
            </button>
          )}

          {/* Sync / Export ICS to Calendar */}
          <button
            type="button"
            onClick={handleExportIcs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FAF5EB] hover:bg-[#F3EAD6] border border-[#E8DDCD] text-[#8C6D32] text-xs font-semibold shadow-xs transition-colors"
            title="Tải tệp lịch iCal (.ics) để đồng bộ vào Google Calendar / Apple Calendar trên điện thoại"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Xuất lịch (.ics)</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center justify-between animate-in fade-in">
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="text-emerald-700 hover:underline font-semibold"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Overview Stat Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <button
          type="button"
          onClick={() => setActiveFilter('all')}
          className={`p-3 rounded-2xl border text-left transition-all ${
            activeFilter === 'all'
              ? 'bg-[#1B3B2B] text-white border-[#1B3B2B] shadow-xs'
              : 'bg-[#FAF8F5] border-[#E7DFD4] hover:bg-stone-100 text-[#2C241C]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${activeFilter === 'all' ? 'text-white/80' : 'text-stone-500'}`}>
              Tổng sự kiện
            </span>
            <CalendarCheck className={`w-3.5 h-3.5 ${activeFilter === 'all' ? 'text-[#DBC599]' : 'text-stone-400'}`} />
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold mt-1 tabular-nums">
            {timelineData.counts.total}
          </p>
          <p className={`text-[10px] mt-0.5 ${activeFilter === 'all' ? 'text-white/70' : 'text-stone-400'}`}>
            Toàn bộ trong năm {selectedYear}
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('birthday')}
          className={`p-3 rounded-2xl border text-left transition-all ${
            activeFilter === 'birthday'
              ? 'bg-[#8C6D32] text-white border-[#8C6D32] shadow-xs'
              : 'bg-[#FAF8F5] border-[#E7DFD4] hover:bg-stone-100 text-[#2C241C]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${activeFilter === 'birthday' ? 'text-white/80' : 'text-stone-500'}`}>
              Sinh nhật & Thọ
            </span>
            <Cake className={`w-3.5 h-3.5 ${activeFilter === 'birthday' ? 'text-amber-200' : 'text-amber-700'}`} />
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold mt-1 tabular-nums">
            {timelineData.counts.birthdays}
          </p>
          <p className={`text-[10px] mt-0.5 ${activeFilter === 'birthday' ? 'text-white/70' : 'text-stone-400'}`}>
            Các thành viên gia tộc
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('death_anniversary')}
          className={`p-3 rounded-2xl border text-left transition-all ${
            activeFilter === 'death_anniversary'
              ? 'bg-[#1B3B2B] text-white border-[#1B3B2B] shadow-xs'
              : 'bg-[#FAF8F5] border-[#E7DFD4] hover:bg-stone-100 text-[#2C241C]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${activeFilter === 'death_anniversary' ? 'text-white/80' : 'text-stone-500'}`}>
              Lễ giỗ Tiên tổ
            </span>
            <Flame className={`w-3.5 h-3.5 ${activeFilter === 'death_anniversary' ? 'text-[#DBC599]' : 'text-[#8C6D32]'}`} />
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold mt-1 tabular-nums">
            {timelineData.counts.deathAnniversaries}
          </p>
          <p className={`text-[10px] mt-0.5 ${activeFilter === 'death_anniversary' ? 'text-white/70' : 'text-stone-400'}`}>
            Kỵ nhật Âm lịch hàng năm
          </p>
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('wedding')}
          className={`p-3 rounded-2xl border text-left transition-all ${
            activeFilter === 'wedding'
              ? 'bg-[#8C2A1E] text-white border-[#8C2A1E] shadow-xs'
              : 'bg-[#FAF8F5] border-[#E7DFD4] hover:bg-stone-100 text-[#2C241C]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${activeFilter === 'wedding' ? 'text-white/80' : 'text-stone-500'}`}>
              Kỷ niệm Cưới
            </span>
            <Heart className={`w-3.5 h-3.5 ${activeFilter === 'wedding' ? 'text-rose-200' : 'text-rose-700'}`} />
          </div>
          <p className="text-xl sm:text-2xl font-serif font-bold mt-1 tabular-nums">
            {timelineData.counts.weddings}
          </p>
          <p className={`text-[10px] mt-0.5 ${activeFilter === 'wedding' ? 'text-white/70' : 'text-stone-400'}`}>
            Đôi bạn đời gắn bó
          </p>
        </button>
      </div>

      {/* Filter & View Mode Controls Bar */}
      <div className="p-3.5 rounded-2xl bg-[#FAF7F2] border border-[#E7DFD4] flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Search Input */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo tên thành viên, ngày, chi họ..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white border border-[#D5CABE] text-xs outline-none focus:border-[#1B3B2B]"
          />
        </div>

        {/* Branch Filter Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-stone-500 hidden sm:inline">Chi họ:</span>
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-white border border-[#D5CABE] text-xs outline-none focus:border-[#1B3B2B]"
          >
            <option value="all">Tất cả chi họ</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        {/* View Mode Segmented Control */}
        <div className="flex items-center p-1 bg-white rounded-xl border border-[#D5CABE]">
          <button
            type="button"
            onClick={() => setViewMode('chronological')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              viewMode === 'chronological'
                ? 'bg-[#1B3B2B] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            12 Tháng
          </button>
          <button
            type="button"
            onClick={() => setViewMode('upcoming')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              viewMode === 'upcoming'
                ? 'bg-[#1B3B2B] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Sắp tới ({upcomingEvents.length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('seasons')}
            className={`px-3 py-1 rounded-lg font-semibold transition-all ${
              viewMode === 'seasons'
                ? 'bg-[#1B3B2B] text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Bốn Mùa
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW 1: 12-MONTH CHRONOLOGICAL TIMELINE VIEW */}
      {/* ========================================================================= */}
      {viewMode === 'chronological' && (
        <div className="space-y-6">
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center bg-[#FAF8F5] rounded-2xl border border-[#E7DFD4] space-y-2">
              <Calendar className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-sm font-serif font-bold text-stone-700">
                Không tìm thấy sự kiện nào phù hợp với bộ lọc trong năm {selectedYear}
              </p>
              <p className="text-xs text-stone-500">
                Hãy thử chọn tiêu chí lọc khác hoặc thêm ngày sinh, ngày mất, ngày cưới vào hồ sơ các thành viên.
              </p>
            </div>
          ) : (
            <div className="space-y-6 relative before:absolute before:left-4 sm:before:left-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-[#D5CABE]/70">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((monthNum) => {
                const monthEvents = filteredByMonth.get(monthNum) || [];
                if (monthEvents.length === 0) return null;

                const isCollapsed = collapsedMonths.has(monthNum);
                const isCurrentMonth =
                  selectedYear === realCurrentYear && new Date().getMonth() + 1 === monthNum;

                return (
                  <div key={monthNum} className="relative pl-10 sm:pl-14 space-y-3">
                    {/* Month Node Spine Indicator */}
                    <div
                      className={`absolute left-2 sm:left-4 top-0.5 -translate-x-1/2 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                        isCurrentMonth
                          ? 'bg-[#1B3B2B] border-[#DBC599] text-white shadow-xs ring-4 ring-[#1B3B2B]/10'
                          : 'bg-white border-[#8C6D32] text-[#8C6D32]'
                      }`}
                    >
                      <span className="text-[10px] font-bold">{monthNum}</span>
                    </div>

                    {/* Month Header Banner */}
                    <div
                      onClick={() => toggleMonthCollapse(monthNum)}
                      className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer select-none transition-all ${
                        isCurrentMonth
                          ? 'bg-[#FAF5EB] border-[#D8C7B0] shadow-xs'
                          : 'bg-[#FAF8F5] border-[#E7DFD4] hover:bg-stone-100'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <h3 className="font-serif font-bold text-sm text-[#1F1913]">
                          {MONTH_NAMES_VI[monthNum - 1]}
                        </h3>
                        {isCurrentMonth && (
                          <span className="text-[10px] font-bold text-[#1B3B2B] bg-[#1B3B2B]/10 px-2 py-0.5 rounded-full">
                            Tháng hiện tại
                          </span>
                        )}
                        <span className="text-xs text-stone-500">
                          ({monthEvents.length} sự kiện)
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-stone-400">
                        {isCollapsed ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronUp className="w-4 h-4" />
                        )}
                      </div>
                    </div>

                    {/* Month Events Cards Grid */}
                    {!isCollapsed && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                        {monthEvents.map((evt) => {
                          const badge = getEventBadgeAndIcon(evt);
                          const IconComponent = badge.icon;

                          return (
                            <div
                              key={evt.id}
                              className={`p-4 rounded-2xl border bg-white shadow-2xs hover:shadow-sm transition-all space-y-2.5 relative flex flex-col justify-between ${
                                evt.isToday
                                  ? 'border-[#1B3B2B] ring-2 ring-[#1B3B2B]/15 bg-[#FAFDFB]'
                                  : badge.borderColor
                              }`}
                            >
                              {/* Top Bar: Icon, Title & Countdown */}
                              <div className="space-y-1.5">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${badge.iconBg}`}
                                    >
                                      <IconComponent className="w-4 h-4" />
                                    </div>
                                    <div>
                                      <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                                        {badge.typeLabel}
                                      </span>
                                      <p className="text-xs font-bold text-[#1F1913]">
                                        {evt.dateDisplay}
                                      </p>
                                    </div>
                                  </div>

                                  {/* Status indicator */}
                                  <div className="text-right shrink-0">
                                    {evt.isToday ? (
                                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1B3B2B] text-white animate-pulse">
                                        Hôm nay
                                      </span>
                                    ) : evt.daysRemaining > 0 && evt.daysRemaining <= 30 ? (
                                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-900">
                                        Còn {evt.daysRemaining} ngày
                                      </span>
                                    ) : evt.isPassed ? (
                                      <span className="text-[10px] text-stone-400">Đã qua</span>
                                    ) : (
                                      <span className="text-[10px] text-stone-500">
                                        Còn {evt.daysRemaining} ngày
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Event Title */}
                                <h4
                                  onClick={() => evt.person && onSelectPerson?.(evt.person.id)}
                                  className={`text-sm font-serif font-bold text-[#1F1913] hover:text-[#1B3B2B] transition-colors leading-snug ${
                                    evt.person ? 'cursor-pointer hover:underline' : ''
                                  }`}
                                >
                                  {evt.title}
                                </h4>

                                {evt.subTitle && (
                                  <p className="text-xs text-[#695E52] leading-tight">
                                    {evt.subTitle}
                                  </p>
                                )}

                                {evt.lunarDateDisplay && (
                                  <p className="text-[11px] font-medium text-[#8C6D32] flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-[#C19B4C]" />
                                    <span>{evt.lunarDateDisplay}</span>
                                  </p>
                                )}

                                {evt.description && (
                                  <p className="text-[11px] text-stone-600 line-clamp-2 italic pt-0.5">
                                    {evt.description}
                                  </p>
                                )}
                              </div>

                              {/* Bottom Footer Details */}
                              <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                                <div className="flex items-center gap-2 truncate">
                                  {evt.person && (
                                    <div
                                      onClick={() => onSelectPerson?.(evt.person!.id)}
                                      className="flex items-center gap-1.5 cursor-pointer hover:text-[#1B3B2B]"
                                    >
                                      <HeritageAvatar
                                        fullName={evt.person.fullName}
                                        portraitUrl={evt.person.portraitUrl}
                                        gender={evt.person.gender}
                                        size="sm"
                                        isLiving={evt.person.isLiving}
                                        className="w-5 h-5 text-[9px]"
                                      />
                                      <span className="truncate max-w-[110px] font-medium">
                                        {evt.person.fullName}
                                      </span>
                                    </div>
                                  )}

                                  {evt.person2 && (
                                    <>
                                      <span>&</span>
                                      <div
                                        onClick={() => onSelectPerson?.(evt.person2!.id)}
                                        className="flex items-center gap-1.5 cursor-pointer hover:text-[#1B3B2B]"
                                      >
                                        <HeritageAvatar
                                          fullName={evt.person2.fullName}
                                          portraitUrl={evt.person2.portraitUrl}
                                          gender={evt.person2.gender}
                                          size="sm"
                                          isLiving={evt.person2.isLiving}
                                          className="w-5 h-5 text-[9px]"
                                        />
                                        <span className="truncate max-w-[110px] font-medium">
                                          {evt.person2.fullName}
                                        </span>
                                      </div>
                                    </>
                                  )}

                                  {evt.branch && !evt.person && (
                                    <span className="text-stone-400 truncate">
                                      {evt.branch.name}
                                    </span>
                                  )}
                                </div>

                                {evt.location && (
                                  <span className="flex items-center gap-1 text-[10px] text-stone-400 truncate max-w-[130px]">
                                    <MapPin className="w-3 h-3 shrink-0" />
                                    <span className="truncate">{evt.location}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
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
      {/* VIEW 2: UPCOMING EVENTS FROM TODAY (SẮP DIỄN RA) */}
      {/* ========================================================================= */}
      {viewMode === 'upcoming' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-700" />
              <span>
                Hiển thị <strong>{upcomingEvents.length}</strong> sự kiện sắp diễn ra tính từ hôm nay trở đi trong năm {selectedYear}.
              </span>
            </div>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="p-8 text-center bg-[#FAF8F5] rounded-2xl border border-[#E7DFD4] space-y-2">
              <CalendarCheck className="w-8 h-8 text-stone-300 mx-auto" />
              <p className="text-sm font-serif font-bold text-stone-700">
                Không còn sự kiện sắp diễn ra trong năm {selectedYear}
              </p>
              <p className="text-xs text-stone-500">
                Toàn bộ sự kiện đã kết thúc hoặc quý vị có thể chuyển sang năm {selectedYear + 1}.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {upcomingEvents.map((evt) => {
                const badge = getEventBadgeAndIcon(evt);
                const IconComponent = badge.icon;

                return (
                  <div
                    key={evt.id}
                    className="p-4 rounded-2xl border border-[#E7DFD4] bg-white shadow-2xs hover:shadow-md transition-all space-y-2 flex flex-col justify-between"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${badge.iconBg}`}
                          >
                            <IconComponent className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-[10px] font-bold text-stone-500 uppercase">
                            {badge.typeLabel}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            evt.isToday
                              ? 'bg-[#1B3B2B] text-white animate-pulse'
                              : evt.daysRemaining <= 7
                              ? 'bg-rose-100 text-rose-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {evt.isToday ? 'Hôm nay' : `Còn ${evt.daysRemaining} ngày`}
                        </span>
                      </div>

                      <h4
                        onClick={() => evt.person && onSelectPerson?.(evt.person.id)}
                        className={`text-sm font-serif font-bold text-[#1F1913] hover:text-[#1B3B2B] transition-colors leading-snug ${
                          evt.person ? 'cursor-pointer hover:underline' : ''
                        }`}
                      >
                        {evt.title}
                      </h4>

                      <div className="text-xs text-stone-600 font-medium">
                        Ngày {evt.dateDisplay}
                        {evt.lunarDateDisplay && (
                          <span className="block text-[11px] text-[#8C6D32]">
                            {evt.lunarDateDisplay}
                          </span>
                        )}
                      </div>

                      {evt.subTitle && (
                        <p className="text-[11px] text-stone-500 line-clamp-1">{evt.subTitle}</p>
                      )}
                    </div>

                    {evt.person && (
                      <div className="pt-2 border-t border-stone-100 flex items-center justify-between text-xs">
                        <div
                          onClick={() => onSelectPerson?.(evt.person!.id)}
                          className="flex items-center gap-2 cursor-pointer hover:text-[#1B3B2B]"
                        >
                          <HeritageAvatar
                            fullName={evt.person.fullName}
                            portraitUrl={evt.person.portraitUrl}
                            gender={evt.person.gender}
                            size="sm"
                            isLiving={evt.person.isLiving}
                          />
                          <span className="font-semibold text-stone-800 truncate max-w-[140px]">
                            {evt.person.fullName}
                          </span>
                        </div>
                        <span className="text-[10px] text-stone-400">
                          {evt.person.clanRole || `Đời ${evt.person.generation || '—'}`}
                        </span>
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
      {/* VIEW 3: 4 SEASONS QUARTERLY CARDS VIEW (BỐN MÙA TRUYỀN THỐNG) */}
      {/* ========================================================================= */}
      {viewMode === 'seasons' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SEASONS_VI.map((season) => {
            const seasonEvents = filteredEvents.filter((e) => season.months.includes(e.month));
            const SeasonIcon = season.icon;

            return (
              <div
                key={season.name}
                className="p-5 rounded-2xl border border-[#E7DFD4] bg-[#FAF8F5] space-y-3"
              >
                <div className="flex items-center justify-between border-b border-[#E7DFD4] pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-xl border ${season.color}`}>
                      <SeasonIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-serif font-bold text-sm text-[#1F1913]">
                        {season.name}
                      </h3>
                      <p className="text-[10px] text-stone-500">
                        Tháng {season.months.join(', ')}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#1B3B2B] bg-white px-2.5 py-0.5 rounded-full border border-stone-200">
                    {seasonEvents.length} sự kiện
                  </span>
                </div>

                {seasonEvents.length === 0 ? (
                  <p className="text-xs text-stone-400 italic py-4 text-center">
                    Không có sự kiện ghi nhận trong mùa này.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {seasonEvents.map((evt) => {
                      const badge = getEventBadgeAndIcon(evt);
                      const IconComponent = badge.icon;

                      return (
                        <div
                          key={evt.id}
                          onClick={() => evt.person && onSelectPerson?.(evt.person.id)}
                          className={`p-2.5 rounded-xl bg-white border border-[#E7DFD4] hover:border-[#1B3B2B]/40 hover:shadow-2xs transition-all flex items-start gap-2.5 ${
                            evt.person ? 'cursor-pointer' : ''
                          }`}
                        >
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${badge.iconBg}`}
                          >
                            <IconComponent className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#1F1913] truncate">
                                {evt.title}
                              </span>
                              <span className="text-[10px] text-stone-500 font-mono shrink-0 ml-1">
                                {String(evt.day).padStart(2, '0')}/{String(evt.month).padStart(2, '0')}
                              </span>
                            </div>
                            {evt.subTitle && (
                              <p className="text-[11px] text-stone-500 truncate">
                                {evt.subTitle}
                              </p>
                            )}
                            {evt.lunarDateDisplay && (
                              <p className="text-[10px] text-[#8C6D32]">{evt.lunarDateDisplay}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Bottom Summary Bar */}
      <div className="pt-3 border-t border-stone-200 flex flex-wrap items-center justify-between text-xs text-stone-500 gap-2">
        <div className="flex items-center gap-2">
          <span>Gia Phả Việt · Hệ Thống Niên Biểu Thông Minh</span>
          <span>·</span>
          <span>Năm {selectedYear} ({canChiYear})</span>
        </div>
        {onNavigateToRites && (
          <button
            type="button"
            onClick={onNavigateToRites}
            className="text-[#1B3B2B] hover:underline font-semibold flex items-center gap-1"
          >
            <span>Xem văn khấn & nghi lễ thờ cúng gia tiên →</span>
          </button>
        )}
      </div>
    </div>
  );
};
