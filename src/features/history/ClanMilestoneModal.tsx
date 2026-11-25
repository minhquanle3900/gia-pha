import React, { useEffect, useState } from 'react';
import { Calendar, Flag, MapPin, Trash2, X } from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { FlexibleDateInput } from '../../components/FlexibleDateInput';
import { useGenealogy } from '../../context/GenealogyContext';
import { FlexibleDate, LifeEvent, LifeEventType } from '../../models/genealogy';
import { generateId } from '../../utils/dateUtils';

interface ClanMilestoneModalProps {
  open: boolean;
  editingEvent?: LifeEvent | null;
  onClose: () => void;
  onSaved?: (event: LifeEvent) => void;
}

const EVENT_TYPE_OPTIONS: { value: LifeEventType; label: string; description: string }[] = [
  {
    value: 'contribution',
    label: 'Công đức & Trùng tu từ đường',
    description: 'Xây dựng, tôn tạo nhà thờ họ, cung tiến đồ tế khí, lập quỹ dòng họ',
  },
  {
    value: 'migration',
    label: 'Di cư & Lập chi họ mới',
    description: 'Chuyển dời nơi cư trú, khai hoang lập nghiệp, mở rộng phân chi phương xa',
  },
  {
    value: 'education',
    label: 'Khoa cử, Học vị & Vinh quy',
    description: 'Đỗ đạt bảng vàng, phong hàm, học hàm học vị, thành tích vẻ vang',
  },
  {
    value: 'career',
    label: 'Khởi nghiệp & Cơ nghiệp',
    description: 'Mở tiệm, dựng xưởng, nhận sắc phong, giữ chức vụ xã hội',
  },
  {
    value: 'death',
    label: 'Tế tự, Lễ kỵ & Tưởng niệm',
    description: 'Đại lễ giỗ tổ, khánh thành khu lăng mộ, truy niệm tiền nhân, liệt sĩ',
  },
  {
    value: 'marriage',
    label: 'Hôn phối kết giao liên dòng họ',
    description: 'Mối lương duyên kết giao giữa hai đại gia đình lớn',
  },
  {
    value: 'other',
    label: 'Cột mốc lịch sử khác',
    description: 'Biến cố lịch sử, tản cư, xuất bản gia phả số, sự kiện trọng đại khác',
  },
];

