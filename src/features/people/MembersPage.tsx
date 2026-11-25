import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Filter,
  GitFork,
  GitMerge,
  Grid,
  List,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { HeritageAvatar } from '../../components/HeritageAvatar';
import { useGenealogy } from '../../context/GenealogyContext';
import { Gender, Person } from '../../models/genealogy';
import { formatLifespan, normalizeVietnameseText } from '../../utils/dateUtils';
import { PersonReportModal } from './PersonReportModal';

interface MembersPageProps {
  onSelectPerson: (personId: string) => void;
  onFocusInTree: (personId: string) => void;
  onAddPerson: () => void;
  onOpenDuplicateMerge?: () => void;
}

export const MembersPage: React.FC<MembersPageProps> = ({
  onSelectPerson,
  onFocusInTree,
  onAddPerson,
  onOpenDuplicateMerge,
}) => {
  const { people, branches } = useGenealogy();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedSubBranch, setSelectedSubBranch] = useState<string>('all');
  const [selectedGeneration, setSelectedGeneration] = useState<string>('all');
  const [selectedLiving, setSelectedLiving] = useState<string>('all');
  const [selectedGender, setSelectedGender] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'generation' | 'name' | 'birthYear'>('generation');
  const [viewStyle, setViewStyle] = useState<'grid' | 'table'>('grid');
  const [reportingPersonId, setReportingPersonId] = useState<string | null>(null);

  // Lookup maps
  const branchesMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of branches) map.set(b.id, b.name);
    return map;
  }, [branches]);

  // Unique generations present with counts
  const generationStats = useMemo(() => {
    const counts = new Map<number, number>();
    for (const p of people) {
      if (p.generation) {
        counts.set(p.generation, (counts.get(p.generation) ?? 0) + 1);
      }
    }
    const list = Array.from(counts.keys()).sort((a, b) => a - b);
    return list.map((gen) => ({
      generation: gen,
      count: counts.get(gen) || 0,
    }));
  }, [people]);

  // Unique sub-branches under the selected branch or all
  const availableSubBranches = useMemo(() => {
    const set = new Set<string>();
    for (const p of people) {
      if (selectedBranch !== 'all' && p.branchId !== selectedBranch) continue;
      if (p.subBranch && p.subBranch.trim()) {
        set.add(p.subBranch.trim());
      }
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [people, selectedBranch]);

  // Counts by branch
  const branchCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of people) {
      if (p.branchId) {
        counts.set(p.branchId, (counts.get(p.branchId) ?? 0) + 1);
      }
      if (p.secondaryBranchIds) {
        for (const sec of p.secondaryBranchIds) {
          counts.set(sec, (counts.get(sec) ?? 0) + 1);
        }
      }
    }
    return counts;
  }, [people]);

  // Counts by living status
  const livingCounts = useMemo(() => {
    const living = people.filter((p) => p.isLiving).length;
    const deceased = people.length - living;
    const hasLunar = people.filter((p) => !p.isLiving && p.deathAnniversaryLunar?.day).length;
    return { living, deceased, hasLunar };
  }, [people]);

  // Counts by gender
  const genderCounts = useMemo(() => {
    let male = 0;
    let female = 0;
    let unknown = 0;
    for (const p of people) {
      if (p.gender === 'male') male++;
      else if (p.gender === 'female') female++;
      else unknown++;
    }
    return { male, female, unknown };
  }, [people]);

  // Reset all filters helper
  const handleResetFilters = () => {
    setSelectedBranch('all');
    setSelectedSubBranch('all');
    setSelectedGeneration('all');
    setSelectedLiving('all');
    setSelectedGender('all');
    setSearchQuery('');
  };

  const hasActiveFilters =
    selectedBranch !== 'all' ||
    selectedSubBranch !== 'all' ||
    selectedGeneration !== 'all' ||
    selectedLiving !== 'all' ||
    selectedGender !== 'all' ||
    searchQuery.trim().length > 0;

  // Filtered and sorted people
  const filteredPeople = useMemo(() => {
    const rawQuery = searchQuery.trim();
    const normalizedQuery = rawQuery ? normalizeVietnameseText(rawQuery) : '';

    return people
      .filter((p) => {
        // 1. Family Branch filter (Chi họ)
        if (selectedBranch !== 'all') {
          const inPrimary = p.branchId === selectedBranch;
          const inSecondary = p.secondaryBranchIds?.includes(selectedBranch);
          if (!inPrimary && !inSecondary) return false;
        }

        // 2. Sub-branch filter (Phái)
        if (selectedSubBranch !== 'all') {
          if (p.subBranch?.trim() !== selectedSubBranch) return false;
        }

        // 3. Generation filter (Đời thứ)
        if (selectedGeneration !== 'all') {
          if (p.generation !== Number(selectedGeneration)) return false;
        }

        // 4. Living status filter (Trạng thái hiện tiền)
        if (selectedLiving === 'living' && !p.isLiving) return false;
        if (selectedLiving === 'deceased' && p.isLiving) return false;
        if (selectedLiving === 'hasLunar') {
          if (p.isLiving || !p.deathAnniversaryLunar?.day) return false;
        }

        // 5. Gender filter (Giới tính)
        if (selectedGender !== 'all' && p.gender !== selectedGender) return false;

        // 6. Intelligent Vietnamese genealogy text search
        if (normalizedQuery) {
          const branchName = p.branchId ? branchesMap.get(p.branchId) || '' : '';
          const targets = [
            p.fullName,
            p.commonName,
            p.tabooName,
            p.courtesyName,
            p.alias,
            p.clanRole,
            p.occupation,
            p.ancestralHome,
            p.residence,
            p.birthPlace,
            p.deathPlace,
            p.burialPlace,
            p.merits,
            p.subBranch,
            branchName,
            p.generation ? `đời ${p.generation}` : '',
            p.generation ? `đời thứ ${p.generation}` : '',
            p.generation ? `thế hệ ${p.generation}` : '',
          ];

          // Check if any field contains normalized query string
          const matched = targets.some((val) => {
            if (!val) return false;
            return normalizeVietnameseText(val).includes(normalizedQuery);
          });

          if (!matched) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'generation') {
          const genA = a.generation ?? 999;
          const genB = b.generation ?? 999;
          if (genA !== genB) return genA - genB;
          return (a.birthDate?.year ?? 9999) - (b.birthDate?.year ?? 9999);
        }
        if (sortBy === 'name') {
          // Sort by last word (Tên) in Vietnamese naming convention
          const nameWordsA = a.fullName.trim().split(/\s+/);
          const nameWordsB = b.fullName.trim().split(/\s+/);
          const firstA = nameWordsA[nameWordsA.length - 1];
          const firstB = nameWordsB[nameWordsB.length - 1];
          return firstA.localeCompare(firstB, 'vi');
        }
        if (sortBy === 'birthYear') {
          return (a.birthDate?.year ?? 9999) - (b.birthDate?.year ?? 9999);
        }
        return 0;
      });
  }, [
    people,
    selectedBranch,
    selectedSubBranch,
    selectedGeneration,
    selectedLiving,
    selectedGender,
    searchQuery,
    sortBy,
    branchesMap,
  ]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      {/* Top Banner & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7DFD4] pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1B3B2B] tracking-tight">
            Danh Sách Thành Viên Gia Tộc
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Tổng số: <strong className="text-[#1B3B2B]">{people.length}</strong> thành viên • Đang
            hiển thị: <strong className="text-[#1B3B2B]">{filteredPeople.length}</strong> người
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onOpenDuplicateMerge && (
            <button
              type="button"
              onClick={onOpenDuplicateMerge}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#D5CABE] text-[#1B3B2B] hover:bg-stone-50 text-xs font-semibold shadow-xs transition-colors"
              title="Quét và xử lý các hồ sơ trùng lặp trong gia phả"
            >
              <GitMerge className="w-3.5 h-3.5 text-amber-700" />
              <span>Lọc trùng lặp</span>
            </button>
          )}

          <button
            type="button"
            onClick={onAddPerson}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1B3B2B] hover:bg-[#28503C] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm thành viên</span>
          </button>
        </div>
      </div>

      {/* Generation Quick Selector Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
        <span className="text-[11px] font-semibold uppercase text-stone-400 whitespace-nowrap mr-1">
          Đời thứ:
        </span>
        <button
          type="button"
          onClick={() => setSelectedGeneration('all')}
          className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
            selectedGeneration === 'all'
              ? 'bg-[#1B3B2B] text-white shadow-xs'
              : 'bg-white border border-[#E7DFD4] text-[#54483C] hover:bg-stone-100'
          }`}
        >
          Tất cả ({people.length})
        </button>
        {generationStats.map(({ generation, count }) => (
          <button
            key={generation}
            type="button"
            onClick={() => setSelectedGeneration(String(generation))}
            className={`px-3 py-1 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
              selectedGeneration === String(generation)
                ? 'bg-[#1B3B2B] text-white shadow-xs'
                : 'bg-white border border-[#E7DFD4] text-[#54483C] hover:bg-stone-100'
            }`}
          >
            Đời {generation} ({count})
          </button>
        ))}
      </div>

      {/* Filter and Search Box */}
      <div className="p-4 rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-xs space-y-3.5">
        {/* Row 1: Search & View Toggle & Sort */}
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên, tên húy, bí danh, quê quán, nơi an táng, vai vế (không dấu hoặc có dấu)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs rounded-xl border border-[#D5CABE] bg-[#FAF8F5] pl-9 pr-8 py-2 text-[#2C241C] outline-none focus:border-[#1B3B2B] focus:bg-white transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-stone-400 hover:text-stone-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* View Style Switcher */}
            <div className="flex rounded-xl border border-[#D5CABE] bg-[#FAF8F5] p-0.5">
              <button
                type="button"
                onClick={() => setViewStyle('grid')}
                className={`p-1.5 rounded-lg ${
                  viewStyle === 'grid' ? 'bg-white shadow-xs text-[#1B3B2B]' : 'text-stone-500'
                }`}
                title="Dạng lưới thẻ"
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewStyle('table')}
                className={`p-1.5 rounded-lg ${
                  viewStyle === 'table' ? 'bg-white shadow-xs text-[#1B3B2B]' : 'text-stone-500'
                }`}
                title="Dạng danh sách bảng"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'generation' | 'name' | 'birthYear')}
              className="text-xs rounded-xl border border-[#D5CABE] bg-[#FAF8F5] px-3 py-2 text-[#2C241C] outline-none focus:border-[#1B3B2B]"
            >
              <option value="generation">Sắp xếp: Theo đời thứ</option>
              <option value="name">Sắp xếp: Tên A-Z (Chữ cái)</option>
              <option value="birthYear">Sắp xếp: Năm sinh tăng dần</option>
            </select>
          </div>
        </div>

        {/* Row 2: Category Filter Selectors */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-stone-100">
          {/* 1. Family Branch (Chi họ) */}
          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-1">Chi họ</label>
            <select
              value={selectedBranch}
              onChange={(e) => {
                setSelectedBranch(e.target.value);
                setSelectedSubBranch('all');
              }}
              className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-2.5 py-1.5 text-[#2C241C] outline-none focus:border-[#1B3B2B]"
            >
              <option value="all">Mọi chi họ ({people.length})</option>
              {branches.map((b) => {
                const count = branchCounts.get(b.id) || 0;
                return (
                  <option key={b.id} value={b.id}>
                    {b.name} ({count})
                  </option>
                );
              })}
            </select>
          </div>

          {/* 2. Generation (Đời thứ) */}
          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-1">Đời thứ</label>
            <select
              value={selectedGeneration}
              onChange={(e) => setSelectedGeneration(e.target.value)}
              className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-2.5 py-1.5 text-[#2C241C] outline-none focus:border-[#1B3B2B]"
            >
              <option value="all">Mọi thế hệ ({people.length})</option>
              {generationStats.map(({ generation, count }) => (
                <option key={generation} value={String(generation)}>
                  Đời thứ {generation} ({count})
                </option>
              ))}
            </select>
          </div>

          {/* 3. Living Status (Trạng thái) */}
          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-1">
              Trạng thái sinh thời
            </label>
            <select
              value={selectedLiving}
              onChange={(e) => setSelectedLiving(e.target.value)}
              className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-2.5 py-1.5 text-[#2C241C] outline-none focus:border-[#1B3B2B]"
            >
              <option value="all">Tất cả ({people.length})</option>
              <option value="living">Hiện tiền (Còn sống) ({livingCounts.living})</option>
              <option value="deceased">Đã tạ thế ({livingCounts.deceased})</option>
              <option value="hasLunar">Có ngày giỗ Âm lịch ({livingCounts.hasLunar})</option>
            </select>
          </div>

          {/* 4. Gender (Giới tính) */}
          <div>
            <label className="block text-[11px] font-semibold text-stone-500 mb-1">Giới tính</label>
            <select
              value={selectedGender}
              onChange={(e) => setSelectedGender(e.target.value)}
              className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-2.5 py-1.5 text-[#2C241C] outline-none focus:border-[#1B3B2B]"
            >
              <option value="all">Tất cả giới tính ({people.length})</option>
              <option value="male">Nam giới ({genderCounts.male})</option>
              <option value="female">Nữ giới ({genderCounts.female})</option>
              {genderCounts.unknown > 0 && (
                <option value="unknown">Chưa rõ ({genderCounts.unknown})</option>
              )}
            </select>
          </div>
        </div>

        {/* Optional Sub-branch (Phái) selector if branch has sub-branches */}
        {availableSubBranches.length > 0 && (
          <div className="flex items-center gap-1.5 pt-1 overflow-x-auto text-xs">
            <span className="text-[11px] text-stone-500 shrink-0">Phái trực thuộc:</span>
            <button
              type="button"
              onClick={() => setSelectedSubBranch('all')}
              className={`px-2 py-0.5 rounded-lg text-[11px] transition-colors ${
                selectedSubBranch === 'all'
                  ? 'bg-[#1B3B2B] text-white font-semibold'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              Tất cả phái
            </button>
            {availableSubBranches.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => setSelectedSubBranch(sub)}
                className={`px-2 py-0.5 rounded-lg text-[11px] whitespace-nowrap transition-colors ${
                  selectedSubBranch === sub
                    ? 'bg-[#1B3B2B] text-white font-semibold'
                    : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        {/* Row 3: Active Filter Tags (Zero-Pill Discipline) */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-stone-100">
            <span className="text-[11px] text-stone-500 font-medium">Bộ lọc đang áp dụng:</span>

            {selectedBranch !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs bg-[#FAF7F2] border border-[#D5CABE] text-[#1B3B2B] font-semibold">
                <span>Chi họ: {branchesMap.get(selectedBranch) || selectedBranch}</span>
                <button
                  type="button"
                  onClick={() => setSelectedBranch('all')}
                  className="hover:text-red-700 cursor-pointer p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedSubBranch !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs bg-[#FAF7F2] border border-[#D5CABE] text-[#54483C] font-semibold">
                <span>Phái: {selectedSubBranch}</span>
                <button
                  type="button"
                  onClick={() => setSelectedSubBranch('all')}
                  className="hover:text-red-700 cursor-pointer p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedGeneration !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs bg-[#FAF7F2] border border-[#D5CABE] text-[#1B3B2B] font-semibold">
                <span>Đời thứ: {selectedGeneration}</span>
                <button
                  type="button"
                  onClick={() => setSelectedGeneration('all')}
                  className="hover:text-red-700 cursor-pointer p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedLiving !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs bg-[#FAF7F2] border border-[#D5CABE] text-[#8C6D32] font-semibold">
                <span>
                  {selectedLiving === 'living'
                    ? 'Còn sống'
                    : selectedLiving === 'deceased'
                    ? 'Đã tạ thế'
                    : 'Có giỗ Âm lịch'}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedLiving('all')}
                  className="hover:text-red-700 cursor-pointer p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {selectedGender !== 'all' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs bg-[#FAF7F2] border border-[#D5CABE] text-[#28503C] font-semibold">
                <span>{selectedGender === 'male' ? 'Nam giới' : selectedGender === 'female' ? 'Nữ giới' : 'Chưa rõ'}</span>
                <button
                  type="button"
                  onClick={() => setSelectedGender('all')}
                  className="hover:text-red-700 cursor-pointer p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {searchQuery.trim() && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs bg-[#FAF7F2] border border-[#D5CABE] text-[#1F1913] font-semibold">
                <span>Tìm: "{searchQuery.trim()}"</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="hover:text-red-700 cursor-pointer p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 text-xs text-red-700 hover:text-red-900 font-semibold ml-auto cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Xóa bộ lọc</span>
            </button>
          </div>
        )}
      </div>

      {/* People Results Display */}
      {filteredPeople.length === 0 ? (
        <div className="p-12 text-center bg-[#FFFDF9] rounded-2xl border border-[#E7DFD4] space-y-3">
          <Users className="w-10 h-10 text-stone-300 mx-auto" />
          <p className="text-sm font-serif font-bold text-stone-700">
            Không tìm thấy thành viên nào phù hợp với bộ lọc
          </p>
          <p className="text-xs text-stone-500">
            Hãy thử xóa bớt tiêu chí lọc hoặc thay đổi từ khóa tìm kiếm.
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="px-4 py-2 rounded-xl bg-[#1B3B2B] text-white text-xs font-semibold hover:bg-[#28503C] transition-colors"
            >
              Xóa toàn bộ bộ lọc
            </button>
          )}
        </div>
      ) : viewStyle === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPeople.map((p) => {
            const branchName = p.branchId ? branchesMap.get(p.branchId) : undefined;
            return (
              <div
                key={p.id}
                onClick={() => onSelectPerson(p.id)}
                className="group relative rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] p-4 shadow-xs hover:shadow-md hover:border-[#1B3B2B]/40 cursor-pointer transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <HeritageAvatar
                      fullName={p.fullName}
                      portraitUrl={p.portraitUrl}
                      gender={p.gender}
                      size="md"
                      isLiving={p.isLiving}
                    />

                    <div className="flex items-center gap-1.5">
                      {p.generation && (
                        <span className="text-xs font-bold text-[#1B3B2B] bg-[#1B3B2B]/8 px-2 py-0.5 rounded-md">
                          Đời {p.generation}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setReportingPersonId(p.id);
                        }}
                        className="p-1 text-stone-400 hover:text-[#8C6D32] hover:bg-stone-100 rounded-lg transition-colors"
                        title="Xuất bản in & PDF hồ sơ cá nhân"
                      >
                        <Printer className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onFocusInTree(p.id);
                        }}
                        className="p-1 text-stone-400 hover:text-[#1B3B2B] hover:bg-stone-100 rounded-lg transition-colors"
                        title="Xem vị trí trên cây gia phả"
                      >
                        <GitFork className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-serif font-bold text-[#1F1913] group-hover:text-[#1B3B2B] transition-colors truncate">
                    {p.fullName}
                  </h3>

                  <p className="text-xs text-[#695E52] mt-0.5">
                    {formatLifespan(p.birthDate, p.deathDate, p.isLiving)}
                  </p>

                  {p.clanRole && (
                    <p className="text-[11px] text-[#8C6D32] font-semibold mt-1 truncate">
                      {p.clanRole}
                    </p>
                  )}

                  {(p.commonName || p.tabooName) && (
                    <p className="text-[10px] text-stone-400 truncate mt-0.5">
                      {p.commonName && <span>Thường gọi: {p.commonName} </span>}
                      {p.tabooName && <span>• Húy: {p.tabooName}</span>}
                    </p>
                  )}
                </div>

                <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-400">
                  <span className="truncate max-w-[150px]">{branchName || 'Đại gia đình'}</span>
                  <span>{p.isLiving ? 'Còn sống' : 'Đã tạ thế'}</span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#3C3228]">
              <thead className="bg-[#FAF7F2] text-stone-600 font-semibold border-b border-[#E7DFD4]">
                <tr>
                  <th className="py-3 px-4">Thành viên</th>
                  <th className="py-3 px-3">Đời thứ</th>
                  <th className="py-3 px-3">Chi họ & Phái</th>
                  <th className="py-3 px-3">Sinh thời</th>
                  <th className="py-3 px-3">Vai vế</th>
                  <th className="py-3 px-3">Trạng thái</th>
                  <th className="py-3 px-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredPeople.map((p) => {
                  const branchName = p.branchId ? branchesMap.get(p.branchId) : '—';
                  return (
                    <tr
                      key={p.id}
                      onClick={() => onSelectPerson(p.id)}
                      className="hover:bg-stone-50/80 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <HeritageAvatar
                            fullName={p.fullName}
                            portraitUrl={p.portraitUrl}
                            gender={p.gender}
                            size="xs"
                            isLiving={p.isLiving}
                          />
                          <div>
                            <p className="font-serif font-bold text-[#1F1913] hover:text-[#1B3B2B]">
                              {p.fullName}
                            </p>
                            {p.commonName && (
                              <p className="text-[10px] text-stone-400">({p.commonName})</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#1B3B2B]">
                        {p.generation ? `Đời ${p.generation}` : '—'}
                      </td>
                      <td className="py-2.5 px-3 text-stone-600">
                        <span>{branchName}</span>
                        {p.subBranch && (
                          <span className="text-[10px] text-stone-400 block">{p.subBranch}</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-stone-600">
                        {formatLifespan(p.birthDate, p.deathDate, p.isLiving)}
                      </td>
                      <td className="py-2.5 px-3 text-[#8C6D32] font-medium">{p.clanRole || '—'}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            p.isLiving
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-stone-100 text-stone-700'
                          }`}
                        >
                          {p.isLiving ? 'Còn sống' : 'Đã tạ thế'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setReportingPersonId(p.id);
                            }}
                            className="p-1 text-stone-400 hover:text-[#8C6D32] hover:bg-stone-100 rounded-lg transition-colors"
                            title="Xuất bản in & PDF hồ sơ cá nhân"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onFocusInTree(p.id);
                            }}
                            className="p-1 text-stone-400 hover:text-[#1B3B2B] rounded-lg"
                            title="Xem trên cây"
                          >
                            <GitFork className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Person Report Modal */}
      <PersonReportModal
        personId={reportingPersonId}
        open={Boolean(reportingPersonId)}
        onClose={() => setReportingPersonId(null)}
        onSelectPerson={(id) => {
          setReportingPersonId(null);
          onSelectPerson(id);
        }}
      />
    </div>
  );
};
