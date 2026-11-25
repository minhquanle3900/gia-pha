import React, { useMemo, useState } from 'react';
import {
  Bell,
  BookOpen,
  Calendar,
  Clock,
  Compass,
  Edit3,
  ExternalLink,
  Filter,
  Flame,
  GitFork,
  MapPin,
  Plus,
  Scroll,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { HeritageAvatar } from '../../components/HeritageAvatar';
import { useGenealogy } from '../../context/GenealogyContext';
import { useAnniversaryNotifications } from '../../hooks/useAnniversaryNotifications';
import {
  FamilyBranch,
  FamilyStory,
  LifeEvent,
  NavigationTab,
  Person,
} from '../../models/genealogy';
import {
  calculateUpcomingAnniversaries,
  estimateSolarDateForLunarAnniversary,
  getCanChiYear,
} from '../../services/lunarCalendarService';
import {
  formatFlexibleDate,
  formatLifespan,
  formatLunarAnniversary,
  normalizeVietnameseText,
} from '../../utils/dateUtils';
import { ClanMilestoneModal } from './ClanMilestoneModal';
import { NotificationSettingsModal } from './NotificationSettingsModal';

interface ClanHistorySectionProps {
  onSelectPerson: (personId: string) => void;
  onNavigate: (tab: NavigationTab) => void;
}

type HistoryTab = 'all' | 'anniversaries' | 'milestones' | 'stories';
type SortOrder = 'chronological' | 'recentFirst' | 'lunarOrder';

interface UnifiedHistoryItem {
  id: string;
  category: 'anniversary' | 'milestone' | 'branch' | 'story';
  title: string;
  subtitle?: string;
  primaryDateText: string;
  secondaryDateText?: string;
  yearNumber?: number;
  lunarMonth?: number;
  lunarDay?: number;
  daysRemaining?: number;
  isUpcoming?: boolean;
  location?: string;
  description?: string;
  person?: Person;
  branch?: FamilyBranch;
  rawLifeEvent?: LifeEvent;
  rawStory?: FamilyStory;
  badgeLabel: string;
  badgeTone: 'gold' | 'forest' | 'bark' | 'terracotta';
}

export const ClanHistorySection: React.FC<ClanHistorySectionProps> = ({
  onSelectPerson,
  onNavigate,
}) => {
  const { people, branches, stories, lifeEvents, settings } = useGenealogy();

  const [activeFilterTab, setActiveFilterTab] = useState<HistoryTab>('all');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('chronological');
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<LifeEvent | null>(null);

  // Browser Push Notifications
  const {
    permission,
    settings: notifSettings,
    sendImmediateReminderForPerson,
  } = useAnniversaryNotifications();
  const [notifModalOpen, setNotifModalOpen] = useState(false);
  const [notifFeedback, setNotifFeedback] = useState<string | null>(null);

  const peopleMap = useMemo(() => {
    const map = new Map<string, Person>();
    for (const p of people) map.set(p.id, p);
    return map;
  }, [people]);

  const branchesMap = useMemo(() => {
    const map = new Map<string, FamilyBranch>();
    for (const b of branches) map.set(b.id, b);
    return map;
  }, [branches]);

  // Upcoming death anniversaries with countdown days
  const upcomingAnniversariesMap = useMemo(() => {
    const map = new Map<
      string,
      { daysRemaining: number; solarDate: Date; canChiYear: string }
    >();
    const list = calculateUpcomingAnniversaries(people);
    for (const item of list) {
      map.set(item.person.id, {
        daysRemaining: item.daysRemaining,
        solarDate: item.solarDate,
        canChiYear: item.canChiYear,
      });
    }
    return map;
  }, [people]);

  // Aggregate all items into unified history list
  const allHistoryItems = useMemo(() => {
    const items: UnifiedHistoryItem[] = [];

    // 1. Death Anniversaries & Rites (Ngày giỗ, lễ kỵ)
    for (const p of people) {
      if (p.isLiving) continue;

      const lunar = p.deathAnniversaryLunar;
      const deathDate = p.deathDate;
      const hasAnniversary = lunar && (lunar.day || lunar.month || lunar.note);
      const hasDeathDate = deathDate && (deathDate.year || deathDate.displayText);

      if (!hasAnniversary && !hasDeathDate) continue;

      const branch = p.branchId ? branchesMap.get(p.branchId) : undefined;
      const upcoming = upcomingAnniversariesMap.get(p.id);

      let primaryDateText = '';
      if (lunar?.day && lunar?.month) {
        primaryDateText = `Ngày ${String(lunar.day).padStart(2, '0')}/${String(
          lunar.month
        ).padStart(2, '0')} Âm lịch`;
      } else if (lunar?.note) {
        primaryDateText = lunar.note;
      } else if (deathDate) {
        primaryDateText = `Mất ${formatFlexibleDate(deathDate)}`;
      }

      let secondaryDateText = '';
      if (upcoming && !upcoming.daysRemaining) {
        secondaryDateText = 'Hôm nay là ngày giỗ';
      } else if (upcoming && upcoming.daysRemaining > 0 && upcoming.daysRemaining <= 60) {
        secondaryDateText = `Còn ${upcoming.daysRemaining} ngày (DL: ${upcoming.solarDate.toLocaleDateString(
          'vi-VN'
        )})`;
      } else if (upcoming && upcoming.daysRemaining > 60) {
        secondaryDateText = `Dương lịch: ${upcoming.solarDate.toLocaleDateString('vi-VN')}`;
      } else if (deathDate?.year) {
        secondaryDateText = `Tạ thế năm ${deathDate.year}`;
      }

      // Year for sorting
      const yearNumber = deathDate?.year ?? (p.generation ? 1850 + p.generation * 28 : 1900);

      items.push({
        id: `anniv_${p.id}`,
        category: 'anniversary',
        title: `Lễ Giỗ & Cát Kỵ: ${p.fullName}`,
        subtitle: p.clanRole || (p.generation ? `Đời thứ ${p.generation}` : undefined),
        primaryDateText,
        secondaryDateText,
        yearNumber,
        lunarMonth: lunar?.month,
        lunarDay: lunar?.day,
        daysRemaining: upcoming?.daysRemaining,
        isUpcoming: upcoming !== undefined && upcoming.daysRemaining >= 0 && upcoming.daysRemaining <= 45,
        location: p.burialPlace ? `Mộ phần: ${p.burialPlace}` : p.deathPlace,
        description:
          lunar?.note ||
          p.merits ||
          (p.biography ? p.biography.slice(0, 180) + '...' : undefined),
        person: p,
        branch,
        badgeLabel: p.generation === 1 ? 'Giỗ Tổ Khai Sáng' : 'Lễ Giỗ Âm Lịch',
        badgeTone: p.generation === 1 ? 'terracotta' : 'gold',
      });
    }

    // 2. Life Events & Clan Milestones from user-entered lifeEvents
    for (const ev of lifeEvents) {
      const linkedPerson = ev.personId ? peopleMap.get(ev.personId) : undefined;
      const branch = linkedPerson?.branchId ? branchesMap.get(linkedPerson.branchId) : undefined;
      const dateText = formatFlexibleDate(ev.date);

      let tone: UnifiedHistoryItem['badgeTone'] = 'forest';
      let badgeLabel = 'Cột mốc';

      switch (ev.type) {
        case 'contribution':
          tone = 'gold';
          badgeLabel = 'Công đức & Trùng tu';
          break;
        case 'migration':
          tone = 'terracotta';
          badgeLabel = 'Di cư & Lập chi';
          break;
        case 'education':
          tone = 'forest';
          badgeLabel = 'Khoa cử & Học vị';
          break;
        case 'career':
          tone = 'bark';
          badgeLabel = 'Khởi nghiệp';
          break;
        case 'death':
          tone = 'terracotta';
          badgeLabel = 'Tế tự & Tưởng niệm';
          break;
        case 'marriage':
          tone = 'bark';
          badgeLabel = 'Hôn phối';
          break;
        default:
          tone = 'forest';
          badgeLabel = 'Cột mốc lịch sử';
      }

      items.push({
        id: `ev_${ev.id}`,
        category: 'milestone',
        title: ev.title,
        subtitle: linkedPerson
          ? `Gắn liền với ${linkedPerson.fullName}${
              linkedPerson.generation ? ` (Đời ${linkedPerson.generation})` : ''
            }`
          : undefined,
        primaryDateText: dateText,
        yearNumber: ev.date?.year ?? 1950,
        location: ev.location,
        description: ev.description,
        person: linkedPerson,
        branch,
        rawLifeEvent: ev,
        badgeLabel,
        badgeTone: tone,
      });
    }

    // 3. Branches founding milestones
    for (const b of branches) {
      const founder = b.founderId ? peopleMap.get(b.founderId) : undefined;
      let estYear: number | undefined;
      if (b.establishedPeriod) {
        const match = b.establishedPeriod.match(/\d{4}/);
        if (match) estYear = parseInt(match[0], 10);
      }

      items.push({
        id: `branch_${b.id}`,
        category: 'branch',
        title: `Khởi Lập ${b.name}`,
        subtitle: founder ? `Người sáng lập: ${founder.fullName}` : undefined,
        primaryDateText: b.establishedPeriod || 'Giai đoạn khai cơ',
        secondaryDateText: b.originPlace ? `Khởi phát tại: ${b.originPlace}` : undefined,
        yearNumber: estYear ?? (b.id === 'branch_daiton' ? 1872 : 1920),
        location: b.originPlace,
        description: b.description,
        person: founder,
        branch: b,
        badgeLabel: 'Khởi Lập Chi Họ',
        badgeTone: 'forest',
      });
    }

    // 4. Memory Stories & Milestones
    for (const story of stories) {
      let storyYear: number | undefined;
      if (story.periodLabel) {
        const match = story.periodLabel.match(/\d{4}/);
        if (match) storyYear = parseInt(match[0], 10);
      }

      const branch = story.branchId ? branchesMap.get(story.branchId) : undefined;

      items.push({
        id: `story_${story.id}`,
        category: 'story',
        title: story.title,
        subtitle: story.recordedBy ? `Ghi chép: ${story.recordedBy}` : undefined,
        primaryDateText: story.periodLabel || 'Ký ức truyền đời',
        secondaryDateText: story.summary,
        yearNumber: storyYear ?? 1945,
        description: story.content.slice(0, 220) + (story.content.length > 220 ? '...' : ''),
        branch,
        rawStory: story,
        badgeLabel: 'Ký Ức Truyền Đời',
        badgeTone: 'bark',
      });
    }

    return items;
  }, [people, lifeEvents, branches, stories, peopleMap, branchesMap, upcomingAnniversariesMap]);

  // Filter and Search logic
  const filteredItems = useMemo(() => {
    let result = allHistoryItems;

    // Filter by tab
    if (activeFilterTab === 'anniversaries') {
      result = result.filter((item) => item.category === 'anniversary');
    } else if (activeFilterTab === 'milestones') {
      result = result.filter((item) => item.category === 'milestone' || item.category === 'branch');
    } else if (activeFilterTab === 'stories') {
      result = result.filter((item) => item.category === 'story');
    }

    // Filter by branch
    if (selectedBranchId !== 'all') {
      result = result.filter(
        (item) => item.branch?.id === selectedBranchId || item.person?.branchId === selectedBranchId
      );
    }

    // Search query
    if (searchQuery.trim()) {
      const q = normalizeVietnameseText(searchQuery);
      result = result.filter((item) => {
        const textToSearch = [
          item.title,
          item.subtitle || '',
          item.primaryDateText,
          item.secondaryDateText || '',
          item.location || '',
          item.description || '',
          item.person?.fullName || '',
          item.person?.commonName || '',
          item.person?.tabooName || '',
          item.person?.courtesyName || '',
          item.branch?.name || '',
        ].join(' ');
        return normalizeVietnameseText(textToSearch).includes(q);
      });
    }

    // Sort
    const sorted = [...result];
    if (sortOrder === 'chronological') {
      sorted.sort((a, b) => {
        const yA = a.yearNumber ?? 9999;
        const yB = b.yearNumber ?? 9999;
        return yA - yB;
      });
    } else if (sortOrder === 'recentFirst') {
      sorted.sort((a, b) => {
        const yA = a.yearNumber ?? 0;
        const yB = b.yearNumber ?? 0;
        return yB - yA;
      });
    } else if (sortOrder === 'lunarOrder') {
      sorted.sort((a, b) => {
        // Lunar month first, then day
        const mA = a.lunarMonth ?? 99;
        const mB = b.lunarMonth ?? 99;
        if (mA !== mB) return mA - mB;
        return (a.lunarDay ?? 99) - (b.lunarDay ?? 99);
      });
    }

    return sorted;
  }, [allHistoryItems, activeFilterTab, selectedBranchId, searchQuery, sortOrder]);

  // Statistics for history section
  const stats = useMemo(() => {
    const annivCount = allHistoryItems.filter((i) => i.category === 'anniversary').length;
    const milestoneCount = allHistoryItems.filter((i) => i.category === 'milestone').length;
    const upcomingCount = allHistoryItems.filter(
      (i) => i.category === 'anniversary' && i.isUpcoming
    ).length;

    // Earliest recorded year
    let minYear = 9999;
    let maxYear = 0;
    for (const item of allHistoryItems) {
      if (item.yearNumber && item.yearNumber > 1000 && item.yearNumber < 2500) {
        if (item.yearNumber < minYear) minYear = item.yearNumber;
        if (item.yearNumber > maxYear) maxYear = item.yearNumber;
      }
    }

    return {
      total: allHistoryItems.length,
      annivCount,
      milestoneCount,
      upcomingCount,
      spanYears: minYear !== 9999 ? `${minYear} – ${maxYear || new Date().getFullYear()}` : 'Nhiều thế hệ',
    };
  }, [allHistoryItems]);

  const handleOpenAddMilestone = () => {
    setEditingEvent(null);
    setMilestoneModalOpen(true);
  };

  const handleEditMilestone = (event: LifeEvent) => {
    setEditingEvent(event);
    setMilestoneModalOpen(true);
  };

  return (
    <div className="space-y-5 rounded-3xl bg-[#FFFDF9] border border-[#E7DFD4] p-5 sm:p-7 shadow-xs">
      {/* Header and Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E7DFD4] pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#EAF2ED] text-[#1B3B2B]">
              <Scroll className="w-4 h-4" />
            </span>
            <h3 className="text-lg sm:text-xl font-serif font-bold text-[#1F1913]">
              Lịch Sử & Niên Biểu Dòng Họ
            </h3>
          </div>
          <p className="text-xs text-stone-500">
            Biên niên sử gia tộc: danh sách ngày giỗ, lễ kỵ âm lịch, các sự kiện khai cơ lập
            nghiệp và cột mốc lịch sử qua các thế hệ.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setNotifModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
              permission === 'granted' && notifSettings.enabled
                ? 'border-[#1B3B2B]/30 bg-[#EAF2ED] text-[#1B3B2B] hover:bg-[#D7E6DD]'
                : 'border-[#D5CABE] bg-white hover:bg-stone-50 text-[#54483C]'
            }`}
            title="Cài đặt thông báo trình duyệt nhắc nhở ngày giỗ và tiết kỵ"
          >
            <Bell className="w-3.5 h-3.5 text-[#8C6D32]" />
            <span>Nhắc nhở lễ giỗ</span>
            {permission === 'granted' && notifSettings.enabled && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#1B3B2B]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => onNavigate('rites')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#D5CABE] bg-white hover:bg-stone-50 text-xs font-semibold text-[#8C6D32] transition-colors"
            title="Mở Sổ trợ lý nghi lễ & văn khấn"
          >
            <Flame className="w-3.5 h-3.5" />
            <span>Sổ Nghi Lễ & Văn Khấn</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddMilestone}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#1B3B2B] hover:bg-[#28503C] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm cột mốc dòng họ</span>
          </button>
        </div>
      </div>

      {/* Notification Toast Feedback */}
      {notifFeedback && (
        <div className="p-3.5 rounded-2xl bg-[#EAF2ED] border border-[#D2E2D7] text-xs font-semibold text-[#1B3B2B] flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#1B3B2B] shrink-0" />
            <span>{notifFeedback}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotifFeedback(null)}
            className="text-stone-400 hover:text-stone-700 px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Invitational Reminder Banner if permission not granted yet */}
      {permission !== 'granted' && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#FAF1D6]/85 border border-[#E8DDCD] text-xs">
          <div className="flex items-center gap-2.5">
            <Bell className="w-4 h-4 text-[#8C6D32] shrink-0" />
            <p className="text-[#4A3B2C]">
              <strong>Kích hoạt thông báo đẩy:</strong> Nhận lời nhắc tự động trước ngày giỗ (trước 1, 3 ngày hoặc đúng ngày kỵ) để kịp thời chuẩn bị hương hoa mâm cỗ.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNotifModalOpen(true)}
            className="shrink-0 px-3.5 py-1.5 rounded-xl bg-[#8C6D32] hover:bg-[#745823] text-white font-semibold text-xs shadow-xs transition-colors"
          >
            Bật thông báo ngay
          </button>
        </div>
      )}

      {/* Highlights Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 p-3 sm:p-4 rounded-2xl bg-[#FAF8F5] border border-[#EAE3D7]">
        <div className="space-y-0.5">
          <p className="text-[11px] text-stone-500 font-medium">Lễ giỗ & Tiết kỵ</p>
          <p className="text-base sm:text-lg font-serif font-bold text-[#1F1913] tabular-nums">
            {stats.annivCount} <span className="text-xs font-sans font-normal text-stone-400">ngày giỗ</span>
          </p>
          {stats.upcomingCount > 0 && (
            <p className="text-[10px] text-[#8C6D32] font-semibold">
              {stats.upcomingCount} lễ kỵ sắp diễn ra
            </p>
          )}
        </div>

        <div className="space-y-0.5">
          <p className="text-[11px] text-stone-500 font-medium">Cột mốc lịch sử</p>
          <p className="text-base sm:text-lg font-serif font-bold text-[#1F1913] tabular-nums">
            {stats.milestoneCount}{' '}
            <span className="text-xs font-sans font-normal text-stone-400">sự kiện</span>
          </p>
          <p className="text-[10px] text-stone-400">Trùng tu, khai cơ & công đức</p>
        </div>

        <div className="space-y-0.5">
          <p className="text-[11px] text-stone-500 font-medium">Niên biểu ghi chép</p>
          <p className="text-base sm:text-lg font-serif font-bold text-[#1F1913] tabular-nums">
            {stats.spanYears}
          </p>
          <p className="text-[10px] text-stone-400">Lưu truyền qua các thời kỳ</p>
        </div>

        <div className="space-y-0.5">
          <p className="text-[11px] text-stone-500 font-medium">Từ đường phụng tự</p>
          <p className="text-xs sm:text-sm font-bold text-[#1B3B2B] truncate mt-0.5" title={settings.ancestralHallLocation}>
            {settings.ancestralHallLocation || 'Từ đường Đông Ngạc'}
          </p>
          <p className="text-[10px] text-stone-400 truncate">Hương hỏa muôn đời</p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-3">
        {/* Row 1: Segmented Filter Tabs & Branch Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1 p-1 rounded-xl bg-[#F2EDE4] border border-[#E5DEC7]">
            <button
              type="button"
              onClick={() => setActiveFilterTab('all')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeFilterTab === 'all'
                  ? 'bg-white text-[#1B3B2B] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              Tất cả ({allHistoryItems.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterTab('anniversaries')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeFilterTab === 'anniversaries'
                  ? 'bg-white text-[#8C6D32] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Lễ Giỗ & Tiết Kỵ ({stats.annivCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterTab('milestones')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeFilterTab === 'milestones'
                  ? 'bg-white text-[#1B3B2B] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Cột Mốc Lịch Sử ({stats.milestoneCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveFilterTab('stories')}
              className={`flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeFilterTab === 'stories'
                  ? 'bg-white text-[#3C3228] shadow-xs'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Ký Ức Truyền Đời ({stories.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="text-xs rounded-xl border border-[#D5CABE] bg-white px-2.5 py-1.5 text-[#1F1913] focus:border-[#1B3B2B] outline-none"
            >
              <option value="chronological">Xếp theo năm (Từ xưa đến nay)</option>
              <option value="recentFirst">Xếp theo năm (Mới nhất trước)</option>
              <option value="lunarOrder">Xếp theo tháng Âm lịch (Giêng → Chạp)</option>
            </select>

            {branches.length > 0 && (
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="text-xs rounded-xl border border-[#D5CABE] bg-white px-2.5 py-1.5 text-[#1F1913] focus:border-[#1B3B2B] outline-none max-w-[150px] truncate"
              >
                <option value="all">Tất cả chi họ</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Row 2: Search input */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Tìm theo tên tiền nhân, năm sự kiện, ngày giỗ âm lịch, địa danh (VD: '1948', 'Đông Ngạc', 'Khánh thành', 'Sài Gòn')..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white pl-9 pr-8 py-2 text-[#1F1913] placeholder:text-stone-400 focus:border-[#1B3B2B] focus:ring-1 focus:ring-[#1B3B2B] outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-700"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Content: Timeline / List View */}
      {filteredItems.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-[#D5CABE] bg-[#FAF8F5] text-center space-y-2">
          <p className="text-sm font-serif font-bold text-[#1F1913]">
            Không tìm thấy cột mốc hoặc lễ giỗ nào phù hợp
          </p>
          <p className="text-xs text-stone-500">
            Thử thay đổi từ khóa tìm kiếm hoặc bấm "Thêm cột mốc dòng họ" để ghi chép sự kiện mới.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setActiveFilterTab('all');
              setSelectedBranchId('all');
            }}
            className="mt-2 px-3 py-1.5 rounded-lg bg-white border border-[#D5CABE] text-xs font-semibold text-[#1B3B2B] hover:bg-stone-50 transition-colors"
          >
            Xóa bộ lọc
          </button>
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-4 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E2DACB]">
          {filteredItems.map((item) => {
            const isAnniv = item.category === 'anniversary';
            const isMilestone = item.category === 'milestone';
            const isBranch = item.category === 'branch';
            const isStory = item.category === 'story';

            return (
              <div key={item.id} className="relative group">
                {/* Timeline node icon */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-3.5 w-6 h-6 rounded-full border-2 border-[#FFFDF9] flex items-center justify-center shadow-xs transition-transform group-hover:scale-110 ${
                    isAnniv
                      ? 'bg-[#8C6D32] text-white'
                      : isMilestone
                      ? 'bg-[#1B3B2B] text-white'
                      : isBranch
                      ? 'bg-[#254F3A] text-white'
                      : 'bg-[#54483C] text-white'
                  }`}
                >
                  {isAnniv ? (
                    <Flame className="w-3 h-3" />
                  ) : isMilestone ? (
                    <Sparkles className="w-3 h-3" />
                  ) : isBranch ? (
                    <GitFork className="w-3 h-3" />
                  ) : (
                    <BookOpen className="w-3 h-3" />
                  )}
                </div>

                {/* Card */}
                <div className="rounded-2xl border border-[#E7DFD4] bg-[#FAF8F5]/80 hover:bg-[#FAF8F5] hover:border-[#1B3B2B]/30 hover:shadow-xs p-4 transition-all space-y-2.5">
                  {/* Top line: Badges and Date */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          item.badgeTone === 'gold'
                            ? 'bg-[#FAF1D6] text-[#8C6D32] border border-[#E8DDCD]'
                            : item.badgeTone === 'terracotta'
                            ? 'bg-[#FBEAE6] text-[#9A3824] border border-[#F2D1C8]'
                            : item.badgeTone === 'forest'
                            ? 'bg-[#EAF2ED] text-[#1B3B2B] border border-[#D2E2D7]'
                            : 'bg-[#F2EDE4] text-[#54483C] border border-[#E5DEC7]'
                        }`}
                      >
                        {item.badgeLabel}
                      </span>

                      {item.isUpcoming && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200">
                          Sắp đến ngày giỗ
                        </span>
                      )}

                      {item.branch && (
                        <span className="text-[11px] text-stone-500 font-medium">
                          {item.branch.name}
                        </span>
                      )}
                    </div>

                    {/* Date indicator */}
                    <div className="flex items-center gap-2 text-right">
                      <span className="text-xs font-semibold text-[#1F1913] tabular-nums">
                        {item.primaryDateText}
                      </span>
                      {item.secondaryDateText && (
                        <span className="hidden sm:inline text-[11px] text-[#8C6D32] font-medium">
                          • {item.secondaryDateText}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex items-start gap-3">
                    {item.person && (
                      <div
                        onClick={() => onSelectPerson(item.person!.id)}
                        className="cursor-pointer shrink-0 pt-0.5 hover:opacity-85 transition-opacity"
                        title="Xem hồ sơ cá nhân"
                      >
                        <HeritageAvatar
                          fullName={item.person.fullName}
                          portraitUrl={item.person.portraitUrl}
                          gender={item.person.gender}
                          size="md"
                          isLiving={item.person.isLiving}
                        />
                      </div>
                    )}

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h4
                          onClick={() => {
                            if (item.person) onSelectPerson(item.person.id);
                          }}
                          className={`text-sm sm:text-base font-serif font-bold text-[#1F1913] ${
                            item.person ? 'hover:text-[#1B3B2B] cursor-pointer' : ''
                          }`}
                        >
                          {item.title}
                        </h4>

                        {item.subtitle && (
                          <span className="text-xs text-stone-500 font-serif italic">
                            ({item.subtitle})
                          </span>
                        )}
                      </div>

                      {item.location && (
                        <p className="flex items-center gap-1.5 text-[11px] text-[#7A6E60]">
                          <MapPin className="w-3.5 h-3.5 text-[#8C6D32] shrink-0" />
                          <span className="truncate">{item.location}</span>
                        </p>
                      )}

                      {item.description && (
                        <p className="text-xs text-[#4A3F35] leading-relaxed pt-0.5 whitespace-pre-line">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom Action Affordances */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#EAE3D7] text-xs">
                    <div className="flex items-center gap-2 text-[11px] text-stone-500">
                      {item.person && (
                        <span>
                          {formatLifespan(
                            item.person.birthDate,
                            item.person.deathDate,
                            item.person.isLiving
                          )}
                        </span>
                      )}
                      {item.person?.generation && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>Đời thứ {item.person.generation}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {isAnniv && item.person && (
                        <button
                          type="button"
                          onClick={async () => {
                            const ok = await sendImmediateReminderForPerson(item.person!);
                            if (ok) {
                              setNotifFeedback(
                                `Đã gửi thông báo nhắc nhở ngày giỗ của ${item.person!.fullName} đến thiết bị!`
                              );
                              setTimeout(() => setNotifFeedback(null), 3500);
                            } else {
                              setNotifModalOpen(true);
                            }
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#D5CABE] text-[#54483C] hover:bg-[#FAF8F5] hover:text-[#1B3B2B] font-semibold text-[11px] transition-colors"
                          title="Nhận hoặc thử lời nhắc ngày giỗ này trên thiết bị"
                        >
                          <Bell className="w-3 h-3 text-[#8C6D32]" />
                          <span>Nhắc giỗ</span>
                        </button>
                      )}

                      {isAnniv && (
                        <button
                          type="button"
                          onClick={() => onNavigate('rites')}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#D5CABE] text-[#8C6D32] hover:bg-[#FAF1D6] font-semibold text-[11px] transition-colors"
                        >
                          <Flame className="w-3 h-3" />
                          <span>Văn khấn lễ giỗ</span>
                        </button>
                      )}

                      {item.person && (
                        <button
                          type="button"
                          onClick={() => onSelectPerson(item.person!.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-[#D5CABE] text-[#1B3B2B] hover:bg-stone-50 font-semibold text-[11px] transition-colors"
                        >
                          <span>Xem hồ sơ</span>
                        </button>
                      )}

                      {item.rawLifeEvent && (
                        <button
                          type="button"
                          onClick={() => handleEditMilestone(item.rawLifeEvent!)}
                          className="flex items-center gap-1 px-2 py-1 rounded-lg text-stone-500 hover:text-[#1B3B2B] hover:bg-white font-medium text-[11px] transition-colors"
                          title="Chỉnh sửa cột mốc"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Sửa</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for adding/editing clan milestones */}
      <ClanMilestoneModal
        open={milestoneModalOpen}
        editingEvent={editingEvent}
        onClose={() => {
          setMilestoneModalOpen(false);
          setEditingEvent(null);
        }}
      />

      {/* Modal for browser push notification settings */}
      <NotificationSettingsModal
        open={notifModalOpen}
        onClose={() => setNotifModalOpen(false)}
      />
    </div>
  );
};
