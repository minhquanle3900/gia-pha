import React, { useMemo } from 'react';
import {
  BarChart3,
  BookOpen,
  Compass,
  GitFork,
  Image as ImageIcon,
  MapPin,
  Plus,
  Scroll,
  Search,
  Sparkles,
  Users,
} from 'lucide-react';
import { GlobalSearch } from '../components/GlobalSearch';
import { HeritageAvatar } from '../components/HeritageAvatar';
import { useGenealogy } from '../context/GenealogyContext';
import { BackupReminderBanner } from '../features/backup/BackupReminderBanner';
import { UpcomingAnniversariesWidget } from '../features/rites/UpcomingAnniversariesWidget';
import { NavigationTab, Person } from '../models/genealogy';
import { formatLifespan } from '../utils/dateUtils';

interface DashboardPageProps {
  onNavigate: (tab: NavigationTab) => void;
  onSelectPerson: (personId: string) => void;
  onFocusInTree?: (personId: string) => void;
  onAddPerson: () => void;
  onOpenTour?: () => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onSelectPerson,
  onFocusInTree,
  onAddPerson,
  onOpenTour,
}) => {
  const { people, branches, media, stories, settings } = useGenealogy();

  // Statistics
  const livingCount = useMemo(() => people.filter((p) => p.isLiving).length, [people]);
  const deceasedCount = people.length - livingCount;

  const maxGeneration = useMemo(() => {
    let max = 1;
    for (const p of people) {
      if (p.generation && p.generation > max) max = p.generation;
    }
    return max;
  }, [people]);

  // Root person or recent elders
  const elders = useMemo(() => {
    return [...people]
      .filter((p) => p.generation !== undefined)
      .sort((a, b) => (a.generation ?? 99) - (b.generation ?? 99))
      .slice(0, 5);
  }, [people]);

  return (
    <div className="space-y-6 sm:space-y-8 pb-12 animate-in fade-in">
      {/* Hero Heritage Banner */}
      <div className="relative rounded-3xl bg-linear-to-br from-[#1B3B2B] via-[#234A36] to-[#142D20] text-white p-6 sm:p-8 shadow-md overflow-hidden border border-[#2B4B3A]">
        <div className="relative z-10 max-w-2xl space-y-3.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#DBC599] tracking-widest uppercase">
            <span>Cội Nguồn Gia Tộc</span>
            <span aria-hidden="true" className="text-[#DBC599]/40">·</span>
            <span className="text-[#E6DFD5] font-normal normal-case">Lưu giữ qua {maxGeneration} thế hệ phả hệ</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-serif font-bold text-[#FFFDF9] tracking-tight leading-snug text-balance">
            {settings.clanName || 'Dòng Họ Việt Nam'}
          </h2>

          <p className="text-xs sm:text-sm text-[#E6DFD5] italic font-serif leading-relaxed max-w-xl">
            "{settings.clanMotto || 'Cây có cội mới trổ cành xanh lá, nước có nguồn mới bủa khắp rạch sông.'}"
          </p>

          {settings.ancestralHallLocation && (
            <div className="flex items-center gap-1.5 text-xs text-[#D1C6B6] pt-0.5">
              <MapPin className="w-3.5 h-3.5 text-[#DBC599] shrink-0" />
              <span>Từ đường: {settings.ancestralHallLocation}</span>
            </div>
          )}

          {/* Quick Action Buttons - Refined Hierarchy */}
          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => onNavigate('tree')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#DBC599] hover:bg-[#CBB284] text-[#1B3B2B] font-bold text-xs shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <GitFork className="w-4 h-4" />
              <span>Khám phá Cây gia phả</span>
            </button>
            <button
              type="button"
              onClick={onAddPerson}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white font-medium text-xs border border-white/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm thành viên</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('journal')}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#EBD9B2] font-medium text-xs border border-white/15 transition-colors"
              title="Ghi chép sự kiện lịch sử chung và kỷ niệm dòng họ"
            >
              <Scroll className="w-4 h-4 text-[#DBC599]" />
              <span>Nhật ký dòng họ</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigate('stats')}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#EBD9B2] font-medium text-xs border border-white/15 transition-colors"
              title="Xem biểu đồ thế hệ và tỷ lệ nam/nữ trong dòng họ"
            >
              <BarChart3 className="w-4 h-4 text-[#DBC599]" />
              <span>Dashboard Thống kê</span>
            </button>
            {onOpenTour && (
              <button
                type="button"
                onClick={onOpenTour}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-[#EBD9B2] font-medium text-xs border border-white/15 transition-colors"
                title="Khám phá các tính năng chính của ứng dụng"
              >
                <Compass className="w-4 h-4 text-[#DBC599]" />
                <span>Hướng dẫn</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Prominent Quick Search Strip on Dashboard */}
      <div className="rounded-3xl bg-[#FFFDF9] border border-[#E7DFD4] p-4 sm:p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F0EAE1] pb-2.5">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-xl bg-[#1B3B2B]/10 text-[#1B3B2B]">
              <Search className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-serif font-bold text-[#1F1913]">
                Tra Cứu Nhanh Thành Viên Toàn Gia Phả
              </h3>
              <p className="text-[11px] text-[#6E5F50]">
                Tìm kiếm trực tiếp theo họ tên, tên tự, tên húy, năm sinh hoặc đời thứ
              </p>
            </div>
          </div>
          <span className="text-xs font-medium text-[#6E5F50] self-start sm:self-auto tabular-nums">
            {people.length} thành viên trong dữ liệu
          </span>
        </div>

        <GlobalSearch
          variant="prominent"
          onSelectPerson={onSelectPerson}
          onFocusInTree={(id) => {
            if (onFocusInTree) {
              onFocusInTree(id);
            } else {
              onNavigate('tree');
            }
          }}
          placeholder="Nhập tên thành viên (ví dụ: Trần Văn, Khang, Bá Thông, 1954, đời 2)..."
        />
      </div>

      {/* Persistent Backup Reminder Banner (monitors >30 days export interval) */}
      <BackupReminderBanner onNavigate={onNavigate} />

      {/* Upcoming Anniversaries Widget (Within 30 days death anniversary reminders) */}
      <UpcomingAnniversariesWidget onSelectPerson={onSelectPerson} onNavigate={onNavigate} />

      {/* 4 Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div
          onClick={() => onNavigate('members')}
          className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-xs hover:border-[#1B3B2B]/40 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Thành viên
            </span>
            <Users className="w-4 h-4 text-[#1B3B2B] group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-serif font-bold text-[#1F1913]">
              {people.length}
            </span>
            <span className="text-[11px] text-stone-500">người</span>
          </div>
          <p className="text-[10px] text-stone-400 mt-1">
            {livingCount} còn sống • {deceasedCount} đã mất
          </p>
        </div>

        <div
          onClick={() => onNavigate('stats')}
          className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-xs hover:border-[#1B3B2B]/40 hover:shadow-md transition-all cursor-pointer group"
          title="Bấm để mở trang Thống kê phả hệ chi tiết"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Thế hệ phả hệ
            </span>
            <BarChart3 className="w-4 h-4 text-[#C19B4C] group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-serif font-bold text-[#1F1913]">
              {maxGeneration}
            </span>
            <span className="text-[11px] text-stone-500">đời</span>
          </div>
          <p className="text-[10px] text-stone-400 mt-1 flex items-center justify-between">
            <span>Từ đời Thủy tổ đến nay</span>
            <span className="text-[#1B3B2B] font-medium group-hover:underline">Xem biểu đồ →</span>
          </p>
        </div>

        <div
          onClick={() => onNavigate('members')}
          className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-xs hover:border-[#1B3B2B]/40 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Chi họ / Nhánh
            </span>
            <Sparkles className="w-4 h-4 text-[#8C3A27] group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-serif font-bold text-[#1F1913]">
              {branches.length}
            </span>
            <span className="text-[11px] text-stone-500">chi họ</span>
          </div>
          <p className="text-[10px] text-stone-400 mt-1">Bao gồm Đại Tôn và các Chi</p>
        </div>

        <div
          onClick={() => onNavigate('gallery')}
          className="p-4 sm:p-5 rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-xs hover:border-[#1B3B2B]/40 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
              Kho kỷ vật
            </span>
            <ImageIcon className="w-4 h-4 text-[#2D5A43] group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-serif font-bold text-[#1F1913]">
              {media.length}
            </span>
            <span className="text-[11px] text-stone-500">tư liệu</span>
          </div>
          <p className="text-[10px] text-stone-400 mt-1">Ảnh lịch sử, sắc phong, gia phả</p>
        </div>
      </div>

      {/* 2-Column Section: Ký ức gia tộc & Các bậc trưởng bối */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Family Stories & Memory Records */}
        <div className="lg:col-span-2 space-y-6">

          {/* Family Stories & Memory Records */}
          <div className="rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7DFD4] pb-3">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#1B3B2B]" />
                <h3 className="text-sm font-serif font-bold text-[#1F1913]">
                  Ký Ức & Nhật Ký Dòng Họ
                </h3>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('journal')}
                className="flex items-center gap-1 text-xs font-semibold text-[#1B3B2B] hover:text-[#254F3A] hover:underline"
              >
                <span>Xem tất cả ({stories.length})</span>
                <span aria-hidden="true">→</span>
              </button>
            </div>

            {stories.length === 0 ? (
              <div className="text-center py-6 px-4 rounded-xl border border-dashed border-[#E7DFD4] space-y-2">
                <p className="text-xs text-stone-500 font-serif">Chưa có bài ghi chép nhật ký nào.</p>
                <button
                  type="button"
                  onClick={() => onNavigate('journal')}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1B3B2B] text-white text-xs font-medium hover:bg-[#254F3A] transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Viết bài nhật ký đầu tiên</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {stories.slice(0, 3).map((story) => (
                  <div
                    key={story.id}
                    onClick={() => onNavigate('journal')}
                    className="p-4 rounded-xl border border-[#E7DFD4] bg-[#FAF8F5]/80 space-y-2 hover:border-[#1B3B2B]/40 hover:bg-[#FAF8F5] transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-serif font-bold text-[#1F1913] group-hover:text-[#1B3B2B] transition-colors">
                        {story.title}
                      </h4>
                      {story.periodLabel && (
                        <span className="text-[11px] text-[#8C6D32] font-semibold shrink-0">
                          {story.periodLabel}
                        </span>
                      )}
                    </div>
                    {story.summary && (
                      <p className="text-xs text-[#54483C] leading-relaxed italic">
                        "{story.summary}"
                      </p>
                    )}
                    <p className="text-xs text-[#3C3228] leading-relaxed line-clamp-2">
                      {story.content}
                    </p>
                    <div className="flex items-center justify-between text-[10px] text-stone-400 pt-1">
                      <span>{story.location || ''}</span>
                      <span className="text-[#1B3B2B] font-semibold group-hover:underline">
                        Đọc tiếp trong nhật ký →
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Elders & Lineage Head */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] p-5 shadow-xs space-y-4">
            <div className="border-b border-[#E7DFD4] pb-3">
              <h3 className="text-sm font-serif font-bold text-[#1F1913]">
                Các Bậc Trưởng Bối Tiền Nhân
              </h3>
              <p className="text-[11px] text-stone-500">Khởi thủy và các thế hệ rường cột</p>
            </div>

            <div className="space-y-2.5">
              {elders.map((elder) => (
                <div
                  key={elder.id}
                  onClick={() => onSelectPerson(elder.id)}
                  className="flex items-center gap-3 p-2 rounded-xl hover:bg-stone-50 cursor-pointer transition-colors"
                >
                  <HeritageAvatar
                    fullName={elder.fullName}
                    portraitUrl={elder.portraitUrl}
                    gender={elder.gender}
                    size="sm"
                    isLiving={elder.isLiving}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-xs">
                      <span className="font-bold text-[#1B3B2B]">
                        Đời {elder.generation}
                      </span>
                      {elder.clanRole && (
                        <>
                          <span aria-hidden="true" className="text-stone-300">·</span>
                          <span className="text-[11px] text-[#8C6D32] font-semibold truncate">
                            {elder.clanRole}
                          </span>
                        </>
                      )}
                    </div>
                    <p className="text-xs font-serif font-bold text-[#1F1913] truncate hover:text-[#1B3B2B]">
                      {elder.fullName}
                    </p>
                    <p className="text-[10px] text-stone-400 truncate tabular-nums">
                      {formatLifespan(elder.birthDate, elder.deathDate, elder.isLiving)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => onNavigate('members')}
              className="w-full py-2 rounded-xl text-xs font-semibold text-[#1B3B2B] bg-[#EAF2ED] hover:bg-[#D7E6DD] transition-colors"
            >
              Xem toàn bộ tộc nhân →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
