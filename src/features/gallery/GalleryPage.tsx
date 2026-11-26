import React, { useMemo, useState } from 'react';
import {
  Calendar,
  Camera,
  Filter,
  Mic,
  Music,
  Plus,
  Tag,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { HeritageAvatar } from '../../components/HeritageAvatar';
import { useGenealogy } from '../../context/GenealogyContext';
import { Media, MediaCategory } from '../../models/genealogy';
import { compressImageFile } from '../../utils/imageUtils';
import { AudioRecorderModal } from './AudioRecorderModal';

interface GalleryPageProps {
  onSelectPerson: (personId: string) => void;
}

const CATEGORY_LABELS: Record<MediaCategory, string> = {
  portrait: 'Chân dung',
  historical_photo: 'Ảnh tư liệu lịch sử',
  document: 'Gia phả giấy dó & Tư liệu',
  certificate: 'Sắc phong & Bằng khen',
  letter: 'Thư từ & Bút tích',
  record: 'Hồ sơ lưu trữ',
  audio: 'Bản ghi âm ký ức',
};

export const GalleryPage: React.FC<GalleryPageProps> = ({ onSelectPerson }) => {
  const { media, people, saveMedia, deleteMedia } = useGenealogy();

  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPersonFilter, setSelectedPersonFilter] = useState<string>('all');
  const [viewingMedia, setViewingMedia] = useState<Media | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [audioRecorderOpen, setAudioRecorderOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // New Media Form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<MediaCategory>('historical_photo');
  const [newDateLabel, setNewDateLabel] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStoryContext, setNewStoryContext] = useState('');
  const [newSelectedPeople, setNewSelectedPeople] = useState<string[]>([]);
  const [newDataUrl, setNewDataUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const peopleMap = useMemo(() => {
    const map = new Map<string, (typeof people)[0]>();
    for (const p of people) map.set(p.id, p);
    return map;
  }, [people]);

  const filteredMedia = useMemo(() => {
    return media.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (selectedPersonFilter !== 'all' && !item.personIds.includes(selectedPersonFilter)) {
        return false;
      }
      return true;
    });
  }, [media, selectedCategory, selectedPersonFilter]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploadError(null);
      const compressed = await compressImageFile(file, 1200, 0.85);
      setNewDataUrl(compressed.dataUrl);
      if (!newTitle) {
        setNewTitle(file.name.replace(/\.[^/.]+$/, ''));
      }
    } catch {
      setUploadError('Không thể nén tệp ảnh. Vui lòng chọn tệp định dạng JPG hoặc PNG nhỏ hơn 10MB.');
    }
  };

  const handleSaveNewMedia = async () => {
    if (!newTitle.trim() || !newDataUrl) {
      setUploadError('Vui lòng chọn ảnh và nhập tiêu đề kỷ vật.');
      return;
    }

    const newItem: Media = {
      id: `media_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      title: newTitle.trim(),
      category: newCategory,
      dateLabel: newDateLabel.trim() || undefined,
      description: newDescription.trim() || undefined,
      storyContext: newStoryContext.trim() || undefined,
      mimeType: 'image/jpeg',
      dataUrl: newDataUrl,
      personIds: newSelectedPeople,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveMedia(newItem);
    setAddModalOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setNewTitle('');
    setNewCategory('historical_photo');
    setNewDateLabel('');
    setNewDescription('');
    setNewStoryContext('');
    setNewSelectedPeople([]);
    setNewDataUrl(null);
    setUploadError(null);
  };

  const handleDeleteMedia = async () => {
    if (!deleteId) return;
    try {
      await deleteMedia(deleteId);
      if (viewingMedia?.id === deleteId) setViewingMedia(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Không thể xóa kỷ vật.');
      setViewingMedia(null);
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in">
      {deleteError && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-800">{deleteError}</p>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E7DFD4] pb-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1B3B2B] tracking-tight">
            Kho Kỷ Vật & Tư Liệu Gia Tộc
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Lưu giữ ảnh tư liệu, gia phả giấy dó, sắc phong, thư từ và ký ức lịch sử của dòng họ.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setAudioRecorderOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#FAF5EB] border border-[#C19B4C]/40 text-[#8C6D32] hover:bg-[#F3EAD6] text-xs font-semibold shadow-xs transition-colors"
            title="Thu âm trực tiếp giọng nói hoặc lời dặn của tiền nhân"
          >
            <Mic className="w-4 h-4 text-[#C19B4C]" />
            <span>Thu âm ký ức</span>
          </button>

          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1B3B2B] hover:bg-[#28503C] text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm kỷ vật</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="p-3.5 rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 text-xs text-stone-500 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Phân loại:</span>
          </div>

          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
              selectedCategory === 'all'
                ? 'bg-[#1B3B2B] text-white'
                : 'bg-[#F2EDE4] text-[#54483C] hover:bg-stone-200'
            }`}
          >
            Tất cả ({media.length})
          </button>

          {(Object.keys(CATEGORY_LABELS) as MediaCategory[]).map((cat) => {
            const count = media.filter((m) => m.category === cat).length;
            if (count === 0 && selectedCategory !== cat) return null;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all ${
                  selectedCategory === cat
                    ? 'bg-[#1B3B2B] text-white'
                    : 'bg-[#F2EDE4] text-[#54483C] hover:bg-stone-200'
                }`}
              >
                {CATEGORY_LABELS[cat]} ({count})
              </button>
            );
          })}
        </div>

        {/* Filter by Person */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-stone-500">Người liên quan:</label>
          <select
            value={selectedPersonFilter}
            onChange={(e) => setSelectedPersonFilter(e.target.value)}
            className="text-xs rounded-xl border border-[#D5CABE] bg-[#FAF8F5] px-2.5 py-1.5 text-[#2C241C] outline-none focus:border-[#1B3B2B]"
          >
            <option value="all">Mọi thành viên</option>
            {people.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Gallery Grid */}
      {filteredMedia.length === 0 ? (
        <div className="p-12 text-center bg-[#FFFDF9] rounded-2xl border border-[#E7DFD4] space-y-3">
          <Camera className="w-10 h-10 text-stone-300 mx-auto" />
          <p className="text-sm font-serif font-bold text-stone-700">Chưa có kỷ vật nào trong mục này</p>
          <p className="text-xs text-stone-500">
            Hãy tải lên các bức ảnh gia đình xưa, sắc phong, hoặc bản gia phả cổ để lưu giữ.
          </p>
          <button
            type="button"
            onClick={() => setAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-[#1B3B2B] text-white text-xs font-semibold"
          >
            + Tải lên kỷ vật
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredMedia.map((item) => (
            <div
              key={item.id}
              onClick={() => setViewingMedia(item)}
              className="group rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] overflow-hidden shadow-xs hover:shadow-md hover:border-[#1B3B2B]/40 cursor-pointer transition-all flex flex-col"
            >
              <div className="aspect-4/3 w-full bg-stone-100 relative overflow-hidden flex items-center justify-center">
                {item.category === 'audio' ? (
                  <div className="w-full h-full bg-[#1B3B2B] flex flex-col items-center justify-center p-3 text-center text-white">
                    <div className="w-11 h-11 rounded-full bg-white/10 flex items-center justify-center border border-white/20 mb-1.5 shadow-inner">
                      <Mic className="w-5 h-5 text-[#DBC599]" />
                    </div>
                    <span className="text-[11px] font-serif font-bold line-clamp-1">{item.title}</span>
                    <span className="text-[9px] text-[#DBC599] mt-0.5">Bản ghi âm ký ức</span>
                  </div>
                ) : (
                  <img
                    src={item.dataUrl}
                    alt={item.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                )}
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-black/60 text-white backdrop-blur-xs">
                  {CATEGORY_LABELS[item.category] || item.category}
                </span>
              </div>

              <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                <div>
                  <h3 className="text-xs font-serif font-bold text-[#1F1913] group-hover:text-[#1B3B2B] transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  {item.dateLabel && (
                    <p className="text-[10px] text-[#8C6D32] font-medium flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>{item.dateLabel}</span>
                    </p>
                  )}
                  {item.description && (
                    <p className="text-[11px] text-stone-500 line-clamp-2 mt-1">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Linked People Avatars */}
                {item.personIds.length > 0 && (
                  <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
                    <span className="text-[10px] text-stone-400">Gắn với {item.personIds.length} người</span>
                    <div className="flex -space-x-1.5 overflow-hidden">
                      {item.personIds.slice(0, 3).map((pId) => {
                        const person = peopleMap.get(pId);
                        if (!person) return null;
                        return (
                          <HeritageAvatar
                            key={pId}
                            fullName={person.fullName}
                            portraitUrl={person.portraitUrl}
                            gender={person.gender}
                            size="xs"
                            className="ring-1 ring-white"
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Lightbox / Media Viewer Modal */}
      {viewingMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-4xl max-h-[92vh] rounded-3xl bg-[#FFFDF9] overflow-hidden flex flex-col md:flex-row shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left: Media / Image / Audio Container */}
            <div className="flex-1 bg-stone-900 flex flex-col items-center justify-center p-6 relative min-h-[250px] md:min-h-[480px]">
              {viewingMedia.category === 'audio' ? (
                <div className="w-full max-w-md flex flex-col items-center text-center space-y-4">
                  <div className="w-20 h-20 rounded-full bg-[#1B3B2B] text-[#DBC599] flex items-center justify-center border-2 border-[#DBC599]/50 shadow-2xl">
                    <Mic className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-white font-serif text-lg font-bold">{viewingMedia.title}</h3>
                    <p className="text-[#DBC599] text-xs mt-1">Bản ghi âm giọng nói & Lời dặn tiền nhân</p>
                  </div>
                  <audio controls src={viewingMedia.dataUrl} className="w-full mt-2" autoPlay />
                </div>
              ) : (
                <img
                  src={viewingMedia.dataUrl}
                  alt={viewingMedia.title}
                  className="max-h-[75vh] max-w-full object-contain rounded-lg"
                />
              )}
            </div>

            {/* Right: Info Panel */}
            <div className="w-full md:w-80 p-5 md:p-6 overflow-y-auto flex flex-col justify-between space-y-4 bg-[#FFFDF9] border-l border-[#E7DFD4]">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#1B3B2B]">
                    {CATEGORY_LABELS[viewingMedia.category]}
                  </span>
                  <button
                    type="button"
                    onClick={() => setViewingMedia(null)}
                    className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h3 className="text-base font-serif font-bold text-[#1F1913] leading-snug">
                  {viewingMedia.title}
                </h3>

                {viewingMedia.dateLabel && (
                  <p className="text-xs text-[#8C6D32] font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{viewingMedia.dateLabel}</span>
                  </p>
                )}

                {viewingMedia.description && (
                  <div className="text-xs text-[#4A3F35] leading-relaxed pt-2 border-t border-stone-200">
                    <h4 className="font-semibold text-stone-600 mb-1">Mô tả tư liệu</h4>
                    <p className="whitespace-pre-line">{viewingMedia.description}</p>
                  </div>
                )}

                {viewingMedia.storyContext && (
                  <div className="text-xs text-[#4A3F35] leading-relaxed p-3 rounded-xl bg-[#FAF7F2] border border-[#E7DFD4]">
                    <h4 className="font-semibold text-[#8C6D32] mb-1">Hoàn cảnh & Ký ức</h4>
                    <p className="whitespace-pre-line">{viewingMedia.storyContext}</p>
                  </div>
                )}

                {/* Linked People list */}
                {viewingMedia.personIds.length > 0 && (
                  <div className="pt-2 border-t border-stone-200">
                    <h4 className="text-xs font-semibold text-stone-600 mb-2 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-[#1B3B2B]" />
                      <span>Nhân vật liên quan ({viewingMedia.personIds.length})</span>
                    </h4>
                    <div className="space-y-1.5">
                      {viewingMedia.personIds.map((pId) => {
                        const p = peopleMap.get(pId);
                        if (!p) return null;
                        return (
                          <div
                            key={pId}
                            onClick={() => {
                              setViewingMedia(null);
                              onSelectPerson(pId);
                            }}
                            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-stone-100 cursor-pointer text-xs"
                          >
                            <HeritageAvatar
                              fullName={p.fullName}
                              portraitUrl={p.portraitUrl}
                              gender={p.gender}
                              size="xs"
                            />
                            <span className="font-medium text-[#1F1913] hover:text-[#1B3B2B] truncate">
                              {p.fullName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => { setDeleteError(null); setDeleteId(viewingMedia.id); }}
                  className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa kỷ vật</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingMedia(null)}
                  className="px-4 py-1.5 text-xs font-medium bg-[#1B3B2B] text-white rounded-xl"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Media Modal */}
      {addModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E7DFD4] pb-3">
              <h3 className="text-base font-serif font-bold text-[#1F1913]">
                Thêm Kỷ Vật / Tư Liệu Mới
              </h3>
              <button
                type="button"
                onClick={() => {
                  setAddModalOpen(false);
                  resetForm();
                }}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                {uploadError}
              </div>
            )}

            {/* Image Preview & Upload */}
            <div>
              <label className="block text-xs font-semibold text-[#54483C] mb-1">
                Tệp hình ảnh / tư liệu <span className="text-red-500">*</span>
              </label>
              {newDataUrl ? (
                <div className="relative rounded-xl border border-[#D5CABE] overflow-hidden bg-stone-100 aspect-16/9 flex items-center justify-center">
                  <img src={newDataUrl} alt="Preview" className="max-h-full object-contain" />
                  <button
                    type="button"
                    onClick={() => setNewDataUrl(null)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed border-[#D5CABE] hover:border-[#1B3B2B] bg-[#FAF8F5] cursor-pointer transition-colors">
                  <Camera className="w-8 h-8 text-stone-400 mb-2" />
                  <span className="text-xs font-semibold text-[#1B3B2B]">Chọn ảnh từ thiết bị</span>
                  <span className="text-[11px] text-stone-400 mt-0.5">JPG, PNG (Tự động nén tối ưu)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#54483C] mb-1">
                Tiêu đề kỷ vật <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="VD: Sắc phong triều Nguyễn năm 1904 / Ảnh đại gia đình"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 outline-none focus:border-[#1B3B2B]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#54483C] mb-1">Phân loại</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as MediaCategory)}
                  className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 outline-none focus:border-[#1B3B2B]"
                >
                  {(Object.keys(CATEGORY_LABELS) as MediaCategory[]).map((cat) => (
                    <option key={cat} value={cat}>
                      {CATEGORY_LABELS[cat]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#54483C] mb-1">
                  Niên đại / Thời kỳ
                </label>
                <input
                  type="text"
                  placeholder="VD: Xuân Canh Dần 1950 / Khoảng năm 1930"
                  value={newDateLabel}
                  onChange={(e) => setNewDateLabel(e.target.value)}
                  className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white px-3 py-2 outline-none focus:border-[#1B3B2B]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[#54483C] mb-1">Mô tả tư liệu</label>
              <textarea
                rows={2}
                placeholder="Mô tả hoàn cảnh, xuất xứ, nơi bảo quản..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full text-xs rounded-xl border border-[#D5CABE] bg-white p-2.5 outline-none focus:border-[#1B3B2B]"
              />
            </div>

            {/* People link multi-select */}
            <div>
              <label className="block text-xs font-medium text-[#54483C] mb-1">
                Gắn thẻ các thành viên có mặt / liên quan
              </label>
              <div className="max-h-32 overflow-y-auto rounded-xl border border-[#D5CABE] bg-white p-2 space-y-1">
                {people.map((p) => {
                  const isChecked = newSelectedPeople.includes(p.id);
                  return (
                    <label
                      key={p.id}
                      className="flex items-center gap-2 text-xs p-1 hover:bg-stone-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          setNewSelectedPeople((prev) =>
                            isChecked ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                          );
                        }}
                        className="accent-[#1B3B2B]"
                      />
                      <span>{p.fullName}</span>
                      {p.generation && (
                        <span className="text-[10px] text-stone-400">(Đời {p.generation})</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#E7DFD4]">
              <button
                type="button"
                onClick={() => {
                  setAddModalOpen(false);
                  resetForm();
                }}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveNewMedia}
                className="px-5 py-2 text-xs font-semibold bg-[#1B3B2B] text-white rounded-xl shadow-xs hover:bg-[#28503C]"
              >
                Lưu kỷ vật
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Xác nhận xóa kỷ vật"
        description="Xóa kỷ vật khỏi kho tư liệu gia tộc? Nếu kỷ vật đang dùng trong hồ sơ hoặc nhật ký, ứng dụng sẽ giữ lại."
        confirmLabel="Xóa kỷ vật"
        cancelLabel="Hủy"
        danger={true}
        onConfirm={handleDeleteMedia}
        onCancel={() => setDeleteId(null)}
      />

      {/* Audio Recorder Modal */}
      <AudioRecorderModal
        open={audioRecorderOpen}
        onClose={() => setAudioRecorderOpen(false)}
      />
    </div>
  );
};
