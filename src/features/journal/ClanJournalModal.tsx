import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Check,
  FileText,
  MapPin,
  Pin,
  Sparkles,
  Tag,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useGenealogy } from '../../context/GenealogyContext';
import { FamilyStory } from '../../models/genealogy';
import { generateId } from '../../utils/dateUtils';

interface ClanJournalModalProps {
  open: boolean;
  editingStory?: FamilyStory | null;
  onClose: () => void;
  onSaved?: (story: FamilyStory) => void;
}

export type JournalCategory =
  | 'historical_event'
  | 'clan_memory'
  | 'renovation_merit'
  | 'communal_rule'
  | 'general_note';

export const JOURNAL_CATEGORY_META: Record<
  JournalCategory,
  { label: string; description: string; badgeTone: 'forest' | 'gold' | 'bark' | 'terracotta' }
> = {
  historical_event: {
    label: 'Sự kiện lịch sử chung',
    description: 'Biến cố lịch sử, tản cư, khởi cơ lập nghiệp, dấu mốc qua các triều đại',
    badgeTone: 'forest',
  },
  clan_memory: {
    label: 'Kỷ niệm đáng nhớ',
    description: 'Đoàn tụ ba miền, ngày hội làng, lễ tạ ơn, khoảnh khắc gia tộc sum họp',
    badgeTone: 'gold',
  },
  renovation_merit: {
    label: 'Trùng tu & Công đức',
    description: 'Tôn tạo nhà thờ họ, đúc chuông, dựng cổng tam quan, xây lăng mộ Tổ',
    badgeTone: 'terracotta',
  },
  communal_rule: {
    label: 'Hương ước & Quy ước',
    description: 'Gia quy, quỹ khuyến học, lệ giỗ chạp, nghi thức thờ tự truyền đời',
    badgeTone: 'bark',
  },
  general_note: {
    label: 'Ghi chú chung',
    description: 'Tài liệu cổ phả ghi chép lại, khảo cứu phả học, lời răn dạy của tiền nhân',
    badgeTone: 'forest',
  },
};

