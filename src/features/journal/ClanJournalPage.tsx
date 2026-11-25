import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Archive,
  ArrowUpDown,
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  Edit3,
  ExternalLink,
  FileText,
  Filter,
  Flame,
  LayoutGrid,
  List,
  MapPin,
  PenTool,
  Pin,
  Plus,
  Printer,
  Scroll,
  Search,
  Share2,
  Sparkles,
  Tag,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { HeritageAvatar } from '../../components/HeritageAvatar';
import { useGenealogy } from '../../context/GenealogyContext';
import { FamilyStory, NavigationTab, Person } from '../../models/genealogy';
import { ClanJournalModal, JOURNAL_CATEGORY_META, JournalCategory } from './ClanJournalModal';

interface ClanJournalPageProps {
  onNavigate?: (tab: NavigationTab) => void;
  onSelectPerson?: (personId: string) => void;
}

export const ClanJournalPage: React.FC<ClanJournalPageProps> = ({
  onNavigate,
  onSelectPerson,
}) => {
  const { stories, branches, settings } = useGenealogy();

  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest' | 'alphabetical'>('newest');
  const [viewMode, setViewMode] = useState<'card' | 'reader'>('card');
  const [expandedStories, setExpandedStories] = useState<Record<string, boolean>>({});

  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStory, setEditingStory] = useState<FamilyStory | null>(null);

  const branchesMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of branches) map.set(b.id, b.name);
    return map;
  }, [branches]);

  // Filtered stories calculation
  const filteredStories = useMemo(() => {
    return stories.filter((story) => {
      // 1. Branch filter
      if (selectedBranchId !== 'all') {
        if (story.branchId !== selectedBranchId) return false;
      }

      // 2. Category filter
      if (activeCategory !== 'all') {
        const cat = story.category || 'historical_event';
        if (cat !== activeCategory) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const titleMatch = story.title.toLowerCase().includes(q);
        const contentMatch = story.content.toLowerCase().includes(q);
        const summaryMatch = story.summary?.toLowerCase().includes(q);
        const locMatch = story.location?.toLowerCase().includes(q);
        const recordMatch = story.recordedBy?.toLowerCase().includes(q);
        const tagMatch = story.tags?.some((t) => t.toLowerCase().includes(q));
        if (!titleMatch && !contentMatch && !summaryMatch && !locMatch && !recordMatch && !tagMatch) {
          return false;
        }
      }

      return true;
    });
  }, [stories, selectedBranchId, activeCategory, searchQuery]);

  // Sorted stories
  const sortedStories = useMemo(() => {
    return [...filteredStories].sort((a, b) => {
      // Pinned entries always come first
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;

      if (sortOrder === 'alphabetical') {
        return a.title.localeCompare(b.title, 'vi');
      }

      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();

      if (sortOrder === 'oldest') {
        return dateA - dateB;
      }
      return dateB - dateA;
    });
  }, [filteredStories, sortOrder]);

  // Statistics counters
  const stats = useMemo(() => {
    let historicalCount = 0;
    let memoryCount = 0;
    let ruleCount = 0;
    let renovationCount = 0;
    let pinnedCount = 0;

    for (const s of stories) {
      if (s.isPinned) pinnedCount++;
      const c = s.category || 'historical_event';
      if (c === 'historical_event') historicalCount++;
      else if (c === 'clan_memory') memoryCount++;
      else if (c === 'communal_rule') ruleCount++;
      else if (c === 'renovation_merit') renovationCount++;
    }

    return {
      total: stories.length,
      historicalCount,
      memoryCount,
      ruleCount,
      renovationCount,
      pinnedCount,
    };
  }, [stories]);

  const toggleExpand = (id: string) => {
    setExpandedStories((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleOpenAdd = () => {
    setEditingStory(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (story: FamilyStory) => {
    setEditingStory(story);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-16 animate-in fade-in">
      {/* Hero Header Banner */}
      <div className="relative rounded-3xl bg-linear-to-br from-[#1B3B2B] via-[#234A36] to-[#142D20] text-white p-6 sm:p-8 shadow-md overflow-hidden">
        {/* Subtle decorative background watermarks */}
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 text-[#DBC599]/10 font-serif text-9xl select-none pointer-events-none">
          誌
        </div>

        <div className="relative z-10 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#EBD9B2]">
            <span className="font-semibold text-[#DBC599] tracking-wider uppercase flex items-center gap-1.5">
              <Scroll className="w-3.5 h-3.5 text-[#DBC599]" />
              <span>Biên Niên Ký Tộc Phả</span>
            </span>
            <span aria-hidden="true" className="text-[#DBC599]/40">·</span>
            <span className="text-[#E6DFD5]">
              Dòng họ {settings.clanName || 'Việt Nam'} · {stats.total} bài ghi chép
            </span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-serif font-bold text-[#FFFDF9] tracking-tight leading-snug">
            Nhật Ký Dòng Họ & Kỷ Niệm Chung
          </h2>

          <p className="text-xs sm:text-sm text-[#E6DFD5] leading-relaxed max-w-2xl">
            Nơi ghi chép các sự kiện lịch sử chung, hương ước gia quy, công đức trùng tu từ đường và những kỷ niệm đáng nhớ của đại gia đình không thuộc riêng về bất kỳ cá nhân nào.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-3">
            <button
              type="button"
              onClick={handleOpenAdd}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#DBC599] hover:bg-[#CBB284] text-[#1B3B2B] font-semibold text-xs shadow-xs transition-colors"
            >
              <PenTool className="w-4 h-4" />
              <span>Viết nhật ký mới</span>
            </button>

            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#EBD9B2] font-medium text-xs border border-white/15 transition-colors"
              >
                <Compass className="w-4 h-4 text-[#DBC599]" />
                <span>Về Tổng quan</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#EBD9B2] font-medium text-xs border border-white/15 transition-colors"
              title="In bản nhật ký dòng họ"
            >
              <Printer className="w-4 h-4 text-[#DBC599]" />
              <span className="hidden sm:inline">In trang này</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Tổng số bài viết</span>
            <BookOpen className="w-4 h-4 text-[#1B3B2B]" />
          </div>
          <div className="flex items-baseline gap-1.5 pt-1">
            <span className="text-2xl sm:text-3xl font-serif font-bold text-[#1F1913]">
              {stats.total}
            </span>
            <span className="text-xs text-stone-500">mục nhật ký</span>
          </div>
          <p className="text-[10px] text-stone-400">
            {stats.pinnedCount} bài viết được ghim ưu tiên
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Sự kiện lịch sử</span>
            <Calendar className="w-4 h-4 text-[#8C6D32]" />
          </div>
          <div className="flex items-baseline gap-1.5 pt-1">
            <span className="text-2xl sm:text-3xl font-serif font-bold text-[#8C6D32]">
              {stats.historicalCount}
            </span>
            <span className="text-xs text-stone-500">sự kiện</span>
          </div>
          <p className="text-[10px] text-stone-400">
            Dấu mốc biến cố & truyền thống gia tộc
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Kỷ niệm đáng nhớ</span>
            <Sparkles className="w-4 h-4 text-[#8C3A27]" />
          </div>
          <div className="flex items-baseline gap-1.5 pt-1">
            <span className="text-2xl sm:text-3xl font-serif font-bold text-[#8C3A27]">
              {stats.memoryCount}
            </span>
            <span className="text-xs text-stone-500">kỷ niệm</span>
          </div>
          <p className="text-[10px] text-stone-400">
            Đoàn tụ, ngày hội làng, lễ tạ ơn tổ tiên
          </p>
        </div>

        <div className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-xs space-y-1">
          <div className="flex items-center justify-between text-stone-500">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Hương ước & Công đức</span>
            <Flame className="w-4 h-4 text-[#2E6B4F]" />
          </div>
          <div className="flex items-baseline gap-1.5 pt-1">
            <span className="text-2xl sm:text-3xl font-serif font-bold text-[#2E6B4F]">
              {stats.ruleCount + stats.renovationCount}
            </span>
            <span className="text-xs text-stone-500">điều lệ & trùng tu</span>
          </div>
          <p className="text-[10px] text-stone-400">
            Gia quy dòng họ & tôn tạo nhà thờ
          </p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="p-4 rounded-3xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm nhật ký theo tiêu đề, nội dung, người ghi, địa điểm..."
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-[#D5CABE] bg-[#FAF8F5] text-xs text-[#1F1913] placeholder-stone-400 focus:outline-none focus:border-[#1B3B2B] focus:bg-white transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
              >
                ×
              </button>
            )}
          </div>

          {/* Right Controls: Branch, Sort, View mode */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Branch Filter */}
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-[#D5CABE] bg-[#FAF8F5] text-xs text-[#2C231A] font-medium outline-none"
            >
              <option value="all">Tất cả chi họ</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            {/* Sort Order */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl border border-[#D5CABE] bg-[#FAF8F5] text-xs text-[#2C231A] font-medium outline-none"
            >
              <option value="newest">Ghi chép mới nhất</option>
              <option value="oldest">Ghi chép cũ nhất</option>
              <option value="alphabetical">Tiêu đề (A-Z)</option>
            </select>

            {/* View Mode Toggle */}
            <div className="inline-flex p-1 rounded-xl bg-[#EDE4D6] border border-[#DDD0BF]">
              <button
                type="button"
                onClick={() => setViewMode('card')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'card'
                    ? 'bg-white text-[#1B3B2B] shadow-2xs'
                    : 'text-[#6A5A4A] hover:text-[#1F1913]'
                }`}
                title="Chế độ xem Thẻ Niên Biểu"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('reader')}
                className={`p-1.5 rounded-lg transition-colors ${
                  viewMode === 'reader'
                    ? 'bg-white text-[#1B3B2B] shadow-2xs'
                    : 'text-[#6A5A4A] hover:text-[#1F1913]'
                }`}
                title="Chế độ xem Sổ Ký Sự Phả Học"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-1 no-scrollbar text-xs">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
              activeCategory === 'all'
                ? 'bg-[#1B3B2B] text-white shadow-xs'
                : 'bg-[#FAF8F5] text-stone-600 hover:bg-stone-100 border border-[#E7DFD4]'
            }`}
          >
            Tất cả ({stories.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('historical_event')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
              activeCategory === 'historical_event'
                ? 'bg-[#1B3B2B] text-white shadow-xs'
                : 'bg-[#FAF8F5] text-stone-600 hover:bg-stone-100 border border-[#E7DFD4]'
            }`}
          >
            Sự kiện lịch sử ({stats.historicalCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('clan_memory')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
              activeCategory === 'clan_memory'
                ? 'bg-[#1B3B2B] text-white shadow-xs'
                : 'bg-[#FAF8F5] text-stone-600 hover:bg-stone-100 border border-[#E7DFD4]'
            }`}
          >
            Kỷ niệm chung ({stats.memoryCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('renovation_merit')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
              activeCategory === 'renovation_merit'
                ? 'bg-[#1B3B2B] text-white shadow-xs'
                : 'bg-[#FAF8F5] text-stone-600 hover:bg-stone-100 border border-[#E7DFD4]'
            }`}
          >
            Trùng tu & Công đức ({stats.renovationCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('communal_rule')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
              activeCategory === 'communal_rule'
                ? 'bg-[#1B3B2B] text-white shadow-xs'
                : 'bg-[#FAF8F5] text-stone-600 hover:bg-stone-100 border border-[#E7DFD4]'
            }`}
          >
            Hương ước & Quy ước ({stats.ruleCount})
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('general_note')}
            className={`px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-all ${
              activeCategory === 'general_note'
                ? 'bg-[#1B3B2B] text-white shadow-xs'
                : 'bg-[#FAF8F5] text-stone-600 hover:bg-stone-100 border border-[#E7DFD4]'
            }`}
          >
            Ghi chú chung
          </button>
        </div>
      </div>

      {/* Stories / Journal Feed */}
      {sortedStories.length === 0 ? (
        <div className="rounded-3xl bg-[#FFFDF9] border-2 border-dashed border-[#E7DFD4] p-12 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FAF5EB] border border-[#E3CCA0] flex items-center justify-center text-[#8C6D32]">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="font-serif font-bold text-lg text-[#1F1913]">
              Chưa có ghi chép nhật ký nào
            </h3>
            <p className="text-xs text-[#6E5F50]">
              {searchQuery || activeCategory !== 'all' || selectedBranchId !== 'all'
                ? 'Không tìm thấy ghi chép phù hợp với bộ lọc hiện tại. Thử xóa từ khóa tìm kiếm.'
                : 'Hãy bắt đầu ghi lại những sự kiện lịch sử chung, lễ khánh thành nhà thờ, các quy ước và kỷ niệm đáng nhớ của dòng họ.'}
            </p>
          </div>
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1B3B2B] text-white font-semibold text-xs shadow-xs hover:bg-[#28503C] transition-colors"
          >
            <PenTool className="w-4 h-4 text-[#DBC599]" />
            <span>Viết bài nhật ký đầu tiên</span>
          </button>
        </div>
      ) : viewMode === 'card' ? (
        /* CARD FEED VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {sortedStories.map((story) => {
            const isExpanded = Boolean(expandedStories[story.id]);
            const cat = (story.category as JournalCategory) || 'historical_event';
            const catMeta = JOURNAL_CATEGORY_META[cat] || JOURNAL_CATEGORY_META.historical_event;
            const branchName = story.branchId ? branchesMap.get(story.branchId) : 'Toàn dòng tộc';

            return (
              <div
                key={story.id}
                className={`rounded-3xl bg-[#FFFDF9] border transition-all p-5 sm:p-6 shadow-xs flex flex-col justify-between relative ${
                  story.isPinned
                    ? 'border-[#C19B4C] ring-1 ring-[#C19B4C]/30 bg-linear-to-b from-[#FFFDF9] to-[#FAF6EE]'
                    : 'border-[#E7DFD4] hover:border-[#1B3B2B]/40 hover:shadow-md'
                }`}
              >
                {/* Pinned Marker */}
                {story.isPinned && (
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-[#8C6D32] mb-1">
                    <Pin className="w-3 h-3 text-[#C19B4C] fill-[#C19B4C]" />
                    <span>Ghim ưu tiên</span>
                  </div>
                )}

                <div className="space-y-3">
                  {/* Category and Period (Zero-Pill Unboxed Metadata) */}
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-semibold">
                    <span className="uppercase tracking-wider text-[#1B3B2B] font-bold">
                      {catMeta.label}
                    </span>

                    {story.periodLabel && (
                      <>
                        <span aria-hidden="true" className="text-stone-300">·</span>
                        <span className="text-[#8C6D32]">{story.periodLabel}</span>
                      </>
                    )}

                    <span aria-hidden="true" className="text-stone-300">·</span>
                    <span className="text-stone-500 font-medium">{branchName}</span>
                  </div>

                  {/* Title */}
                  <h3 className="font-serif font-bold text-lg sm:text-xl text-[#1F1913] leading-snug">
                    {story.title}
                  </h3>

                  {/* Location & Recorder metadata */}
                  {(story.location || story.recordedBy) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#7A6E60] border-t border-[#F0EAE1] pt-2">
                      {story.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#2E6B4F]" />
                          <span>{story.location}</span>
                        </div>
                      )}
                      {story.recordedBy && (
                        <div className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-stone-400" />
                          <span>Ghi chép: <strong>{story.recordedBy}</strong></span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Summary Callout (if any) */}
                  {story.summary && (
                    <div className="p-3 rounded-2xl bg-[#FAF8F5] border border-[#E8DFD3] text-xs font-serif italic text-[#4A3F33]">
                      &ldquo;{story.summary}&rdquo;
                    </div>
                  )}

                  {/* Body Content */}
                  <div className="text-xs sm:text-sm text-[#3E342B] leading-relaxed whitespace-pre-line font-serif">
                    {isExpanded || story.content.length <= 250
                      ? story.content
                      : `${story.content.slice(0, 250)}...`}
                  </div>

                  {/* Read More / Read Less */}
                  {story.content.length > 250 && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(story.id)}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#1B3B2B] hover:text-[#28503C] transition-colors"
                    >
                      <span>{isExpanded ? 'Thu gọn bài viết' : 'Đọc toàn văn nhật ký'}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}

                  {/* Tags */}
                  {story.tags && story.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {story.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-stone-100 text-stone-600 border border-stone-200"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#F0EAE1] text-xs">
                  <span className="text-[10px] text-stone-400">
                    Cập nhật: {new Date(story.updatedAt).toLocaleDateString('vi-VN')}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(story)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#D5CABE] bg-white text-[#54483C] hover:bg-stone-50 font-semibold shadow-2xs transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#1B3B2B]" />
                    <span>Sửa bài</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* READER NOTEBOOK VIEW */
        <div className="rounded-3xl bg-[#FFFDF9] border border-[#E7DFD4] p-6 sm:p-8 shadow-xs space-y-8 divide-y divide-[#EADCC8]">
          {sortedStories.map((story, index) => {
            const cat = (story.category as JournalCategory) || 'historical_event';
            const catMeta = JOURNAL_CATEGORY_META[cat] || JOURNAL_CATEGORY_META.historical_event;

            return (
              <article key={story.id} className={index > 0 ? 'pt-8' : ''}>
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-semibold">
                      <span className="uppercase tracking-wider text-[#1B3B2B] font-bold">
                        {catMeta.label}
                      </span>
                      {story.periodLabel && (
                        <>
                          <span aria-hidden="true" className="text-stone-300">·</span>
                          <span className="font-serif font-bold text-[#8C6D32]">
                            {story.periodLabel}
                          </span>
                        </>
                      )}
                      {story.isPinned && (
                        <>
                          <span aria-hidden="true" className="text-stone-300">·</span>
                          <span className="text-[#8C6D32]">Đã ghim</span>
                        </>
                      )}
                    </div>

                    <h3 className="font-serif font-bold text-xl sm:text-2xl text-[#1F1913]">
                      {story.title}
                    </h3>

                    {(story.location || story.recordedBy) && (
                      <div className="text-xs text-[#7A6E60] flex items-center gap-3">
                        {story.location && <span>Địa điểm: {story.location}</span>}
                        {story.recordedBy && <span>Người ghi: {story.recordedBy}</span>}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(story)}
                    className="self-start flex items-center gap-1 px-3 py-1.5 rounded-xl border border-[#D5CABE] bg-white text-[#54483C] hover:bg-stone-50 text-xs font-semibold"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Sửa</span>
                  </button>
                </div>

                {story.summary && (
                  <div className="my-3 p-3 rounded-xl bg-[#FAF8F5] border-l-4 border-[#1B3B2B] text-xs font-serif italic text-[#4A3F33]">
                    {story.summary}
                  </div>
                )}

                <div className="mt-3 text-sm text-[#2C231A] leading-relaxed font-serif whitespace-pre-line">
                  {story.content}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Clan Journal Entry Add / Edit Modal */}
      <ClanJournalModal
        open={modalOpen}
        editingStory={editingStory}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
};
