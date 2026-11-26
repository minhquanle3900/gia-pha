import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  Check,
  MapPin,
  Pin,
  Trash2,
  User,
  Users,
  X,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { useGenealogy } from '../../context/GenealogyContext';
import { useNativeModal } from '../../hooks/useNativeModal';
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

function initialDraftFor(story?: FamilyStory | null) {
  return {
    title: story?.title ?? '',
    category: story?.category ?? 'historical_event',
    periodLabel: story ? story.periodLabel ?? '' : `Năm ${new Date().getFullYear()}`,
    location: story?.location ?? '',
    recordedBy: story ? story.recordedBy ?? '' : 'Ban Trị Sự Dòng Họ',
    summary: story?.summary ?? '',
    content: story?.content ?? '',
    branchId: story?.branchId ?? '',
    isPinned: Boolean(story?.isPinned),
    tags: story ? story.tags ?? [] : ['#NhậtKýDòngHọ'],
  };
}

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
  const [confirmation, setConfirmation] = useState<'delete' | 'discard' | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useNativeModal(open, closeRef);
  const initialDraft = useRef<ReturnType<typeof initialDraftFor> | null>(null);
  const writeInProgress = useRef(false);
  const closeAfterConfirmation = useRef(false);

  useEffect(() => {
    if (!open) return;
    const draft = initialDraftFor(editingStory);
    initialDraft.current = draft;
    setTitle(draft.title);
    setCategory(draft.category);
    setPeriodLabel(draft.periodLabel);
    setLocation(draft.location);
    setRecordedBy(draft.recordedBy);
    setSummary(draft.summary);
    setContent(draft.content);
    setBranchId(draft.branchId);
    setIsPinned(draft.isPinned);
    setTags(draft.tags);
    setTagInput('');
    setErrorMsg(null);
    setConfirmation(null);
  }, [editingStory, open]);

  useEffect(() => {
    if (confirmation || !closeAfterConfirmation.current) return;
    closeAfterConfirmation.current = false;
    onClose();
  }, [confirmation, onClose]);

  if (!open) return null;

  const requestClose = () => {
    if (writeInProgress.current || confirmation) return;
    const initial = initialDraft.current;
    const dirty = tagInput !== '' || (initial && (
      title !== initial.title || category !== initial.category || periodLabel !== initial.periodLabel ||
      location !== initial.location || recordedBy !== initial.recordedBy || summary !== initial.summary ||
      content !== initial.content || branchId !== initial.branchId || isPinned !== initial.isPinned ||
      tags.length !== initial.tags.length || tags.some((tag, index) => tag !== initial.tags[index])
    ));
    if (dirty) setConfirmation('discard');
    else onClose();
  };

  const finishConfirmation = () => {
    // Let the child close first so the editor can restore its own opener.
    closeAfterConfirmation.current = true;
    setConfirmation(null);
  };

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
    if (writeInProgress.current || confirmation) return;
    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tiêu đề cho sự kiện hoặc ghi chú nhật ký.');
      return;
    }
    if (!content.trim()) {
      setErrorMsg('Vui lòng nhập nội dung chi tiết bài viết nhật ký dòng họ.');
      return;
    }

    writeInProgress.current = true;
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
      writeInProgress.current = false;
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingStory || writeInProgress.current) return;
    writeInProgress.current = true;
    setIsDeleting(true);
    try {
      await deleteStory(editingStory.id);
      finishConfirmation();
    } catch (err) {
      console.error(err);
      setConfirmation(null);
      setErrorMsg('Không thể xóa bài viết nhật ký.');
    } finally {
      writeInProgress.current = false;
      setIsDeleting(false);
    }
  };

  return (
    <>
      <dialog
        ref={dialogRef}
        aria-modal="true"
        aria-labelledby="journal-entry-title"
        aria-busy={isSubmitting || isDeleting}
        closedby={isSubmitting || isDeleting ? 'none' : 'closerequest'}
        onCancel={(event) => {
          event.preventDefault();
          requestClose();
        }}
        className="m-auto max-h-[92dvh] w-[calc(100%-1rem)] max-w-2xl flex-col overflow-hidden rounded-2xl border border-[#E7DFD4] bg-[#FFFDF9] shadow-2xl open:flex backdrop:bg-black/60 backdrop:backdrop-blur-xs"
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between gap-2 bg-forest-900 px-4 py-2 text-white sm:px-6 sm:py-3">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-white/10 border border-white/20 text-[#DBC599]">
              <BookOpen className="w-5 h-5" />
            </span>
            <div>
              <h2 id="journal-entry-title" className="text-xl font-serif font-bold text-white sm:text-2xl">
                {editingStory ? 'Chỉnh sửa nhật ký' : 'Viết nhật ký mới'}
              </h2>
            </div>
          </div>
          <button
            type="button"
            ref={closeRef}
            aria-label="Đóng biểu mẫu nhật ký"
            disabled={isSubmitting || isDeleting}
            onClick={requestClose}
            className="grid size-11 shrink-0 place-items-center rounded-xl text-white hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-[#DBC599] disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="min-h-0 overflow-y-auto p-4 sm:p-6">
          <fieldset disabled={isSubmitting || isDeleting} className="min-w-0 space-y-4">
            {errorMsg && (
              <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-900">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Title */}
            <div className="space-y-1.5">
              <label htmlFor="journal-title" className="block text-sm font-semibold text-[#1F1913]">
                Tiêu đề sự kiện / ghi chú nhật ký <span className="text-red-500">*</span>
              </label>
              <input
               id="journal-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ví dụ: Đại lễ khánh thành Từ đường, Biến cố lũ sông Hồng năm 1971..."
                className="min-h-11 w-full rounded-xl border border-[#D5CABE] bg-[#FAF8F5] px-3 py-2 text-base text-[#1F1913] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 sm:text-sm"
              />
            </div>

            {/* Full content */}
            <div className="space-y-1.5">
              <label htmlFor="journal-content" className="block text-sm font-semibold text-[#1F1913]">
                Nội dung chi tiết nhật ký dòng họ <span className="text-red-500">*</span>
              </label>
              <textarea
               id="journal-content"
                required
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Ghi chép diễn biến chi tiết sự kiện lịch sử, bối cảnh, các nhân vật tham gia, ý nghĩa đối với các thế hệ mai sau..."
                className="min-h-11 w-full rounded-xl border border-[#D5CABE] bg-[#FAF8F5] px-3 py-2 text-base text-[#1F1913] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 sm:text-sm leading-relaxed"
              />
            </div>

            <fieldset className="min-w-0 space-y-1.5">
              <legend className="text-sm font-semibold text-[#1F1913]">Thể loại</legend>
              <select
                aria-label="Thể loại bài viết"
                value={category}
                onChange={(event) => setCategory(event.target.value as JournalCategory)}
                className="min-h-11 w-full rounded-xl border border-[#D5CABE] bg-[#FAF8F5] px-3 text-base text-[#1F1913] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 sm:hidden"
              >
                {(Object.keys(JOURNAL_CATEGORY_META) as JournalCategory[]).map((value) => (
                  <option value={value} key={value}>{JOURNAL_CATEGORY_META[value].label}</option>
                ))}
              </select>
              <p className="text-xs text-stone-600 sm:hidden">{JOURNAL_CATEGORY_META[category]?.description}</p>
              <div className="hidden grid-cols-2 gap-2 sm:grid">
                {(Object.keys(JOURNAL_CATEGORY_META) as JournalCategory[]).map((cat) => {
                  const meta = JOURNAL_CATEGORY_META[cat];
                  const isSelected = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      aria-pressed={isSelected}
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
            </fieldset>

            {/* Grid 2: Period / Year & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <label htmlFor="journal-period" className="block text-sm font-semibold text-[#1F1913] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#8C6D32]" />
                  <span>Thời gian / Niên đại</span>
                </label>
                <input
                 id="journal-period"
                  type="text"
                  value={periodLabel}
                  onChange={(e) => setPeriodLabel(e.target.value)}
                  placeholder="Ví dụ: Mùa xuân 1995, Năm 2024, 1946 – 1954..."
                  className="min-h-11 w-full rounded-xl border border-[#D5CABE] bg-[#FAF8F5] px-3 text-base text-[#1F1913] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="journal-location" className="block text-sm font-semibold text-[#1F1913] flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#2E6B4F]" />
                  <span>Địa điểm diễn ra</span>
                </label>
                <input
                 id="journal-location"
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ví dụ: Nhà thờ họ Đông Ngạc, Hà Nội..."
                  className="min-h-11 w-full rounded-xl border border-[#D5CABE] bg-[#FAF8F5] px-3 text-base text-[#1F1913] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 sm:text-sm"
                />
              </div>
            </div>

            {/* Grid 2: Recorder & Branch */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-1.5">
                <label htmlFor="journal-recorder" className="block text-sm font-semibold text-[#1F1913] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-stone-500" />
                  <span>Người ghi chép / Đơn vị ghi chép</span>
                </label>
                <input
                 id="journal-recorder"
                  type="text"
                  value={recordedBy}
                  onChange={(e) => setRecordedBy(e.target.value)}
                  placeholder="Ví dụ: Ban Trị Sự Dòng Họ, Trưởng tộc..."
                  className="min-h-11 w-full rounded-xl border border-[#D5CABE] bg-[#FAF8F5] px-3 text-base text-[#1F1913] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 sm:text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="journal-branch" className="block text-sm font-semibold text-[#1F1913] flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-stone-500" />
                  <span>Phạm vi chi họ liên quan</span>
                </label>
                <select
                 id="journal-branch"
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-[#D5CABE] bg-[#FAF8F5] px-3 text-base text-[#1F1913] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 sm:text-sm"
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
              <label htmlFor="journal-summary" className="block text-sm font-semibold text-[#1F1913]">
                Tóm tắt ý chính (Hiển thị đầu bài viết)
              </label>
              <input
               id="journal-summary"
                type="text"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Tóm tắt ngắn gọn trong 1-2 câu để người đọc nắm nhanh..."
                className="min-h-11 w-full rounded-xl border border-[#D5CABE] bg-[#FAF8F5] px-3 text-base text-[#1F1913] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 sm:text-sm"
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
                    aria-label="Từ khóa mới"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTag();
                      }
                    }}
                    placeholder="Thêm thẻ #hashtag..."
                    className="min-h-11 min-w-0 flex-1 rounded-xl border border-stone-300 bg-white px-2.5 text-base sm:text-sm"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="min-h-11 shrink-0 rounded-xl border border-amber-200 bg-amber-50 px-2.5 text-xs font-medium text-amber-900"
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
                        aria-label={'Xóa thẻ ' + tag}
                        className="grid size-11 place-items-center rounded-full hover:text-rose-800 focus-visible:outline-2 focus-visible:outline-forest-700"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#E7DFD4] pt-3">
              {editingStory ? (
                <button
                  type="button"
                  disabled={isSubmitting || isDeleting}
                  onClick={() => setConfirmation('delete')}
                  className="mr-auto flex min-h-11 items-center gap-1.5 rounded-xl px-2 text-xs font-semibold text-rose-900 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-rose-700 disabled:opacity-50"
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
                  disabled={isSubmitting || isDeleting}
                  onClick={requestClose}
                  className="min-h-11 rounded-xl border border-[#D5CABE] px-3 text-xs font-semibold text-[#54483C] hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-forest-700 disabled:opacity-50"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isDeleting}
                  className="flex min-h-11 items-center gap-1.5 rounded-xl bg-forest-800 px-3 text-xs font-semibold text-white hover:bg-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 disabled:opacity-50"
                >
                  <BookOpen className="w-4 h-4 text-[#DBC599]" />
                  <span>{isSubmitting ? 'Đang lưu...' : 'Lưu vào Nhật ký'}</span>
                </button>
              </div>
            </div>
          </fieldset>
        </form>
      </dialog>

      <ConfirmDialog
        open={confirmation !== null}
        title={confirmation === 'discard' ? 'Bỏ thay đổi chưa lưu?' : `Xác nhận xóa bài nhật ký "${editingStory?.title ?? title}"`}
        description={confirmation === 'discard'
          ? 'Bản nháp sẽ bị bỏ. Chọn tiếp tục chỉnh sửa để giữ nội dung đang nhập.'
          : 'Bạn có chắc chắn muốn xóa bài viết nhật ký này khỏi cơ sở dữ liệu gia phả? Hành động này không thể hoàn tác.'}
        confirmLabel={confirmation === 'discard' ? 'Bỏ thay đổi' : 'Xóa bài viết'}
        cancelLabel={confirmation === 'discard' ? 'Tiếp tục chỉnh sửa' : 'Hủy'}
        danger={true}
        busy={isDeleting}
        onConfirm={confirmation === 'discard' ? finishConfirmation : handleDelete}
        onCancel={() => setConfirmation(null)}
      />
    </>
  );
};
