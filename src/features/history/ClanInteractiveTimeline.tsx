import React, { useMemo, useState } from 'react';
import {
  ArrowDownUp,
  Award,
  Baby,
  BookOpen,
  Calendar,
  ChevronDown,
  ChevronUp,
  Filter,
  Flame,
  Heart,
  History,
  Landmark,
  MapPin,
  Plane,
  Plus,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { HeritageAvatar } from '../../components/HeritageAvatar';
import { useGenealogy } from '../../context/GenealogyContext';
import { LifeEvent, Person } from '../../models/genealogy';
import { formatFlexibleDate, formatLunarAnniversary } from '../../utils/dateUtils';
import { ClanMilestoneModal } from './ClanMilestoneModal';

export type TimelineEventType = 'milestone' | 'anniversary' | 'birth' | 'biography' | 'migration';

export interface TimelineEventItem {
  id: string;
  year: number;
  dateDisplay: string;
  lunarDate?: string;
  title: string;
  type: TimelineEventType;
  description?: string;
  location?: string;
  person?: Person;
  branchName?: string;
  categoryLabel: string;
  badgeColor: string;
  iconBgColor: string;
  iconColor: string;
}

interface ClanInteractiveTimelineProps {
  onSelectPerson?: (personId: string) => void;
}

export const ClanInteractiveTimeline: React.FC<ClanInteractiveTimelineProps> = ({
  onSelectPerson,
}) => {
  const { people, lifeEvents, branches, getBranchById } = useGenealogy();

  const [filterType, setFilterType] = useState<string>('all');
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [milestoneModalOpen, setMilestoneModalOpen] = useState(false);

  // Compile all chronological timeline items across lifeEvents, people births, deaths, and biographies
  const allEvents: TimelineEventItem[] = useMemo(() => {
    const items: TimelineEventItem[] = [];

    // 1. Clan Milestones & LifeEvents
    for (const event of lifeEvents) {
      const year = event.date?.year || 1900;
      const person = event.personId ? people.find((p) => p.id === event.personId) : undefined;
      const branch = person?.branchId ? getBranchById(person.branchId) : undefined;

      const isMigration =
        event.type === 'migration' ||
        event.title.toLowerCase().includes('di cư') ||
        event.title.toLowerCase().includes('tản cư');

      items.push({
        id: `le_${event.id}`,
        year,
        dateDisplay: event.date ? formatFlexibleDate(event.date) : `Năm ${year}`,
        title: event.title,
        type: isMigration ? 'migration' : 'milestone',
        description: event.description,
        location: event.location,
        person,
        branchName: branch?.name,
        categoryLabel: isMigration ? 'Di cư lập nghiệp' : 'Mốc lịch sử',
        badgeColor: isMigration ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800',
        iconBgColor: isMigration ? 'bg-[#FAF0DC]' : 'bg-[#EAF2ED]',
        iconColor: isMigration ? 'text-[#8C6D32]' : 'text-[#1B3B2B]',
      });
    }

    // 2. People Births & Lifespans
    for (const p of people) {
      const branch = p.branchId ? getBranchById(p.branchId) : undefined;

      // Birth event
      if (p.birthDate?.year) {
        items.push({
          id: `birth_${p.id}`,
          year: p.birthDate.year,
          dateDisplay: formatFlexibleDate(p.birthDate),
          title: `Chào đời: ${p.fullName}${p.generation ? ` (Đời thứ ${p.generation})` : ''}`,
          type: 'birth',
          description: p.birthPlace
            ? `Nơi sinh tại ${p.birthPlace}.${p.commonName ? ` Tên thường gọi là ${p.commonName}.` : ''}`
            : undefined,
          location: p.birthPlace || p.ancestralHome,
          person: p,
          branchName: branch?.name,
          categoryLabel: 'Khai sinh',
          badgeColor: 'bg-blue-100 text-blue-800',
          iconBgColor: 'bg-blue-50',
          iconColor: 'text-blue-700',
        });
      }

      // Death & Memorial Anniversary event
      if (!p.isLiving && p.deathDate?.year) {
        const lunarStr = p.deathAnniversaryLunar
          ? formatLunarAnniversary(p.deathAnniversaryLunar)
          : undefined;

        items.push({
          id: `death_${p.id}`,
          year: p.deathDate.year,
          dateDisplay: formatFlexibleDate(p.deathDate),
          lunarDate: lunarStr,
          title: `Lễ kỵ giỗ & Tạ thế: ${p.fullName}`,
          type: 'anniversary',
          description: [
            p.deathPlace ? `Tạ thế tại ${p.deathPlace}.` : '',
            p.burialPlace ? `Phần mộ an táng tại ${p.burialPlace}.` : '',
            p.merits ? `Công đức: ${p.merits}` : '',
          ]
            .filter(Boolean)
            .join(' '),
          location: p.burialPlace || p.deathPlace,
          person: p,
          branchName: branch?.name,
          categoryLabel: 'Lễ kỵ giỗ',
          badgeColor: 'bg-rose-100 text-rose-800',
          iconBgColor: 'bg-rose-50',
          iconColor: 'text-[#8C3A27]',
        });
      }

      // Biography highlight
      if (p.biography && p.biography.trim().length > 40 && p.birthDate?.year) {
        // Place biography event midway or near birth
        items.push({
          id: `bio_${p.id}`,
          year: p.birthDate.year + 20, // estimated adult prime era
          dateDisplay: `Thời kỳ hoạt động (${p.birthDate.year + 15} – ${
            p.deathDate?.year || p.birthDate.year + 65
          })`,
          title: `Ký sự cuộc đời & Công đức: ${p.fullName}`,
          type: 'biography',
          description: p.biography,
          location: p.residence || p.ancestralHome,
          person: p,
          branchName: branch?.name,
          categoryLabel: 'Tiểu sử',
          badgeColor: 'bg-purple-100 text-purple-800',
          iconBgColor: 'bg-purple-50',
          iconColor: 'text-purple-700',
        });
      }
    }

    return items;
  }, [people, lifeEvents, getBranchById]);

  // Filter & Search
  const filteredEvents = useMemo(() => {
    let result = allEvents;

    // Filter by type
    if (filterType !== 'all') {
      result = result.filter((e) => e.type === filterType);
    }

    // Filter by branch
    if (filterBranch !== 'all') {
      result = result.filter((e) => e.person?.branchId === filterBranch);
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          e.location?.toLowerCase().includes(q) ||
          e.person?.fullName.toLowerCase().includes(q) ||
          String(e.year).includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      if (sortOrder === 'asc') return a.year - b.year;
      return b.year - a.year;
    });

    return result;
  }, [allEvents, filterType, filterBranch, searchQuery, sortOrder]);

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    setExpandedIds(new Set(filteredEvents.map((e) => e.id)));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  return (
    <div className="rounded-3xl bg-[#FFFDF9] border border-[#E7DFD4] p-5 sm:p-6 shadow-xs space-y-6">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E7DFD4] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#C19B4C]" />
            <h3 className="text-base sm:text-lg font-serif font-bold text-[#1F1913]">
              Dòng Thời Gian Dòng Họ (Interactive Timeline)
            </h3>
          </div>
          <p className="text-xs text-[#6E5F50] mt-0.5">
            Trục niên biểu lịch sử theo chiều dọc kết hợp tiểu sử, lễ kỵ giỗ và các biến cố di cư truyền đời
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setMilestoneModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#1B3B2B] hover:bg-[#28503C] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm cột mốc</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#FAF7F2] p-3 rounded-2xl border border-[#E7DFD4] text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Type filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl border border-[#D5CABE] bg-white text-[#2C231B] font-medium"
          >
            <option value="all">Tất cả sự kiện ({allEvents.length})</option>
            <option value="milestone">Cột mốc lịch sử</option>
            <option value="anniversary">Ngày giỗ & Lễ kỵ</option>
            <option value="birth">Ngày sinh & Khai sinh</option>
            <option value="biography">Tiểu sử & Ký sự</option>
            <option value="migration">Di cư & Lập nghiệp</option>
          </select>

          {/* Branch filter */}
          {branches.length > 1 && (
            <select
              value={filterBranch}
              onChange={(e) => setFilterBranch(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-[#D5CABE] bg-white text-[#2C231B] font-medium"
            >
              <option value="all">Tất cả chi họ</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          {/* Sort order toggle */}
          <button
            type="button"
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-[#D5CABE] text-[#3D3227] font-semibold hover:bg-stone-50 transition-colors"
          >
            <ArrowDownUp className="w-3.5 h-3.5 text-[#C19B4C]" />
            <span>{sortOrder === 'asc' ? 'Cổ kính → Gần đây' : 'Gần đây → Cổ kính'}</span>
          </button>
        </div>

        {/* Search Input & Expand/Collapse Toggle */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm sự kiện, địa danh..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#D5CABE] bg-white text-xs placeholder:text-stone-400 focus:outline-none focus:ring-1 focus:ring-[#1B3B2B]"
            />
          </div>

          <button
            type="button"
            onClick={expandedIds.size > 0 ? collapseAll : expandAll}
            className="px-2.5 py-1.5 rounded-xl bg-white border border-[#D5CABE] text-[11px] font-semibold text-[#54473A] hover:bg-stone-50 transition-colors shrink-0"
          >
            {expandedIds.size > 0 ? 'Thu gọn' : 'Mở rộng'}
          </button>
        </div>
      </div>

      {/* Vertical Interactive Timeline Line Container */}
      <div className="relative pl-6 sm:pl-10 space-y-6 before:content-[''] before:absolute before:left-3 sm:before:left-5 before:top-4 before:bottom-4 before:w-0.5 before:bg-linear-to-b before:from-[#1B3B2B] before:via-[#C19B4C] before:to-[#8C3A27]">
        {filteredEvents.length === 0 ? (
          <div className="py-12 text-center text-stone-400 space-y-1">
            <p className="font-serif text-sm">Không tìm thấy sự kiện phù hợp với bộ lọc</p>
            <p className="text-xs">Hãy thử đổi loại sự kiện hoặc từ khóa tìm kiếm</p>
          </div>
        ) : (
          filteredEvents.map((event) => {
            const isExpanded = expandedIds.has(event.id);

            // Icon by event type
            const IconComponent =
              event.type === 'milestone'
                ? Landmark
                : event.type === 'anniversary'
                ? Flame
                : event.type === 'birth'
                ? Baby
                : event.type === 'migration'
                ? Plane
                : BookOpen;

            return (
              <div key={event.id} className="relative group animate-in fade-in">
                {/* Node marker on the line */}
                <div
                  className={`absolute -left-6 sm:-left-10 top-3.5 w-6 h-6 sm:w-7 sm:h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center transition-transform group-hover:scale-110 z-10 ${event.iconBgColor}`}
                >
                  <IconComponent className={`w-3.5 h-3.5 ${event.iconColor}`} />
                </div>

                {/* Timeline Card */}
                <div className="rounded-2xl bg-white border border-[#E7DFD4] p-4 sm:p-5 shadow-2xs hover:border-[#1B3B2B]/40 hover:shadow-xs transition-all space-y-2.5">
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#F5EFE6] pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-[#1B3B2B] bg-[#EAF2ED] px-2 py-0.5 rounded-lg border border-[#C6DDD0]">
                        {event.year > 0 ? `Năm ${event.year}` : 'Cổ đại'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${event.badgeColor}`}
                      >
                        {event.categoryLabel}
                      </span>
                      {event.branchName && (
                        <span className="text-[10px] font-medium text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
                          {event.branchName}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-stone-400">
                      <span>{event.dateDisplay}</span>
                      {event.lunarDate && (
                        <span className="text-[#8C6D32] font-medium hidden sm:inline">
                          ({event.lunarDate})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Main Info */}
                  <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <h4 className="text-sm font-serif font-bold text-[#1F1913] group-hover:text-[#1B3B2B] transition-colors">
                        {event.title}
                      </h4>

                      {event.location && (
                        <div className="flex items-center gap-1 text-[11px] text-stone-500">
                          <MapPin className="w-3 h-3 text-[#C19B4C] shrink-0" />
                          <span>{event.location}</span>
                        </div>
                      )}

                      {event.description && (
                        <p
                          className={`text-xs text-[#54483C] leading-relaxed pt-1 whitespace-pre-line ${
                            !isExpanded ? 'line-clamp-2' : ''
                          }`}
                        >
                          {event.description}
                        </p>
                      )}
                    </div>

                    {/* Person Avatar & Profile Link */}
                    {event.person && (
                      <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center bg-[#FAF8F5] p-2 rounded-xl border border-[#E7DFD4]">
                        <HeritageAvatar
                          fullName={event.person.fullName}
                          portraitUrl={event.person.portraitUrl}
                          gender={event.person.gender}
                          size="sm"
                          isLiving={event.person.isLiving}
                        />
                        <div className="text-left">
                          <p className="text-xs font-serif font-bold text-[#1F1913] truncate max-w-[130px]">
                            {event.person.fullName}
                          </p>
                          {onSelectPerson && (
                            <button
                              type="button"
                              onClick={() => onSelectPerson(event.person!.id)}
                              className="text-[10px] font-semibold text-[#1B3B2B] hover:underline block"
                            >
                              Xem hồ sơ →
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Toggle for longer descriptions */}
                  {event.description && event.description.length > 120 && (
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => toggleExpand(event.id)}
                        className="flex items-center gap-1 text-[11px] font-semibold text-[#8C6D32] hover:text-[#5C451D]"
                      >
                        <span>{isExpanded ? 'Thu gọn' : 'Xem toàn văn'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Clan Milestone Creation Modal */}
      <ClanMilestoneModal
        open={milestoneModalOpen}
        onClose={() => setMilestoneModalOpen(false)}
      />
    </div>
  );
};
