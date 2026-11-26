import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  Landmark,
  Calendar,
  Camera,
  Mic,
  Plus,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { HeritageAvatar } from '../../components/HeritageAvatar';
import { useGenealogy } from '../../context/GenealogyContext';
import { Media, MediaCategory, NavigationTab } from '../../models/genealogy';
import { compressImageFile } from '../../utils/imageUtils';
import { AudioRecorderModal } from './AudioRecorderModal';

const ExhibitionHall = lazy(() => import('./ExhibitionHall'));

interface GalleryPageProps {
  onNavigate: (tab: NavigationTab) => void;
  onSelectPerson: (personId: string) => void;
  entryRequest?: { view: 'hall' | 'archive'; sequence: number };
  onViewChange?: (view: 'hall' | 'archive') => void;
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

const filterClass = 'mt-1 min-h-11 min-w-0 w-full rounded-xl border border-[#D5CABE] bg-[#FAF8F5] px-2.5 text-base text-[#2C241C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 sm:text-sm';

export const GalleryPage: React.FC<GalleryPageProps> = ({ onNavigate, onSelectPerson, entryRequest, onViewChange }) => {
  const { media, people, saveMedia, deleteMedia } = useGenealogy();

  const [archiveOpen, setArchiveOpen] = useState(entryRequest?.view !== 'hall');
  useEffect(() => {
    if (entryRequest) setArchiveOpen(entryRequest.view === 'archive');
  }, [entryRequest]);
  const changeArchiveView = (open: boolean) => {
    setArchiveOpen(open);
    onViewChange?.(open ? 'archive' : 'hall');
  };
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPersonFilter, setSelectedPersonFilter] = useState<string>('all');
  const [viewingMedia, setViewingMedia] = useState<Media | null>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [audioRecorderOpen, setAudioRecorderOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const uploadRevision = useRef(0);
  const archiveHeadingRef = useRef<HTMLHeadingElement>(null);
  const viewerCloseRef = useRef<HTMLButtonElement>(null);
  const uploadCloseRef = useRef<HTMLButtonElement>(null);

  // New Media Form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<MediaCategory>('historical_photo');
  const [newDateLabel, setNewDateLabel] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newStoryContext, setNewStoryContext] = useState('');
  const [newSelectedPeople, setNewSelectedPeople] = useState<string[]>([]);
  const [draftImage, setDraftImage] = useState<{ dataUrl: string; mimeType: string } | null>(null);
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

  const categoryCounts = useMemo(() => {
    const counts = new Map<MediaCategory, number>();
    for (const item of media) counts.set(item.category, (counts.get(item.category) ?? 0) + 1);
    return counts;
  }, [media]);

  const hasFilters = selectedCategory !== 'all' || selectedPersonFilter !== 'all';
  const clearFilters = () => {
    setSelectedCategory('all');
    setSelectedPersonFilter('all');
  };

  useEffect(() => {
    if (archiveOpen) archiveHeadingRef.current?.focus();
  }, [archiveOpen]);

  useEffect(() => {
    const closeButton = addModalOpen ? uploadCloseRef.current : viewingMedia ? viewerCloseRef.current : null;
    if (!closeButton) return;
    const trigger = document.activeElement;
    closeButton.focus();
    return () => {
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus();
    };
  }, [addModalOpen, viewingMedia]);

  const resetForm = () => {
    uploadRevision.current += 1;
    setNewTitle('');
    setNewCategory('historical_photo');
    setNewDateLabel('');
    setNewDescription('');
    setNewStoryContext('');
    setNewSelectedPeople([]);
    setDraftImage(null);
    setUploadError(null);
    setIsPreparing(false);
  };

  const closeUpload = () => {
    if (isSaving) return;
    setAddModalOpen(false);
    resetForm();
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    const revision = ++uploadRevision.current;
    setIsPreparing(true);
    setUploadError(null);
    try {
      const compressed = await compressImageFile(file, 1200, 0.85);
      if (revision !== uploadRevision.current) return;
      setDraftImage({ dataUrl: compressed.dataUrl, mimeType: compressed.mimeType });
      setNewTitle((current) => current || file.name.replace(/\.[^/.]+$/, ''));
    } catch {
      if (revision === uploadRevision.current) setUploadError('Không thể xử lý ảnh. Hãy thử một tệp JPG hoặc PNG khác.');
    } finally {
      if (revision === uploadRevision.current) setIsPreparing(false);
    }
  };