export const ClanJournalModal: React.FC<ClanJournalModalProps> = ({
  open,
  editingStory,
  onClose,
  onSaved,
}) => {
  const { branches, saveStory, deleteStory } = useGenealogy();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<JournalCategory>('historical_event');
  const [periodLabel, setPeriodLabel] = useState('');
  const [location, setLocation] = useState('');
  const [recordedBy, setRecordedBy] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [branchId, setBranchId] = useState<string>('');
  const [isPinned, setIsPinned] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (editingStory) {
      setTitle(editingStory.title || '');
      setCategory((editingStory.category as JournalCategory) || 'historical_event');
      setPeriodLabel(editingStory.periodLabel || '');
      setLocation(editingStory.location || '');
      setRecordedBy(editingStory.recordedBy || '');
      setSummary(editingStory.summary || '');
      setContent(editingStory.content || '');
      setBranchId(editingStory.branchId || '');
      setIsPinned(Boolean(editingStory.isPinned));
      setTags(editingStory.tags || []);
      setTagInput('');
      setErrorMsg(null);
    } else {
      setTitle('');
      setCategory('historical_event');
      setPeriodLabel(`Năm ${new Date().getFullYear()}`);
      setLocation('');
      setRecordedBy('Ban Trị Sự Dòng Họ');
      setSummary('');
      setContent('');
      setBranchId('');
      setIsPinned(false);
      setTags(['#NhậtKýDòngHọ']);
      setTagInput('');
      setErrorMsg(null);
    }
  }, [editingStory, open]);

  if (!open) return null;

  const handleAddTag = () => {
    const clean = tagInput.trim().replace(/^#+/, '');
    if (!clean) return;
    const formatted = `#${clean}`;
    if (!tags.includes(formatted)) {
      setTags([...tags, formatted]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tiêu đề cho sự kiện hoặc ghi chú nhật ký.');
      return;
    }
    if (!content.trim()) {
      setErrorMsg('Vui lòng nhập nội dung chi tiết bài viết nhật ký dòng họ.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const now = new Date().toISOString();
      const storyId = editingStory?.id || generateId('story');

      const entryToSave: FamilyStory = {
        id: storyId,
        title: title.trim(),
        summary: summary.trim() || undefined,
        content: content.trim(),
        periodLabel: periodLabel.trim() || undefined,
        location: location.trim() || undefined,
        recordedBy: recordedBy.trim() || undefined,
        category,
        branchId: branchId || undefined,
        isPinned,
        tags: tags.length > 0 ? tags : undefined,
        personIds: editingStory?.personIds || [], // empty array for communal events
        mediaIds: editingStory?.mediaIds || [],
        createdAt: editingStory?.createdAt || now,
        updatedAt: now,
      };

      await saveStory(entryToSave);
      onSaved?.(entryToSave);
      onClose();
    } catch (err: unknown) {
      console.error(err);
      setErrorMsg('Có lỗi xảy ra khi lưu nhật ký. Vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingStory) return;
    try {
      await deleteStory(editingStory.id);
      setConfirmDeleteOpen(false);
      onClose();
    } catch (err) {
      console.error(err);
      setErrorMsg('Không thể xóa bài viết nhật ký.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div
        className="w-full max-w-2xl bg-[#FFFDF9] rounded-3xl border border-[#E7DFD4] shadow-2xl overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-linear-to-r from-[#1B3B2B] to-[#254F3A] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-white/10 border border-white/20 text-[#DBC599]">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-serif font-bold text-[#FFFDF9]">
                {editingStory ? 'Chỉnh Sửa Nhật Ký Dòng Họ' : 'Viết Nhật Ký Dòng Họ Mới'}
              </h2>
              <p className="text-xs text-[#E3DACD]">
                Ghi chép sự kiện lịch sử chung, kỷ niệm hoặc hương ước toàn tộc
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto max-h-[75vh]">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Title */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#2C231A]">
              Tiêu đề sự kiện / ghi chú nhật ký <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Đại lễ khánh thành Từ đường, Biến cố lũ sông Hồng năm 1971..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5CABE] bg-[#FAF8F5] text-xs text-[#1F1913] placeholder-stone-400 focus:outline-none focus:border-[#1B3B2B] focus:bg-white"
            />
          </div>

          {/* Category Selection */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#2C231A]">
              Thể loại sự kiện / ghi chép <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(Object.keys(JOURNAL_CATEGORY_META) as JournalCategory[]).map((cat) => {
                const meta = JOURNAL_CATEGORY_META[cat];
                const isSelected = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`p-2.5 rounded-xl border text-left text-xs transition-all ${
                      isSelected
                        ? 'bg-[#1B3B2B]/10 border-[#1B3B2B] text-[#1B3B2B] font-semibold ring-1 ring-[#1B3B2B]'
                        : 'bg-white border-[#E7DFD4] text-stone-700 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold">{meta.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#1B3B2B]" />}
                    </div>
                    <p className="text-[10px] text-stone-500 mt-0.5 line-clamp-1">
                      {meta.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grid 2: Period / Year & Location */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#2C231A] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#8C6D32]" />
                <span>Thời gian / Niên đại</span>
              </label>
              <input
                type="text"
                value={periodLabel}
                onChange={(e) => setPeriodLabel(e.target.value)}
                placeholder="Ví dụ: Mùa xuân 1995, Năm 2024, 1946 – 1954..."
                className="w-full px-3 py-2 rounded-xl border border-[#D5CABE] bg-[#FAF8F5] text-xs text-[#1F1913] placeholder-stone-400 focus:outline-none focus:border-[#1B3B2B] focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#2C231A] flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-[#2E6B4F]" />
                <span>Địa điểm diễn ra</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Ví dụ: Nhà thờ họ Đông Ngạc, Hà Nội..."
                className="w-full px-3 py-2 rounded-xl border border-[#D5CABE] bg-[#FAF8F5] text-xs text-[#1F1913] placeholder-stone-400 focus:outline-none focus:border-[#1B3B2B] focus:bg-white"
              />
            </div>
          </div>

          {/* Grid 2: Recorder & Branch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#2C231A] flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-stone-500" />
                <span>Người ghi chép / Đơn vị ghi chép</span>
              </label>
              <input
                type="text"
                value={recordedBy}
                onChange={(e) => setRecordedBy(e.target.value)}
                placeholder="Ví dụ: Ban Trị Sự Dòng Họ, Trưởng tộc..."
                className="w-full px-3 py-2 rounded-xl border border-[#D5CABE] bg-[#FAF8F5] text-xs text-[#1F1913] placeholder-stone-400 focus:outline-none focus:border-[#1B3B2B] focus:bg-white"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-[#2C231A] flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-stone-500" />
                <span>Phạm vi chi họ liên quan</span>
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[#D5CABE] bg-[#FAF8F5] text-xs text-[#1F1913] focus:outline-none focus:border-[#1B3B2B] focus:bg-white"
              >
                <option value="">Toàn bộ dòng họ (Đại Tôn & các Chi)</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Short summary */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#2C231A]">
              Tóm tắt ý chính (Hiển thị đầu bài viết)
            </label>
            <input
              type="text"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Tóm tắt ngắn gọn trong 1-2 câu để người đọc nắm nhanh..."
              className="w-full px-3.5 py-2 rounded-xl border border-[#D5CABE] bg-[#FAF8F5] text-xs text-[#1F1913] placeholder-stone-400 focus:outline-none focus:border-[#1B3B2B] focus:bg-white"
            />
          </div>

          {/* Full content */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-[#2C231A]">
              Nội dung chi tiết nhật ký dòng họ <span className="text-red-500">*</span>
            </label>
            <textarea
              required
              rows={6}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ghi chép diễn biến chi tiết sự kiện lịch sử, bối cảnh, các nhân vật tham gia, ý nghĩa đối với các thế hệ mai sau..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#D5CABE] bg-[#FAF8F5] text-xs text-[#1F1913] placeholder-stone-400 focus:outline-none focus:border-[#1B3B2B] focus:bg-white leading-relaxed"
            />
          </div>

          {/* Tags & Pin Toggle */}
          <div className="space-y-3 pt-1 border-t border-[#F0EAE1]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Pin switch */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="rounded text-[#1B3B2B] focus:ring-[#1B3B2B]"
                />
                <span className="text-xs font-medium text-[#2C231A] flex items-center gap-1.5">
                  <Pin className="w-3.5 h-3.5 text-[#C19B4C]" />
                  <span>Ghim bài viết này lên đầu trang nhật ký dòng họ</span>
                </span>
              </label>

              {/* Tag input */}
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTag();
                    }
                  }}
                  placeholder="Thêm thẻ #hashtag..."
                  className="px-2.5 py-1.5 text-xs rounded-xl border border-stone-300 bg-white"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="px-2.5 py-1.5 bg-[#FAF2E6] text-[#8C6D32] border border-[#E3CCA0] rounded-xl text-xs font-medium hover:bg-[#F3E5D0]"
                >
                  Thêm thẻ
                </button>
              </div>
            </div>

            {/* Rendered Tags */}
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#1B3B2B]/10 text-[#1B3B2B]"
                  >
                    <span>{tag}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-600 ml-0.5"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-[#F0EAE1]">
            {editingStory ? (
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-red-700 hover:bg-red-50 text-xs font-semibold transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>Xóa bài nhật ký</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[#D5CABE] text-[#54483C] hover:bg-stone-100 text-xs font-semibold transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#1B3B2B] text-white hover:bg-[#28503C] text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              >
                <BookOpen className="w-4 h-4 text-[#DBC599]" />
                <span>{isSubmitting ? 'Đang lưu...' : 'Lưu vào Nhật ký'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        title={`Xác nhận xóa bài nhật ký "${title}"`}
        description="Bạn có chắc chắn muốn xóa bài viết nhật ký này khỏi cơ sở dữ liệu gia phả? Hành động này không thể hoàn tác."
        confirmLabel="Xóa bài viết"
        cancelLabel="Hủy"
        danger={true}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
};
