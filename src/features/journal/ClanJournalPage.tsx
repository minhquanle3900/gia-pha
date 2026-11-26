import React, { useMemo, useState } from 'react';

import { BookOpen, ChevronDown, ChevronUp, Compass, Edit3, LayoutGrid, List, MapPin, PenTool, Pin, Printer, Search, User, X } from 'lucide-react';
import { useGenealogy } from '../../context/GenealogyContext';
import { FamilyStory, NavigationTab } from '../../models/genealogy';
import { ClanJournalModal, JOURNAL_CATEGORY_META, JournalCategory } from './ClanJournalModal';

type JournalFilter = 'all' | JournalCategory;
type SortOrder = 'newest' | 'oldest' | 'alphabetical';

const selectClass = 'mt-1 min-h-11 min-w-0 w-full rounded-xl border border-[#D5CABE] bg-[#FAF8F5] px-2.5 text-base text-[#2C241C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 sm:text-sm';

interface ClanJournalPageProps {
  onNavigate?: (tab: NavigationTab) => void;
  onSelectPerson?: (personId: string) => void;
}

export const ClanJournalPage: React.FC<ClanJournalPageProps> = ({
  onNavigate,
}) => {
  const { stories, branches, settings } = useGenealogy();

  const [activeCategory, setActiveCategory] = useState<JournalFilter>('all');
  const [selectedBranchId, setSelectedBranchId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
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

  const counts = useMemo(() => {
    const categories = { historical_event: 0, clan_memory: 0, communal_rule: 0, renovation_merit: 0, general_note: 0 };
    let pinned = 0;
    for (const story of stories) {
      categories[story.category || 'historical_event']++;
      if (story.isPinned) pinned++;
    }
    return { categories, pinned };
  }, [stories]);

  const categoryOptions: Array<{ value: JournalFilter; label: string; count: number }> = [
    { value: 'all', label: 'Tất cả', count: stories.length },
    ...Object.entries(JOURNAL_CATEGORY_META).map(([value, meta]) => ({
      value: value as JournalCategory,
      label: meta.label,
      count: counts.categories[value as JournalCategory],
    })),
  ];
  const hasFilters = Boolean(searchQuery.trim()) || activeCategory !== 'all' || selectedBranchId !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setActiveCategory('all');
    setSelectedBranchId('all');
  };

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
    <div className="min-w-0 space-y-4 pb-14 sm:space-y-6">
      <header className="rounded-2xl border border-forest-700 bg-forest-900 p-4 text-white sm:rounded-3xl sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="heritage-intro break-words text-base text-[#DBC599]">{settings.clanName || 'Gia phả Việt'}</p>
            <h2 className="heritage-display mt-1 text-3xl sm:text-4xl lg:text-5xl">Nhật ký dòng họ</h2>
            <p className="mt-2 text-sm text-[#E6DFD5]">
              {stories.length} ghi chép{counts.pinned > 0 && (' · ' + counts.pinned + ' bài ghim')}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 print:hidden lg:justify-end">
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#DBC599] px-4 text-sm font-bold text-forest-900 transition-colors hover:bg-[#E7D1A8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DBC599] sm:w-auto"
            >
              <PenTool className="size-4" aria-hidden="true" />
              Viết nhật ký mới
            </button>
            {onNavigate && (
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 px-3 text-xs text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DBC599] sm:flex-none sm:text-sm"
              >
                <Compass className="size-4 shrink-0" aria-hidden="true" />
                Tổng quan
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-white/20 px-3 text-xs text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DBC599] sm:flex-none sm:text-sm"
            >
              <Printer className="size-4 shrink-0" aria-hidden="true" />
              In nhật ký
            </button>
          </div>
        </div>
      </header>

      <section aria-label="Tìm và lọc nhật ký" className="min-w-0 space-y-3 rounded-2xl border border-[#E7DFD4] bg-[#FFFDF9] p-3 print:hidden sm:p-4">
        <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-12 sm:gap-3">
          <div className="col-span-2 sm:col-span-5">
            <label htmlFor="journal-search" className="mb-1 block text-xs font-semibold text-stone-600">Tìm trong nhật ký</label>
            <div className="relative">
              <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-500" />
              <input
                id="journal-search"
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Tiêu đề, nội dung hoặc người ghi"
                className="min-h-11 w-full rounded-xl border border-[#D5CABE] bg-[#FAF8F5] pl-9 pr-11 text-base text-[#1F1913] placeholder:text-stone-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 sm:text-sm"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label="Xóa từ khóa nhật ký"
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-stone-600 hover:text-[#1B3B2B] focus-visible:outline-2 focus-visible:outline-forest-700"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
          <label className="min-w-0 text-xs font-semibold text-stone-600 sm:hidden">
            Thể loại
            <select value={activeCategory} onChange={(event) => setActiveCategory(event.target.value as JournalFilter)} className={selectClass}>
              {categoryOptions.map(({ value, label, count }) => (
                <option key={value} value={value}>{label} ({count})</option>
              ))}
            </select>
          </label>
          <label className="min-w-0 text-xs font-semibold text-stone-600 sm:col-span-2">
            Chi họ
            <select value={selectedBranchId} onChange={(event) => setSelectedBranchId(event.target.value)} className={selectClass}>
              <option value="all">Tất cả chi họ</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
          </label>
          <label className="min-w-0 text-xs font-semibold text-stone-600 sm:col-span-3">
            Sắp xếp
            <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as SortOrder)} className={selectClass}>
              <option value="newest">Mới nhất</option>
              <option value="oldest">Cũ nhất</option>
              <option value="alphabetical">Tiêu đề A–Z</option>
            </select>
          </label>
          <div role="group" aria-label="Cách hiển thị nhật ký" className="flex h-11 min-w-0 rounded-xl border border-[#D5CABE] bg-[#FAF8F5] p-0.5 sm:col-span-2">
            {([
              { value: 'card', label: 'Xem dạng thẻ', icon: LayoutGrid },
              { value: 'reader', label: 'Đọc dạng sổ', icon: List },
            ] as const).map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                title={label}
                aria-label={label}
                aria-pressed={viewMode === value}
                onClick={() => setViewMode(value)}
                className={'grid flex-1 place-items-center rounded-lg focus-visible:outline-2 focus-visible:outline-forest-700 ' + (viewMode === value ? 'bg-forest-800 text-white' : 'text-stone-600 hover:bg-stone-100')}
              >
                <Icon className="size-4" aria-hidden="true" />
              </button>
            ))}
          </div>
        </div>
        <div role="group" aria-label="Thể loại nhật ký" className="hidden flex-wrap gap-2 sm:flex">
          {categoryOptions.map(({ value, label, count }) => (
            <button
              key={value}
              type="button"
              aria-pressed={activeCategory === value}
              onClick={() => setActiveCategory(value)}
              className={'inline-flex min-h-11 items-center gap-1.5 rounded-xl border px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 sm:text-sm ' + (activeCategory === value ? 'border-forest-700 bg-forest-800 text-white' : 'border-[#E7DFD4] bg-[#FAF8F5] text-stone-600 hover:bg-stone-100')}
            >
              {label} <span className="tabular-nums">({count})</span>
            </button>
          ))}
        </div>
      </section>

      <div className="flex min-h-8 items-center justify-between gap-2">
        <p role="status" className="text-sm text-stone-600">{sortedStories.length} ghi chép</p>
        {hasFilters && (
          <button type="button" onClick={clearFilters} className="min-h-11 shrink-0 rounded-lg px-2 text-sm font-semibold text-[#1B3B2B] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-forest-700">
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Stories / Journal Feed */}
      {sortedStories.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E7DFD4] bg-[#FFFDF9] p-6 text-center sm:p-10">
          <BookOpen className="mx-auto size-7 text-[#8C6D32]" aria-hidden="true" />
          <h3 className="mt-3 text-xl font-bold text-[#1F1913]">
            {hasFilters ? 'Không có ghi chép phù hợp' : 'Nhật ký chưa có bài viết'}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-stone-600">
            {hasFilters ? 'Thử đổi từ khóa hoặc bộ lọc để tìm ghi chép.' : 'Bắt đầu bằng một sự kiện hoặc kỷ niệm của dòng họ.'}
          </p>
          {!hasFilters && (
            <button type="button" onClick={handleOpenAdd} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest-800 px-4 text-sm font-semibold text-white hover:bg-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700">
              <PenTool className="size-4" aria-hidden="true" />
              Viết nhật ký mới
            </button>
          )}
        </div>
      ) : viewMode === 'card' ? (
        /* CARD FEED VIEW */
        <div className="grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 md:gap-5">
          {sortedStories.map((story) => {
            const isExpanded = Boolean(expandedStories[story.id]);
            const cat = (story.category as JournalCategory) || 'historical_event';
            const catMeta = JOURNAL_CATEGORY_META[cat] || JOURNAL_CATEGORY_META.historical_event;
            const branchName = story.branchId ? branchesMap.get(story.branchId) : 'Toàn dòng tộc';

            return (
              <article
                key={story.id}
                className={`flex min-w-0 flex-col justify-between rounded-2xl border bg-[#FFFDF9] p-4 shadow-xs sm:p-6 ${
                  story.isPinned
                    ? 'border-amber-200'
                    : 'border-[#E7DFD4]'
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
                  <h3 className="heritage-heading break-words text-xl text-[#1F1913] sm:text-2xl">
                    {story.title}
                  </h3>

                  {/* Location & Recorder metadata */}
                  {(story.location || story.recordedBy) && (
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-600 border-t border-[#F0EAE1] pt-2">
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
                    <div className="break-words rounded-xl border-l-2 border-gold-500 bg-[#FAF8F5] p-3 font-serif text-base italic leading-snug text-[#1F1913]">
                      &ldquo;{story.summary}&rdquo;
                    </div>
                  )}

                  {/* Body Content */}
                  <div className="heritage-body break-words whitespace-pre-line text-base text-[#1F1913] sm:text-lg">
                    {isExpanded || story.content.length <= 250
                      ? story.content
                      : `${story.content.slice(0, 250)}...`}
                  </div>

                  {/* Read More / Read Less */}
                  {story.content.length > 250 && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(story.id)}
                      aria-expanded={isExpanded}
                      className="inline-flex min-h-11 items-center gap-1 rounded-lg text-sm font-semibold text-[#1B3B2B] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-forest-700"
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
                          className="max-w-full break-all rounded-md border border-stone-200 bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Footer Actions */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#E7DFD4] pt-2 text-xs">
                  <span className="text-xs text-stone-600">
                    Cập nhật: {new Date(story.updatedAt).toLocaleDateString('vi-VN')}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(story)}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#D5CABE] bg-white px-3 font-semibold text-[#54483C] hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-[#1B3B2B]" />
                    <span>Sửa bài</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* READER NOTEBOOK VIEW */
        <div className="divide-y divide-[#E7DFD4] space-y-6 rounded-2xl border border-[#E7DFD4] bg-[#FFFDF9] px-4 py-5 sm:px-8 sm:py-7">
          {sortedStories.map((story, index) => {
            const cat = (story.category as JournalCategory) || 'historical_event';
            const catMeta = JOURNAL_CATEGORY_META[cat] || JOURNAL_CATEGORY_META.historical_event;

            return (
              <article key={story.id} className={'min-w-0 max-w-3xl break-words ' + (index > 0 ? 'pt-6' : '')}>
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

                    <h3 className="heritage-heading text-xl text-[#1F1913] sm:text-2xl">
                      {story.title}
                    </h3>

                    {(story.location || story.recordedBy) && (
                      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-stone-600">
                        {story.location && <span>Địa điểm: {story.location}</span>}
                        {story.recordedBy && <span>Người ghi: {story.recordedBy}</span>}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenEdit(story)}
                    className="inline-flex min-h-11 shrink-0 self-start items-center gap-2 rounded-xl border border-[#D5CABE] bg-white px-3 text-xs font-semibold text-[#54483C] hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Sửa</span>
                  </button>
                </div>

                {story.summary && (
                  <div className="my-3 rounded-xl border-l-2 border-gold-500 bg-[#FAF8F5] p-3 font-serif text-base italic text-[#1F1913]">
                    {story.summary}
                  </div>
                )}

                <div className="heritage-body mt-3 whitespace-pre-line text-base text-[#1F1913] sm:text-lg">
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