  const handleSaveNewMedia = async () => {
    if (isSaving || isPreparing) return;
    if (!newTitle.trim() || !draftImage) {
      setUploadError('Vui lòng chọn ảnh và nhập tiêu đề kỷ vật.');
      return;
    }

    const newItem: Media = {
      id: 'media_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      title: newTitle.trim(),
      category: newCategory,
      dateLabel: newDateLabel.trim() || undefined,
      description: newDescription.trim() || undefined,
      storyContext: newStoryContext.trim() || undefined,
      mimeType: draftImage.mimeType,
      dataUrl: draftImage.dataUrl,
      personIds: newSelectedPeople,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsSaving(true);
    setUploadError(null);
    try {
      await saveMedia(newItem);
      setAddModalOpen(false);
      resetForm();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Không thể lưu kỷ vật. Vui lòng thử lại.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMedia = async () => {
    if (!deleteId || isDeleting) return;
    setIsDeleting(true);
    try {
      await deleteMedia(deleteId);
      if (viewingMedia?.id === deleteId) setViewingMedia(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'Không thể xóa kỷ vật.');
      setViewingMedia(null);
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  if (!archiveOpen) {
    return (
      <Suspense fallback={<p role="status" className="px-4 py-6">Đang mở phòng trưng bày…</p>}>
        <ExhibitionHall
          key={entryRequest?.sequence}
          onNavigate={onNavigate}
          onSelectPerson={onSelectPerson}
          onOpenArchive={(item) => {
            changeArchiveView(true);
            setViewingMedia(item ?? null);
          }}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-w-0 space-y-4 pb-14 sm:space-y-6">
      <header className="rounded-2xl border border-forest-700 bg-forest-900 p-4 text-white sm:rounded-3xl sm:p-6 lg:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <button
              type="button"
              onClick={() => changeArchiveView(false)}
              disabled={Boolean(viewingMedia || deleteId) || addModalOpen || audioRecorderOpen}
              className="mb-3 inline-flex min-h-11 items-center gap-2 rounded-lg border border-[#DBC599]/40 bg-[#DBC599]/10 px-3 text-sm font-semibold text-[#F2E3C6] hover:bg-[#DBC599]/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DBC599]"
            >
              <Landmark className="size-4 shrink-0" aria-hidden="true" />
              Vào phòng trưng bày
            </button>
            <h2 ref={archiveHeadingRef} tabIndex={-1} className="heritage-display text-3xl sm:text-4xl lg:text-5xl">Kho kỷ vật</h2>
            <p className="mt-2 text-sm text-[#E6DFD5]">Ảnh, tư liệu và bản ghi âm của dòng họ</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              type="button"
              onClick={() => setAddModalOpen(true)}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-[#DBC599] px-2.5 text-xs font-bold text-forest-900 transition-colors hover:bg-[#E7D1A8] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DBC599] sm:px-4 sm:text-sm"
            >
              <Plus className="size-4 shrink-0" aria-hidden="true" />
              Thêm kỷ vật
            </button>
            <button
              type="button"
              onClick={() => setAudioRecorderOpen(true)}
              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/20 px-2.5 text-xs font-semibold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#DBC599] sm:px-4 sm:text-sm"
            >
              <Mic className="size-4 shrink-0 text-[#DBC599]" aria-hidden="true" />
              Ghi âm
            </button>
          </div>
        </div>
      </header>

      {deleteError && (
        <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-900">{deleteError}</p>
      )}

      <section aria-label="Lọc kỷ vật" className="grid min-w-0 grid-cols-2 gap-2 rounded-2xl border border-[#E7DFD4] bg-[#FFFDF9] p-3 sm:max-w-none sm:gap-4 sm:p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
        <label className="min-w-0 text-xs font-semibold text-stone-600">
          Loại kỷ vật
          <select
            value={selectedCategory}
            onChange={(event) => setSelectedCategory(event.target.value)}
            className={filterClass}
          >
            <option value="all">Tất cả ({media.length})</option>
            {(Object.keys(CATEGORY_LABELS) as MediaCategory[]).map((category) => (
              <option key={category} value={category}>
                {CATEGORY_LABELS[category]} ({categoryCounts.get(category) ?? 0})
              </option>
            ))}
          </select>
        </label>
        <label className="min-w-0 text-xs font-semibold text-stone-600">
          Người liên quan
          <select
            value={selectedPersonFilter}
            onChange={(event) => setSelectedPersonFilter(event.target.value)}
            className={filterClass}
          >
            <option value="all">Mọi thành viên</option>
            {people.map((person) => (
              <option key={person.id} value={person.id}>{person.fullName}</option>
            ))}
          </select>
        </label>
        <div className="col-span-2 flex items-center justify-between gap-2 lg:col-span-1 lg:self-end">
          <p role="status" className="text-sm text-stone-600">{filteredMedia.length} kỷ vật</p>
          {hasFilters && (
            <button type="button" onClick={clearFilters} className="min-h-11 rounded-lg px-2 text-xs font-semibold text-[#1B3B2B] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-forest-700 sm:text-sm">
              Xóa bộ lọc
            </button>
          )}
        </div>
      </section>

      {/* Gallery Grid */}
      {filteredMedia.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[#E7DFD4] bg-[#FFFDF9] p-6 text-center sm:p-10">
          <Camera className="mx-auto size-7 text-[#8C6D32]" aria-hidden="true" />
          <h3 className="mt-3 text-xl font-bold text-[#1F1913]">
            {hasFilters ? 'Không có kỷ vật phù hợp' : 'Kho chưa có kỷ vật'}
          </h3>
          <p className="mt-1 text-sm text-stone-600">
            {hasFilters ? 'Chọn loại tư liệu hoặc người liên quan khác.' : 'Thêm ảnh hoặc ghi âm từ thiết bị.'}
          </p>
          {!hasFilters && (
            <button type="button" onClick={() => setAddModalOpen(true)} className="mt-4 min-h-11 rounded-xl bg-forest-800 px-4 text-sm font-semibold text-white hover:bg-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700">
              Thêm kỷ vật
            </button>
          )}
        </div>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-3 min-[360px]:grid-cols-2 lg:grid-cols-3 lg:gap-5 xl:grid-cols-4">
          {filteredMedia.map((item) => (
            <article
              key={item.id}
              className="group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#E7DFD4] bg-[#FFFDF9] shadow-xs transition-colors hover:border-forest-600 focus-within:ring-2 focus-within:ring-forest-600"
            >
              <button
                type="button"
                onClick={() => setViewingMedia(item)}
                aria-label={'Xem kỷ vật: ' + item.title}
                aria-haspopup="dialog"
                className="absolute inset-0 z-10 rounded-2xl outline-none"
              />
              <div className="relative flex aspect-4/3 w-full items-center justify-center overflow-hidden bg-stone-100">
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
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none"
                  />
                )}
                <span className="absolute top-2 left-2 max-w-[calc(100%-1rem)] break-words rounded-md bg-black/75 px-2 py-0.5 text-[10px] font-semibold text-white">
                  {CATEGORY_LABELS[item.category] || item.category}
                </span>
              </div>

              <div className="flex flex-1 flex-col justify-between gap-2 p-3 sm:p-4">
                <div>
                  <h3 className="line-clamp-2 break-words font-serif text-base font-bold leading-snug text-[#1F1913] sm:text-xl">
                    {item.title}
                  </h3>
                  {item.dateLabel && (
                    <p className="text-[10px] text-[#8C6D32] font-medium flex items-center gap-1 mt-0.5">
                      <Calendar className="w-3 h-3" />
                      <span>{item.dateLabel}</span>
                    </p>
                  )}
                  {item.description && (
                    <p className="mt-1 line-clamp-2 break-words text-xs text-stone-600 sm:text-sm">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Linked People Avatars */}
                {item.personIds.length > 0 && (
                  <div className="flex flex-wrap items-center justify-between gap-1 border-t border-stone-100 pt-2">
                    <span className="text-xs text-stone-600">Gắn với {item.personIds.length} người</span>
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
            </article>
          ))}
        </div>
      )}

      {/* Lightbox / Media Viewer Modal */}
      {viewingMedia && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gallery-view-title"
          onKeyDown={(event) => {
            if (event.key === 'Escape' && !deleteId) {
              event.stopPropagation();
              setViewingMedia(null);
            }
          }}
        >
          <div
            className="flex max-h-[90dvh] w-full max-w-4xl flex-col overflow-y-auto rounded-2xl bg-[#FFFDF9] shadow-2xl md:flex-row md:overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Left: Media / Image / Audio Container */}
            <div className="relative flex shrink-0 items-center justify-center bg-forest-900 p-3 md:min-h-[420px] md:min-w-0 md:flex-1 md:p-6">
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
                  className="max-h-[40dvh] max-w-full rounded-lg object-contain md:max-h-[75dvh]"
                />
              )}
            </div>

            {/* Right: Info Panel */}
            <div className="flex w-full min-w-0 flex-col justify-between gap-4 bg-[#FFFDF9] p-4 md:w-80 md:overflow-y-auto md:border-l md:border-[#E7DFD4] md:p-6">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#1B3B2B]">
                    {CATEGORY_LABELS[viewingMedia.category]}
                  </span>
                  <button
                    type="button"
                    ref={viewerCloseRef}
                    aria-label="Đóng kỷ vật"
                    onClick={() => setViewingMedia(null)}
                    className="grid size-11 shrink-0 place-items-center rounded-lg text-stone-600 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-forest-700"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <h3 id="gallery-view-title" className="break-words text-xl font-serif font-bold leading-snug text-[#1F1913]">
                  {viewingMedia.title}
                </h3>

                {viewingMedia.dateLabel && (
                  <p className="text-xs text-[#8C6D32] font-semibold flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{viewingMedia.dateLabel}</span>
                  </p>
                )}

                {viewingMedia.description && (
                  <div className="break-words border-t border-stone-200 pt-2 text-sm leading-relaxed text-[#54483C]">
                    <h4 className="font-semibold text-stone-600 mb-1">Mô tả tư liệu</h4>
                    <p className="whitespace-pre-line">{viewingMedia.description}</p>
                  </div>
                )}

                {viewingMedia.storyContext && (
                  <div className="break-words rounded-xl border border-[#E7DFD4] bg-[#FAF7F2] p-3 text-sm leading-relaxed text-[#54483C]">
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
                          <button
                            key={pId}
                            type="button"
                            onClick={() => {
                              setViewingMedia(null);
                              onSelectPerson(pId);
                            }}
                            className="flex min-h-11 w-full items-center gap-2 rounded-xl p-1.5 text-left text-sm hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-forest-700"
                          >
                            <HeritageAvatar
                              fullName={p.fullName}
                              portraitUrl={p.portraitUrl}
                              gender={p.gender}
                              size="xs"
                            />
                            <span className="min-w-0 truncate font-medium text-[#1F1913] hover:text-[#1B3B2B]">
                              {p.fullName}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-stone-200 pt-2">
                <button
                  type="button"
                  onClick={() => { setDeleteError(null); setDeleteId(viewingMedia.id); }}
                  className="flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm text-rose-900 hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-rose-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa kỷ vật</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewingMedia(null)}
                  className="min-h-11 rounded-xl bg-forest-800 px-4 text-sm font-semibold text-white hover:bg-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700"
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
          aria-labelledby="gallery-upload-title"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              closeUpload();
            }
          }}
        >
          <div
            className="max-h-[90dvh] w-full max-w-lg space-y-4 overflow-y-auto rounded-2xl border border-[#E7DFD4] bg-[#FFFDF9] p-4 shadow-2xl sm:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#E7DFD4] pb-3">
              <h3 id="gallery-upload-title" className="text-xl font-serif font-bold text-[#1F1913]">
                Thêm kỷ vật
              </h3>
              <button
                type="button"
                ref={uploadCloseRef}
                aria-label="Đóng biểu mẫu thêm kỷ vật"
                disabled={isSaving}
                onClick={closeUpload}
                className="grid size-11 shrink-0 place-items-center rounded-lg text-stone-600 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-forest-700 disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {uploadError && (
              <div role="alert" className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-900">
                {uploadError}
              </div>
            )}

            <fieldset disabled={isSaving} className="min-w-0 space-y-4">
              {/* Image Preview & Upload */}
              <div>
                <label className="block text-xs font-semibold text-[#54483C] mb-1">
                  Tệp hình ảnh / tư liệu <span className="text-red-500">*</span>
                </label>
                {draftImage ? (
                  <div className="relative rounded-xl border border-[#D5CABE] overflow-hidden bg-stone-100 aspect-16/9 flex items-center justify-center">
                    <img src={draftImage.dataUrl} alt="Ảnh kỷ vật đã chọn" className="max-h-full object-contain" />
                    <button
                      type="button"
                      aria-label="Bỏ ảnh đã chọn"
                      onClick={() => setDraftImage(null)}
                      className="absolute right-2 top-2 grid size-11 place-items-center rounded-full bg-black/75 text-white hover:bg-black focus-visible:outline-2 focus-visible:outline-white"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#D5CABE] bg-[#FAF8F5] p-4 transition-colors hover:border-forest-600 focus-within:ring-2 focus-within:ring-forest-600">
                    <Camera className="w-8 h-8 text-stone-400 mb-2" />
                    <span className="text-sm font-semibold text-[#1B3B2B]">{isPreparing ? 'Đang xử lý ảnh…' : 'Chọn ảnh từ thiết bị'}</span>
                    <span className="text-[11px] text-stone-400 mt-0.5">JPG, PNG (Tự động nén tối ưu)</span>
                    <input
                      type="file"
                      accept="image/*"
                      aria-label="Chọn ảnh kỷ vật từ thiết bị"
                      onChange={handleFileUpload}
                      className="sr-only"
                    />
                  </label>
                )}
              </div>

              <div>
                <label htmlFor="gallery-title" className="block text-xs font-semibold text-[#54483C] mb-1">
                  Tiêu đề kỷ vật <span className="text-red-500">*</span>
                </label>
                <input
                  id="gallery-title"
                  type="text"
                  placeholder="VD: Sắc phong triều Nguyễn năm 1904 / Ảnh đại gia đình"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="min-h-11 w-full rounded-xl border border-[#D5CABE] bg-white px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 sm:text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="gallery-category" className="block text-xs font-medium text-[#54483C] mb-1">Phân loại</label>
                  <select
                  id="gallery-category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as MediaCategory)}
                    className="min-h-11 w-full rounded-xl border border-[#D5CABE] bg-white px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 sm:text-sm"
                  >
                    {(Object.keys(CATEGORY_LABELS) as MediaCategory[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="gallery-period" className="block text-xs font-medium text-[#54483C] mb-1">
                    Niên đại / Thời kỳ
                  </label>
                  <input
                  id="gallery-period"
                    type="text"
                    placeholder="VD: Xuân Canh Dần 1950 / Khoảng năm 1930"
                    value={newDateLabel}
                    onChange={(e) => setNewDateLabel(e.target.value)}
                    className="min-h-11 w-full rounded-xl border border-[#D5CABE] bg-white px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 sm:text-sm"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="gallery-description" className="block text-xs font-medium text-[#54483C] mb-1">Mô tả tư liệu</label>
                <textarea
                  id="gallery-description"
                  rows={2}
                  placeholder="Mô tả hoàn cảnh, xuất xứ, nơi bảo quản..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full rounded-xl border border-[#D5CABE] bg-white p-2.5 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 sm:text-sm"
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
                        className="flex min-h-11 cursor-pointer items-center gap-2 rounded px-2 text-sm hover:bg-stone-50"
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

            </fieldset>

            <div className="grid grid-cols-2 gap-2 border-t border-[#E7DFD4] pt-3">
              <button
                type="button"
                onClick={closeUpload}
                disabled={isSaving}
                className="min-h-11 rounded-xl border border-[#D5CABE] px-4 text-sm font-medium text-stone-600 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-forest-700 disabled:opacity-50"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSaveNewMedia}
                disabled={isPreparing || isSaving}
                className="min-h-11 rounded-xl bg-forest-800 px-4 text-sm font-semibold text-white hover:bg-forest-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-700 disabled:opacity-50"
              >
                {isSaving ? 'Đang lưu…' : 'Lưu kỷ vật'}
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
        busy={isDeleting}
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
