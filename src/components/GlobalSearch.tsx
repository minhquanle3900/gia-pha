import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Calendar,
  Compass,
  CornerDownLeft,
  Filter,
  Flame,
  GitFork,
  Search,
  Sparkles,
  User,
  Users,
  X,
} from 'lucide-react';
import { useGenealogy } from '../context/GenealogyContext';
import { Person } from '../models/genealogy';
import { searchFamilyMembers, SearchResultItem } from '../services/searchService';
import { formatLifespan } from '../utils/dateUtils';
import { HeritageAvatar } from './HeritageAvatar';

interface GlobalSearchProps {
  onSelectPerson?: (personId: string) => void;
  onFocusInTree?: (personId: string) => void;
  className?: string;
  variant?: 'header' | 'prominent';
  placeholder?: string;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  onSelectPerson,
  onFocusInTree,
  className = '',
  variant = 'header',
  placeholder = 'Tìm tên, tên tự, năm sinh (Ctrl+K)...',
}) => {
  const { people, branches } = useGenealogy();

  const [query, setQuery] = useState('');
  const [filterMode, setFilterMode] = useState<string>('all');
  const [isOpen, setIsOpen] = useState(false);
  const [mobileModalOpen, setMobileModalOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const desktopInputRef = useRef<HTMLInputElement | null>(null);
  const mobileInputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const branchMap = useMemo(() => new Map(branches.map((b) => [b.id, b.name])), [branches]);

  // Distinct sorted generations present in family data
  const availableGenerations = useMemo(() => {
    const gens = new Set<number>();
    for (const p of people) {
      if (p.generation) gens.add(p.generation);
    }
    return Array.from(gens).sort((a, b) => a - b).slice(0, 4);
  }, [people]);

  // Raw search results calculation (supports browsing by filter chip even when query is empty)
  const rawResults = useMemo<SearchResultItem[]>(() => {
    if (!query.trim()) {
      if (filterMode === 'all') return [];
      return [...people]
        .sort((a, b) => {
          const gA = a.generation ?? 999;
          const gB = b.generation ?? 999;
          if (gA !== gB) return gA - gB;
          return a.fullName.localeCompare(b.fullName, 'vi');
        })
        .map((p) => ({
          person: p,
          matchedField: 'generation',
          matchDetail: p.clanRole || (p.generation ? `Đời thứ ${p.generation}` : undefined),
          score: 50,
          branchName: p.branchId ? branchMap.get(p.branchId) : undefined,
        }));
    }
    return searchFamilyMembers(query, people, branches);
  }, [query, filterMode, people, branches, branchMap]);

  // Apply quick filter chips (All, Living, Deceased, Gen 1..N)
  const searchResults = useMemo(() => {
    if (filterMode === 'all') return rawResults;
    if (filterMode === 'living') return rawResults.filter((r) => r.person.isLiving);
    if (filterMode === 'deceased') return rawResults.filter((r) => !r.person.isLiving);
    if (filterMode === 'anniversary') return rawResults.filter((r) => Boolean(r.person.deathAnniversaryLunar?.day));
    if (filterMode.startsWith('gen_')) {
      const g = parseInt(filterMode.replace('gen_', ''), 10);
      return rawResults.filter((r) => r.person.generation === g);
    }
    return rawResults;
  }, [rawResults, filterMode]);

  // Suggested ancestors for empty state (earliest generations & clan heads)
  const suggestedPeople = useMemo(() => {
    return [...people]
      .filter((p) => (p.generation && p.generation <= 2) || p.clanRole)
      .slice(0, 5);
  }, [people]);

  // Reset selected index when query or filter changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query, filterMode]);

  // Keep selected result visible during keyboard navigation
  useEffect(() => {
    const activeEl = listRef.current?.querySelector(`[data-search-index="${selectedIndex}"]`);
    if (activeEl instanceof HTMLElement && typeof activeEl.scrollIntoView === 'function') {
      activeEl.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  // Keyboard shortcut listener (Ctrl+K or Cmd+K) - bound to header variant to avoid duplicate triggers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (variant === 'header' && (e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        if (window.innerWidth < 640) {
          setMobileModalOpen(true);
          setTimeout(() => mobileInputRef.current?.focus(), 60);
        } else {
          setIsOpen(true);
          setTimeout(() => desktopInputRef.current?.focus(), 50);
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
        setMobileModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [variant]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Keyboard navigation within results
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setIsOpen(true);
      return;
    }

    if (searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = searchResults[selectedIndex];
      if (current) {
        handleChoosePerson(current.person.id);
      }
    }
  };

  const handleChoosePerson = (personId: string) => {
    setIsOpen(false);
    setMobileModalOpen(false);
    onSelectPerson?.(personId);
  };

  const handleJumpToTree = (e: React.MouseEvent, personId: string) => {
    e.stopPropagation();
    setIsOpen(false);
    setMobileModalOpen(false);
    onFocusInTree?.(personId);
  };

  const renderResultItem = (item: SearchResultItem, index: number) => {
    const p = item.person;
    const isSelected = index === selectedIndex;
    const lifespanText = formatLifespan(p.birthDate, p.deathDate, p.isLiving);

    return (
      <div
        key={p.id}
        data-search-index={index}
        onClick={() => handleChoosePerson(p.id)}
        onMouseEnter={() => setSelectedIndex(index)}
        className={`group flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
          isSelected
            ? 'bg-[#1B3B2B]/10 dark:bg-[#52B788]/15 border border-[#1B3B2B]/20 dark:border-[#52B788]/30 shadow-xs'
            : 'hover:bg-stone-100/80 dark:hover:bg-[#1E2E25] border border-transparent'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <HeritageAvatar
            fullName={p.fullName}
            portraitUrl={p.portraitUrl}
            gender={p.gender}
            size="sm"
            isLiving={p.isLiving}
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-serif font-bold text-xs sm:text-sm text-[#1B3B2B] dark:text-[#EDE6DC] group-hover:text-[#254F3A] dark:group-hover:text-[#52B788] transition-colors truncate">
                {p.fullName}
              </span>

              {p.generation && (
                <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-md bg-[#1B3B2B]/10 dark:bg-[#52B788]/20 text-[#1B3B2B] dark:text-[#72DCA6]">
                  Đời {p.generation}
                </span>
              )}

              {p.clanRole && (
                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded-md bg-amber-50 dark:bg-amber-900/30 text-[#8C6D32] dark:text-[#E5BE6C] border border-amber-200/50 dark:border-amber-800/40">
                  {p.clanRole}
                </span>
              )}

              {item.branchName && (
                <span className="hidden sm:inline-block text-[10px] text-stone-500 dark:text-stone-400">
                  · {item.branchName}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#6C5F51] dark:text-[#A89F93] truncate">
              <span>{lifespanText}</span>
              {item.matchDetail && (
                <span className="font-medium text-[#947432] dark:text-[#E5BE6C] bg-amber-50/70 dark:bg-[#252014] px-1.5 py-0.2 rounded text-[10px]">
                  {item.matchDetail}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0 ml-2">
          {onFocusInTree && (
            <button
              type="button"
              onClick={(e) => handleJumpToTree(e, p.id)}
              className="p-1.5 rounded-lg text-stone-400 hover:text-[#1B3B2B] dark:hover:text-[#52B788] hover:bg-white dark:hover:bg-[#16221B] transition-colors"
              title="Xem vị trí trên Cây phả hệ"
            >
              <GitFork className="w-3.5 h-3.5" />
            </button>
          )}
          <span className="text-[10px] font-medium text-stone-400 group-hover:text-[#1B3B2B] dark:group-hover:text-[#52B788] px-1.5 py-1 rounded-md hidden sm:inline-flex items-center gap-0.5">
            Xem <CornerDownLeft className="w-2.5 h-2.5 opacity-60" />
          </span>
        </div>
      </div>
    );
  };

  const renderFilterChips = () => (
    <div className="px-3 py-1.5 bg-[#FAF8F5] dark:bg-[#141E18] border-b border-[#E7DFD4] dark:border-[#2C3E33] flex items-center gap-1.5 overflow-x-auto text-[11px] no-scrollbar">
      <span className="text-[10px] text-stone-400 font-medium shrink-0 flex items-center gap-1">
        <Filter className="w-3 h-3 text-[#1B3B2B]" />
        <span>Lọc:</span>
      </span>
      <button
        type="button"
        onClick={() => setFilterMode('all')}
        className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition-colors ${
          filterMode === 'all'
            ? 'bg-[#1B3B2B] text-white font-semibold'
            : 'bg-white dark:bg-[#1F2E25] border border-stone-200 dark:border-[#2B3C31] text-stone-600 dark:text-stone-300'
        }`}
      >
        Tất cả ({people.length})
      </button>
      {availableGenerations.map((gen) => {
        const key = `gen_${gen}`;
        return (
          <button
            key={key}
            type="button"
            onClick={() => setFilterMode(key)}
            className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition-colors ${
              filterMode === key
                ? 'bg-[#1B3B2B] text-white font-semibold'
                : 'bg-white dark:bg-[#1F2E25] border border-stone-200 dark:border-[#2B3C31] text-stone-600 dark:text-stone-300'
            }`}
          >
            Đời {gen}
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => setFilterMode('living')}
        className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition-colors ${
          filterMode === 'living'
            ? 'bg-[#1B3B2B] text-white font-semibold'
            : 'bg-white dark:bg-[#1F2E25] border border-stone-200 dark:border-[#2B3C31] text-stone-600 dark:text-stone-300'
        }`}
      >
        Còn sống
      </button>
      <button
        type="button"
        onClick={() => setFilterMode('deceased')}
        className={`px-2 py-0.5 rounded-lg whitespace-nowrap transition-colors ${
          filterMode === 'deceased'
            ? 'bg-[#1B3B2B] text-white font-semibold'
            : 'bg-white dark:bg-[#1F2E25] border border-stone-200 dark:border-[#2B3C31] text-stone-600 dark:text-stone-300'
        }`}
      >
        Đã mất
      </button>
    </div>
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* 1. Header / Prominent Input on Desktop (or always if prominent) */}
      <div
        className={`relative transition-all ${
          variant === 'prominent'
            ? 'w-full'
            : 'hidden sm:block w-56 md:w-64 lg:w-80 xl:w-96 focus-within:w-full focus-within:max-w-md'
        }`}
      >
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3.5 text-stone-400 dark:text-stone-500 pointer-events-none" />
          <input
            ref={desktopInputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (!isOpen) setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onKeyDown={handleInputKeyDown}
            placeholder={placeholder}
            className={`w-full pl-9 pr-16 py-2 bg-white/95 dark:bg-[#16221B] border border-[#D5CABE] dark:border-[#2C3E33] rounded-2xl text-xs text-[#241C15] dark:text-[#EDE6DC] placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-[#1B3B2B]/20 dark:focus:ring-[#52B788]/30 focus:border-[#1B3B2B] dark:focus:border-[#52B788] shadow-2xs transition-all ${
              variant === 'prominent' ? 'py-2.5 text-sm' : ''
            }`}
            aria-label="Tìm kiếm thành viên trong dòng họ"
          />

          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                desktopInputRef.current?.focus();
              }}
              className="absolute right-2.5 p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 rounded-md transition-colors"
              title="Xóa tìm kiếm"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="absolute right-2.5 pointer-events-none hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] font-semibold text-stone-400 dark:text-stone-500 bg-stone-100 dark:bg-[#1F2E25] border border-stone-200 dark:border-[#2B3C31] rounded-md">
              ⌘K
            </kbd>
          )}
        </div>

        {/* Dropdown Results */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-2 min-w-[340px] sm:min-w-[420px] md:min-w-[480px] bg-[#FFFDF9] dark:bg-[#17231B] border border-[#E7DFD4] dark:border-[#2C3E33] rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
            {/* Search Header / Count */}
            <div className="p-3 bg-[#FAF8F5] dark:bg-[#141E18] border-b border-[#E7DFD4] dark:border-[#2C3E33] flex items-center justify-between text-xs">
              <span className="font-semibold text-[#1B3B2B] dark:text-[#EDE6DC] flex items-center gap-1.5">
                <Search className="w-3.5 h-3.5 text-[#947432] dark:text-[#E5BE6C]" />
                {query.trim()
                  ? `Kết quả tìm kiếm (${searchResults.length})`
                  : `Tra cứu phả hệ toàn gia tộc (${people.length} thành viên)`}
              </span>
              <span className="text-[10px] text-stone-400 dark:text-stone-500">
                Tìm theo tên, tên tự, tên húy, năm sinh
              </span>
            </div>

            {/* Quick Filter Chips */}
            {renderFilterChips()}

            {/* Results List */}
            <div ref={listRef} className="max-h-[380px] overflow-y-auto p-2 space-y-1">
              {query.trim() || filterMode !== 'all' ? (
                searchResults.length > 0 ? (
                  searchResults.map((item, idx) => renderResultItem(item, idx))
                ) : (
                  <div className="py-8 px-4 text-center space-y-2">
                    <User className="w-8 h-8 mx-auto text-stone-300 dark:text-stone-600" />
                    <p className="text-xs font-semibold text-[#241C15] dark:text-[#EDE6DC]">
                      Không tìm thấy thành viên khớp với từ khóa
                    </p>
                    <p className="text-[11px] text-[#6C5F51] dark:text-[#A89F93] max-w-xs mx-auto">
                      Hãy thử tìm theo tên không dấu (vd: &quot;tran van&quot;), tên tự, biệt danh hoặc năm sinh (vd: &quot;1954&quot;).
                    </p>
                  </div>
                )
              ) : (
                <div className="p-2 space-y-2">
                  <div className="flex items-center justify-between text-[11px] text-stone-400 font-medium px-1">
                    <span>Thành viên tiền bối tiêu biểu:</span>
                    <span>{people.length} thành viên trong cơ sở dữ liệu</span>
                  </div>
                  {suggestedPeople.map((p, idx) =>
                    renderResultItem(
                      {
                        person: p,
                        matchedField: 'generation',
                        matchDetail: p.clanRole || `Đời thứ ${p.generation}`,
                        score: 50,
                      },
                      idx
                    )
                  )}
                </div>
              )}
            </div>

            {/* Footer with hints */}
            <div className="p-2 px-3 bg-[#FAF8F5]/80 dark:bg-[#141E18]/80 border-t border-[#E7DFD4] dark:border-[#2C3E33] flex items-center justify-between text-[10px] text-stone-400 dark:text-stone-500">
              <div className="flex items-center gap-2">
                <span>↑↓ Di chuyển</span>
                <span>·</span>
                <span>↵ Xem hồ sơ</span>
                <span>·</span>
                <span>Esc Đóng</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="hover:text-stone-700 dark:hover:text-stone-300"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Mobile Trigger Button (only when variant === 'header' on screens < sm) */}
      {variant === 'header' && (
        <div className="sm:hidden">
          <button
            type="button"
            onClick={() => {
              setMobileModalOpen(true);
              setTimeout(() => {
                mobileInputRef.current?.focus();
              }, 100);
            }}
            className="flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-[#D5CABE] text-[#1B3B2B] hover:bg-stone-50 shadow-xs transition-colors"
            title="Tìm kiếm nhanh thành viên"
            aria-label="Mở tìm kiếm thành viên"
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 3. Mobile Full-Screen / Modal Search Overlay */}
      {mobileModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col p-3 animate-in fade-in">
          <div className="bg-[#FFFDF9] dark:bg-[#17231B] rounded-2xl border border-[#E7DFD4] dark:border-[#2C3E33] flex flex-col max-h-[90vh] shadow-2xl overflow-hidden mt-4">
            {/* Mobile Input Bar */}
            <div className="p-3 border-b border-[#E7DFD4] dark:border-[#2C3E33] flex items-center gap-2">
              <Search className="w-4 h-4 text-stone-400 dark:text-stone-500 shrink-0" />
              <input
                ref={mobileInputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleInputKeyDown}
                placeholder="Tìm tên, tên tự, năm sinh, đời thứ..."
                className="flex-1 bg-transparent text-xs text-[#241C15] dark:text-[#EDE6DC] placeholder-stone-400 outline-none"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    mobileInputRef.current?.focus();
                  }}
                  className="p-1 text-stone-400 hover:text-stone-600 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setMobileModalOpen(false)}
                className="px-2 py-1 text-xs font-semibold text-[#1B3B2B] dark:text-[#52B788]"
              >
                Đóng
              </button>
            </div>

            {/* Mobile Quick Filter Chips */}
            {renderFilterChips()}

            {/* Mobile Results Scrollview */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {query.trim() || filterMode !== 'all' ? (
                searchResults.length > 0 ? (
                  searchResults.map((item, idx) => renderResultItem(item, idx))
                ) : (
                  <div className="py-8 text-center space-y-2">
                    <User className="w-8 h-8 mx-auto text-stone-300" />
                    <p className="text-xs font-semibold text-[#241C15] dark:text-[#EDE6DC]">
                      Không tìm thấy thành viên
                    </p>
                    <p className="text-[11px] text-[#6C5F51] dark:text-[#A89F93]">
                      Thử tìm theo họ tên không dấu, tên tự hoặc năm sinh.
                    </p>
                  </div>
                )
              ) : (
                <div className="p-1 space-y-1">
                  <p className="text-[10px] text-stone-400 px-1 py-1">Tiền bối tiêu biểu:</p>
                  {suggestedPeople.map((p, idx) =>
                    renderResultItem(
                      {
                        person: p,
                        matchedField: 'generation',
                        matchDetail: p.clanRole || `Đời thứ ${p.generation}`,
                        score: 50,
                      },
                      idx
                    )
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