export const ClanMilestoneModal: React.FC<ClanMilestoneModalProps> = ({
  open,
  editingEvent,
  onClose,
  onSaved,
}) => {
  const { people, saveLifeEvent, deleteLifeEvent } = useGenealogy();

  const [title, setTitle] = useState('');
  const [type, setType] = useState<LifeEventType>('contribution');
  const [personId, setPersonId] = useState<string>('');
  const [date, setDate] = useState<FlexibleDate | undefined>({
    precision: 'year',
    year: new Date().getFullYear(),
  });
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  useEffect(() => {
    if (editingEvent) {
      setTitle(editingEvent.title);
      setType(editingEvent.type);
      setPersonId(editingEvent.personId);
      setDate(editingEvent.date);
      setLocation(editingEvent.location || '');
      setDescription(editingEvent.description || '');
      setErrorMsg(null);
    } else {
      setTitle('');
      setType('contribution');
      setPersonId(people[0]?.id || '');
      setDate({ precision: 'year', year: new Date().getFullYear() });
      setLocation('');
      setDescription('');
      setErrorMsg(null);
    }
  }, [editingEvent, open, people]);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Vui lòng nhập tiêu đề cho cột mốc lịch sử dòng họ.');
      return;
    }

    if (!personId && people.length > 0) {
      setErrorMsg('Vui lòng chọn thành viên khởi xướng hoặc gắn liền với cột mốc.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg(null);

      const timestamp = new Date().toISOString();
      const eventToSave: LifeEvent = {
        id: editingEvent ? editingEvent.id : generateId('ev'),
        personId: personId || people[0]?.id || 'clan',
        title: title.trim(),
        type,
        date,
        location: location.trim() || undefined,
        description: description.trim() || undefined,
        createdAt: editingEvent ? editingEvent.createdAt : timestamp,
        updatedAt: timestamp,
      };

      await saveLifeEvent(eventToSave);
      if (onSaved) onSaved(eventToSave);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Không thể lưu cột mốc: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!editingEvent) return;
    try {
      setIsSubmitting(true);
      await deleteLifeEvent(editingEvent.id);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(`Không thể xóa cột mốc: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-2xl p-6 sm:p-7 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#E7DFD4] pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-[#EAF2ED] text-[#1B3B2B]">
                <Flag className="w-4 h-4" />
              </span>
              <h3 className="text-lg font-serif font-bold text-[#1F1913]">
                {editingEvent ? 'Chỉnh Sửa Cột Mốc Dòng Họ' : 'Thêm Cột Mốc Lịch Sử Dòng Họ'}
              </h3>
            </div>
            <p className="text-xs text-stone-500">
              Ghi chép các sự kiện đại sự, trùng tu từ đường, lập chi, khai nghiệp hoặc công đức
              chung của dòng tộc.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-[#3C3228] mb-1">
              Tiêu đề cột mốc lịch sử <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Trùng tu hậu cung Từ đường Đông Ngạc, Lập Ban liên lạc phía Nam..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full text-xs sm:text-sm rounded-xl border border-[#D5CABE] bg-white px-3 py-2 text-[#1F1913] placeholder:text-stone-400 focus:border-[#1B3B2B] focus:ring-1 focus:ring-[#1B3B2B] outline-none"
            />
          </div>

          {/* Type & Person in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#3C3228] mb-1">
                Phân loại sự kiện
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as LifeEventType)}
                className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 text-[#1F1913] focus:border-[#1B3B2B] outline-none"
              >
                {EVENT_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#3C3228] mb-1">
                Người khởi xướng / Gắn liền
              </label>
              <select
                value={personId}
                onChange={(e) => setPersonId(e.target.value)}
                className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 text-[#1F1913] focus:border-[#1B3B2B] outline-none"
              >
                {people.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}{' '}
                    {p.generation ? `(Đời ${p.generation})` : ''}{' '}
                    {p.clanRole ? `– ${p.clanRole}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <FlexibleDateInput
              label="Thời gian diễn ra sự kiện"
              value={date}
              onChange={setDate}
              helperText="Có thể nhập năm chính xác hoặc niên đại ước tính (VD: 'Năm Giáp Ngọ', 'Mùa thu 1945')"
            />
          </div>

          {/* Location */}
          <div>
            <label className="block text-xs font-semibold text-[#3C3228] mb-1 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-[#8C6D32]" />
              <span>Địa điểm / Nơi chốn</span>
            </label>
            <input
              type="text"
              placeholder="VD: Từ đường họ Trần, Xóm Chùa, làng Đông Ngạc, Hà Nội"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 text-[#1F1913] placeholder:text-stone-400 focus:border-[#1B3B2B] outline-none"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-[#3C3228] mb-1">
              Diễn giải chi tiết & Ý nghĩa dòng họ
            </label>
            <textarea
              rows={3}
              placeholder="Ghi rõ hoàn cảnh, con cháu tề tựu, công sức đóng góp hoặc bài học truyền đời lưu lại cho hậu thế..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 text-[#1F1913] placeholder:text-stone-400 focus:border-[#1B3B2B] outline-none leading-relaxed"
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-3 border-t border-[#E7DFD4]">
            {editingEvent ? (
              <button
                type="button"
                onClick={() => setConfirmDeleteOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa cột mốc</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-[#D5CABE] bg-white text-xs font-semibold text-stone-700 hover:bg-stone-50 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-[#1B3B2B] hover:bg-[#28503C] text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
              >
                {isSubmitting ? 'Đang lưu...' : editingEvent ? 'Cập nhật cột mốc' : 'Lưu cột mốc'}
              </button>
            </div>
          </div>
        </form>
      </div>

      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Xác nhận xóa cột mốc lịch sử"
        description={`Bạn có chắc chắn muốn xóa cột mốc "${editingEvent?.title}"? Dữ liệu này sẽ được gỡ khỏi niên biểu dòng họ.`}
        confirmLabel="Xóa cột mốc"
        cancelLabel="Giữ lại"
        danger={true}
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />
    </div>
  );
};
