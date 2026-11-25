import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronDown,
  Edit3,
  FileDown,
  FileText,
  GitFork,
  Heart,
  Loader2,
  Lock,
  MapPin,
  Mic,
  MoreHorizontal,
  Printer,
  ShieldAlert,
  Sparkles,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  Volume2,
} from 'lucide-react';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import { HeritageAvatar } from '../../components/HeritageAvatar';
import { PrivacyPinModal } from '../../components/PrivacyPinModal';
import { useGenealogy } from '../../context/GenealogyContext';
import { usePrivacyShield } from '../../hooks/usePrivacyShield';
import { Person } from '../../models/genealogy';
import {
  exportPersonReportToPdfDirect,
  PersonReportData,
} from '../../services/personPdfReportService';
import { formatFlexibleDate, formatLifespan, formatLunarAnniversary } from '../../utils/dateUtils';
import { BiographySpeechPlayer } from './BiographySpeechPlayer';
import { PersonReportModal } from './PersonReportModal';
import { AudioRecorderModal } from '../gallery/AudioRecorderModal';
import { RelationshipEditorModal } from '../relationships/RelationshipEditorModal';

interface PersonProfileViewProps {
  personId: string;
  onBack: () => void;
  onSelectPerson: (personId: string) => void;
  onEditPerson: (person: Person) => void;
  onFocusInTree: (personId: string) => void;
  onOpenKinship?: (personId: string) => void;
  onOpenQr?: (person: Person) => void;
  onOpenReport?: (personId: string) => void;
}

export const PersonProfileView: React.FC<PersonProfileViewProps> = ({
  personId,
  onBack,
  onSelectPerson,
  onEditPerson,
  onFocusInTree,
  onOpenKinship,
  onOpenQr,
  onOpenReport,
}) => {
  const {
    getPersonById,
    getBranchById,
    getParents,
    getChildren,
    getSpouses,
    getSiblings,
    deletePerson,
    media,
    deleteMedia,
    lifeEvents,
    settings,
  } = useGenealogy();

  const { isShieldActive } = usePrivacyShield();
  const [relModalOpen, setRelModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [speechReaderOpen, setSpeechReaderOpen] = useState(false);
  const [speechAutoPlay, setSpeechAutoPlay] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [audioModalOpen, setAudioModalOpen] = useState(false);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [isExportingDirectPdf, setIsExportingDirectPdf] = useState(false);
  const [directPdfToast, setDirectPdfToast] = useState<string | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const person = getPersonById(personId);
  if (!person) {
    return (
      <div className="p-8 text-center space-y-3">
        <p className="text-stone-500 text-sm">Không tìm thấy hồ sơ thành viên này.</p>
        <button
          type="button"
          onClick={onBack}
          className="px-4 py-2 text-xs font-semibold bg-[#1B3B2B] text-white rounded-xl"
        >
          Quay lại danh sách
        </button>
      </div>
    );
  }

  const branch = person.branchId ? getBranchById(person.branchId) : undefined;
  const parents = getParents(person.id);
  const children = getChildren(person.id);
  const spouses = getSpouses(person.id);
  const siblings = getSiblings(person.id);
  const personAudios = media.filter(
    (m) => m.category === 'audio' && m.personIds.includes(person.id)
  );

  const reportData = useMemo<PersonReportData | null>(() => {
    if (!person) return null;
    const personLifeEvents = lifeEvents ? lifeEvents.filter((e) => e.personId === person.id) : [];

    return {
      person,
      branch,
      parents,
      spouses,
      children,
      siblings,
      lifeEvents: personLifeEvents,
      settings,
    };
  }, [person, branch, parents, spouses, children, siblings, lifeEvents, settings]);

  const handleDirectExportPdf = async () => {
    if (!reportData) return;
    try {
      setIsExportingDirectPdf(true);
      setDirectPdfToast('Đang kết xuất tệp PDF qua thư viện jsPDF...');
      await exportPersonReportToPdfDirect(reportData);
      setDirectPdfToast(`Đã xuất và tải xuống hồ sơ PDF của ${person.fullName} thành công!`);
      setTimeout(() => setDirectPdfToast(null), 4500);
    } catch (err) {
      console.error('Lỗi khi xuất PDF:', err);
      setDirectPdfToast('Có lỗi khi tạo PDF. Đang mở cửa sổ xem trước & in...');
      setTimeout(() => {
        setDirectPdfToast(null);
        setReportModalOpen(true);
      }, 1500);
    } finally {
      setIsExportingDirectPdf(false);
    }
  };

  const handleDelete = async () => {
    await deletePerson(person.id);
    onBack();
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12 animate-in fade-in">
      {/* Top Bar with Back and Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E7DFD4] text-xs font-semibold text-[#54483C] hover:bg-stone-100 transition-colors self-start"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại</span>
        </button>

        <div className="flex items-center gap-2">
          {/* Quick Primary Actions */}
          <button
            type="button"
            onClick={() => onEditPerson(person)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#1B3B2B] text-white hover:bg-[#28503C] text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Sửa hồ sơ</span>
          </button>

          <button
            type="button"
            onClick={() => onFocusInTree(person.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#EAF2ED] text-[#1B3B2B] hover:bg-[#D7E6DD] text-xs font-semibold transition-colors cursor-pointer"
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Xem trên cây</span>
          </button>

          {/* More Actions Dropdown Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setProfileMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white border border-[#D5CABE] text-[#54483C] hover:bg-stone-50 text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              title="Thao tác khác"
              aria-expanded={profileMenuOpen}
              aria-haspopup="true"
            >
              <MoreHorizontal className="w-4 h-4 text-[#54483C]" />
              <span className="hidden sm:inline">Khác</span>
              <ChevronDown className="w-3 h-3 text-stone-400" />
            </button>

            {profileMenuOpen && (
              <div className="absolute right-0 top-full mt-1.5 w-56 rounded-2xl bg-white border border-[#E7DFD4] shadow-xl py-1.5 z-30 animate-in fade-in zoom-in-95">
                {/* Group 1: Phả ký & Xuất bản */}
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Phả ký & Xuất bản
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    if (onOpenReport) {
                      onOpenReport(person.id);
                    } else {
                      setReportModalOpen(true);
                    }
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#33281E] hover:bg-[#FAF7F2] transition-colors cursor-pointer text-left"
                >
                  <Printer className="w-3.5 h-3.5 text-[#8C6D32]" />
                  <span>In phả ký cá nhân</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    handleDirectExportPdf();
                  }}
                  disabled={isExportingDirectPdf}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#33281E] hover:bg-[#FAF7F2] transition-colors cursor-pointer text-left disabled:opacity-50"
                >
                  <FileDown className="w-3.5 h-3.5 text-[#8C6D32]" />
                  <span>{isExportingDirectPdf ? 'Đang xuất PDF...' : 'Xuất file PDF trực tiếp'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setSpeechReaderOpen((prev) => !prev);
                    setSpeechAutoPlay(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#33281E] hover:bg-[#FAF7F2] transition-colors cursor-pointer text-left"
                >
                  <Volume2 className="w-3.5 h-3.5 text-[#8C6D32]" />
                  <span>Nghe đọc tiểu sử</span>
                </button>

                <div className="h-px bg-stone-100 my-1" />

                {/* Group 2: Quan hệ & Kỷ vật */}
                <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  Thân tộc & Kỷ vật
                </div>

                {onOpenKinship && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      onOpenKinship(person.id);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#33281E] hover:bg-[#FAF7F2] transition-colors cursor-pointer text-left"
                  >
                    <Users className="w-3.5 h-3.5 text-[#1B3B2B]" />
                    <span>Tra xưng hô họ hàng</span>
                  </button>
                )}

                {onOpenQr && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      onOpenQr(person);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#33281E] hover:bg-[#FAF7F2] transition-colors cursor-pointer text-left"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#8C6D32]" />
                    <span>Tạo mã QR hồ sơ</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setAudioModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#33281E] hover:bg-[#FAF7F2] transition-colors cursor-pointer text-left"
                >
                  <Mic className="w-3.5 h-3.5 text-[#8C6D32]" />
                  <span>Thu âm ký ức / lời dặn</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setRelModalOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#33281E] hover:bg-[#FAF7F2] transition-colors cursor-pointer text-left"
                >
                  <UserPlus className="w-3.5 h-3.5 text-[#1B3B2B]" />
                  <span>Quản lý quan hệ thân tộc</span>
                </button>

                <div className="h-px bg-stone-100 my-1" />

                {/* Group 3: Nguy hiểm */}
                <button
                  type="button"
                  onClick={() => {
                    setProfileMenuOpen(false);
                    setDeleteConfirmOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-red-600 hover:bg-red-50 transition-colors cursor-pointer text-left"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                  <span>Xóa hồ sơ thành viên</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Web Speech Biography Narration Player */}
      {speechReaderOpen && (
        <BiographySpeechPlayer
          person={person}
          branchName={branch?.name}
          onClose={() => setSpeechReaderOpen(false)}
          autoPlay={speechAutoPlay}
        />
      )}

      {/* Direct PDF Export Feedback Notification */}
      {directPdfToast && (
        <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-medium flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{directPdfToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setDirectPdfToast(null)}
            className="text-emerald-700 hover:text-emerald-900 text-[11px] font-semibold underline px-1"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Hero Card */}
      <div className="rounded-3xl bg-[#FFFDF9] border border-[#E7DFD4] p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <HeritageAvatar
            fullName={person.fullName}
            portraitUrl={person.portraitUrl}
            gender={person.gender}
            size="xl"
            isLiving={person.isLiving}
            className="w-28 h-28 text-2xl border-4"
          />

          <div className="flex-1 text-center sm:text-left space-y-2">
            {/* Zero-Pill Unboxed Editorial Metadata */}
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 text-xs font-semibold tracking-wide">
              {person.generation && (
                <span className="text-[#1B3B2B] font-bold">
                  Đời thứ {person.generation}
                </span>
              )}
              {branch && (
                <>
                  <span aria-hidden="true" className="text-stone-300">·</span>
                  <span className="text-[#54483C]">{branch.name}</span>
                </>
              )}
              {person.subBranch && (
                <>
                  <span aria-hidden="true" className="text-stone-300">·</span>
                  <span className="text-stone-600">Phái {person.subBranch}</span>
                </>
              )}
              {person.clanRole && (
                <>
                  <span aria-hidden="true" className="text-stone-300">·</span>
                  <span className="text-[#8C6D32] font-bold">{person.clanRole}</span>
                </>
              )}
              <span aria-hidden="true" className="text-stone-300">·</span>
              <span className={person.isLiving ? 'text-emerald-700' : 'text-stone-500'}>
                {person.isLiving ? 'Hiện tiền (Còn sống)' : 'Đã tạ thế'}
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#1F1913] tracking-tight">
              {person.fullName}
            </h2>

            <p className="text-sm text-[#5C4F42]">
              {formatLifespan(person.birthDate, person.deathDate, person.isLiving)}
            </p>

            {/* Traditional names */}
            {(person.commonName || person.tabooName || person.courtesyName || person.alias) && (
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1 text-xs text-[#7A6E60] pt-1 border-t border-stone-200">
                {person.commonName && (
                  <span>
                    Tên thường gọi: <strong className="text-[#33281E]">{person.commonName}</strong>
                  </span>
                )}
                {person.tabooName && (
                  <span>
                    Tên húy: <strong className="text-[#8C3A27]">{person.tabooName}</strong>
                  </span>
                )}
                {person.courtesyName && (
                  <span>
                    Tên tự: <strong className="text-[#1B3B2B]">{person.courtesyName}</strong>
                  </span>
                )}
                {person.alias && (
                  <span>
                    Bí danh: <strong className="text-[#33281E]">{person.alias}</strong>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Grid: 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column: Vietnamese Genealogy & Life Facts */}
        <div className="space-y-6">
          {/* Vietnamese Genealogy Card */}
          <div className="rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] p-5 space-y-4">
            <h3 className="text-sm font-serif font-bold text-[#1B3B2B] flex items-center gap-2 border-b border-[#E7DFD4] pb-2">
              <Sparkles className="w-4 h-4 text-[#C19B4C]" />
              <span>Đặc tính Gia phả & Tộc hệ</span>
            </h3>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-stone-500">Đời thứ trong gia tộc</dt>
                <dd className="font-semibold text-[#1F1913]">
                  {person.generation ? `Đời thứ ${person.generation}` : 'Chưa rõ'}
                </dd>
              </div>

              <div>
                <dt className="text-stone-500">Chi họ trực thuộc</dt>
                <dd className="font-semibold text-[#1F1913]">{branch?.name || 'Chưa phân chi'}</dd>
              </div>

              <div>
                <dt className="text-stone-500">Phái</dt>
                <dd className="font-semibold text-[#1F1913]">{person.subBranch || 'Chưa rõ'}</dd>
              </div>

              <div>
                <dt className="text-stone-500">Vai vế</dt>
                <dd className="font-semibold text-[#1F1913]">{person.clanRole || 'Thành viên'}</dd>
              </div>

              {!person.isLiving && (
                <div className="sm:col-span-2 p-2.5 rounded-xl bg-[#FAF5EB] border border-[#E8DDCD]">
                  <dt className="text-[#8C6D32] font-semibold flex items-center gap-1.5 mb-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Lễ giỗ Âm lịch hàng năm</span>
                  </dt>
                  <dd className="text-[#4A3B2C]">
                    {formatLunarAnniversary(person.deathAnniversaryLunar)}
                  </dd>
                </div>
              )}

              {!person.isLiving && person.burialPlace && (
                <div className="sm:col-span-2">
                  <dt className="text-stone-500 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Nơi an táng / Mộ phần</span>
                  </dt>
                  <dd className="font-medium text-[#1F1913]">{person.burialPlace}</dd>
                </div>
              )}
            </dl>

            {person.merits && (
              <div className="pt-2 border-t border-stone-200">
                <h4 className="text-xs font-semibold text-[#8C6D32] mb-1">
                  Công đức & Đóng góp cho dòng tộc
                </h4>
                <p className="text-xs text-[#4A3F35] leading-relaxed whitespace-pre-line bg-[#FAF7F2] p-3 rounded-xl border border-[#E7DFD4]">
                  {person.merits}
                </p>
              </div>
            )}
          </div>

          {/* Life facts and Biography */}
          <div className="rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] p-5 space-y-4">
            <h3 className="text-sm font-serif font-bold text-[#1B3B2B] flex items-center gap-2 border-b border-[#E7DFD4] pb-2">
              <MapPin className="w-4 h-4 text-[#C19B4C]" />
              <span>Sinh thời & Nơi chốn</span>
            </h3>

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <dt className="text-stone-500">Ngày sinh</dt>
                <dd className="font-medium text-[#1F1913]">
                  {formatFlexibleDate(person.birthDate)}
                </dd>
              </div>

              <div>
                <dt className="text-stone-500">Nơi sinh</dt>
                <dd className="font-medium text-[#1F1913]">{person.birthPlace || 'Chưa rõ'}</dd>
              </div>

              <div>
                <dt className="text-stone-500">Nguyên quán</dt>
                <dd className="font-medium text-[#1F1913]">{person.ancestralHome || 'Chưa rõ'}</dd>
              </div>

              <div>
                <dt className="text-stone-500">Nơi cư trú</dt>
                <dd className="font-medium text-[#1F1913]">
                  {isShieldActive && person.isLiving ? (
                    <button
                      type="button"
                      onClick={() => setPinModalOpen(true)}
                      className="inline-flex items-center gap-1 text-amber-800 hover:text-amber-900 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 text-[11px] font-semibold"
                      title="Bấm để nhập mã PIN mở khóa"
                    >
                      <Lock className="w-3 h-3 text-amber-600" />
                      <span>[Đang bảo vệ riêng tư]</span>
                    </button>
                  ) : (
                    person.residence || 'Chưa rõ'
                  )}
                </dd>
              </div>

              <div>
                <dt className="text-stone-500">Nghề nghiệp</dt>
                <dd className="font-medium text-[#1F1913]">
                  {isShieldActive && person.isLiving ? (
                    <button
                      type="button"
                      onClick={() => setPinModalOpen(true)}
                      className="inline-flex items-center gap-1 text-amber-800 hover:text-amber-900 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 text-[11px] font-semibold"
                      title="Bấm để nhập mã PIN mở khóa"
                    >
                      <Lock className="w-3 h-3 text-amber-600" />
                      <span>[Đang bảo vệ riêng tư]</span>
                    </button>
                  ) : (
                    person.occupation || 'Chưa rõ'
                  )}
                </dd>
              </div>
            </dl>

            {person.biography ? (
              <div className="pt-2 border-t border-stone-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-stone-600">Tiểu sử & Ký ức</h4>
                  <button
                    type="button"
                    onClick={() => {
                      setSpeechReaderOpen(true);
                      setSpeechAutoPlay(true);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FAF7F2] border border-[#E7DFD4] text-[11px] font-semibold text-[#1B3B2B] hover:bg-[#EAF2ED] transition-colors"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-[#C19B4C]" />
                    <span>Nghe đọc</span>
                  </button>
                </div>
                <p className="text-xs text-[#4A3F35] leading-relaxed whitespace-pre-line bg-[#FAF7F2] p-3 rounded-xl border border-[#E7DFD4]">
                  {person.biography}
                </p>
              </div>
            ) : (
              <div className="pt-2 border-t border-stone-200 flex items-center justify-between text-xs text-stone-400 italic">
                <span>Chưa có văn bản tiểu sử chi tiết.</span>
                <button
                  type="button"
                  onClick={() => {
                    setSpeechReaderOpen(true);
                    setSpeechAutoPlay(true);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className="not-italic inline-flex items-center gap-1 text-[11px] font-semibold text-[#1B3B2B] hover:underline"
                >
                  <Volume2 className="w-3.5 h-3.5 text-[#C19B4C]" />
                  <span>Đọc phả ký tổng hợp</span>
                </button>
              </div>
            )}

            {/* Audio Memories Section */}
            <div className="pt-3 border-t border-stone-200 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-[#8C6D32]" />
                  <span>Ký ức Giọng nói & Lời dặn ({personAudios.length})</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setAudioModalOpen(true)}
                  className="text-[11px] font-semibold text-[#1B3B2B] hover:underline"
                >
                  + Thu âm mới
                </button>
              </div>

              {personAudios.length === 0 ? (
                <div className="p-3 rounded-xl bg-[#FAF7F2] border border-[#E7DFD4] text-center space-y-1">
                  <p className="text-[11px] text-stone-500">Chưa có bản ghi âm giọng nói nào.</p>
                  <button
                    type="button"
                    onClick={() => setAudioModalOpen(true)}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8C6D32] hover:underline"
                  >
                    <Mic className="w-3 h-3" />
                    <span>Thu âm giọng nói hoặc lời dặn của người này ngay</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {personAudios.map((aud) => (
                    <div
                      key={aud.id}
                      className="p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E7DFD4] space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-serif font-bold text-[#1F1913] truncate">
                          {aud.title}
                        </span>
                        {aud.dateLabel && (
                          <span className="text-[10px] text-stone-400">{aud.dateLabel}</span>
                        )}
                      </div>
                      {aud.description && (
                        <p className="text-[11px] text-stone-600 italic">{aud.description}</p>
                      )}
                      <audio controls src={aud.dataUrl} className="w-full h-8 mt-1" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Family Relationships */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E7DFD4] pb-2">
              <h3 className="text-sm font-serif font-bold text-[#1B3B2B] flex items-center gap-2">
                <Users className="w-4 h-4 text-[#C19B4C]" />
                <span>Gia đình & Thân tộc</span>
              </h3>
              <button
                type="button"
                onClick={() => setRelModalOpen(true)}
                className="text-xs text-[#1B3B2B] font-semibold hover:underline"
              >
                + Thêm / Sửa
              </button>
            </div>

            {/* Parents */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">Cha & Mẹ</h4>
              {parents.length === 0 ? (
                <p className="text-xs text-stone-400 italic">Chưa ghi nhận cha mẹ.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {parents.map(({ relationship, parent }) => (
                    <div
                      key={relationship.id}
                      onClick={() => onSelectPerson(parent.id)}
                      className="flex items-center gap-2.5 p-2 rounded-xl border border-[#E7DFD4] bg-white hover:bg-stone-50 cursor-pointer transition-colors"
                    >
                      <HeritageAvatar
                        fullName={parent.fullName}
                        portraitUrl={parent.portraitUrl}
                        gender={parent.gender}
                        size="sm"
                      />
                      <div className="truncate">
                        <p className="text-xs font-bold text-[#1F1913] truncate">{parent.fullName}</p>
                        <p className="text-[10px] text-stone-500">
                          {parent.gender === 'male' ? 'Cha' : 'Mẹ'} •{' '}
                          {relationship.lineageType === 'adoptive' ? 'Nuôi' : 'Ruột'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Spouses */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Vợ / Chồng
              </h4>
              {spouses.length === 0 ? (
                <p className="text-xs text-stone-400 italic">Chưa ghi nhận bạn đời.</p>
              ) : (
                <div className="space-y-2">
                  {spouses.map(({ union, spouse }) => (
                    <div
                      key={union.id}
                      onClick={() => spouse && onSelectPerson(spouse.id)}
                      className={`flex items-center justify-between p-2 rounded-xl border border-[#E7DFD4] bg-white ${
                        spouse ? 'hover:bg-stone-50 cursor-pointer' : ''
                      } transition-colors`}
                    >
                      <div className="flex items-center gap-2.5">
                        <HeritageAvatar
                          fullName={spouse?.fullName || 'Chưa rõ'}
                          portraitUrl={spouse?.portraitUrl}
                          gender={spouse?.gender}
                          size="sm"
                        />
                        <div>
                          <p className="text-xs font-bold text-[#1F1913]">
                            {spouse?.fullName || 'Chưa rõ danh tính'}
                          </p>
                          <p className="text-[10px] text-stone-500">
                            {union.marriageOrder === 1
                              ? 'Chính thất (Lần 1)'
                              : union.marriageOrder === 2
                              ? 'Kế thất / Tục huyền'
                              : `Hôn phối lần ${union.marriageOrder || 1}`}
                          </p>
                        </div>
                      </div>
                      <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-100 mr-2" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Children */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Con cái ({children.length})
              </h4>
              {children.length === 0 ? (
                <p className="text-xs text-stone-400 italic">Chưa ghi nhận con cái.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {children.map(({ relationship, child }) => (
                    <div
                      key={relationship.id}
                      onClick={() => onSelectPerson(child.id)}
                      className="flex items-center gap-2.5 p-2 rounded-xl border border-[#E7DFD4] bg-white hover:bg-stone-50 cursor-pointer transition-colors"
                    >
                      <HeritageAvatar
                        fullName={child.fullName}
                        portraitUrl={child.portraitUrl}
                        gender={child.gender}
                        size="sm"
                      />
                      <div className="truncate">
                        <p className="text-xs font-bold text-[#1F1913] truncate">{child.fullName}</p>
                        <p className="text-[10px] text-stone-500">
                          {child.gender === 'male' ? 'Con trai' : 'Con gái'}
                          {child.generation ? ` • Đời ${child.generation}` : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Siblings */}
            {siblings.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-stone-100">
                <h4 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Anh chị em ({siblings.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {siblings.map((sib) => (
                    <div
                      key={sib.id}
                      onClick={() => onSelectPerson(sib.id)}
                      className="flex items-center gap-2.5 p-2 rounded-xl border border-[#E7DFD4] bg-white hover:bg-stone-50 cursor-pointer transition-colors"
                    >
                      <HeritageAvatar
                        fullName={sib.fullName}
                        portraitUrl={sib.portraitUrl}
                        gender={sib.gender}
                        size="sm"
                      />
                      <div className="truncate">
                        <p className="text-xs font-bold text-[#1F1913] truncate">{sib.fullName}</p>
                        <p className="text-[10px] text-stone-500">
                          {sib.gender === 'male' ? 'Anh/Em trai' : 'Chị/Em gái'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Relationship Editor Modal */}
      <RelationshipEditorModal
        person={person}
        open={relModalOpen}
        onClose={() => setRelModalOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        title={`Xác nhận xóa thành viên "${person.fullName}"`}
        description={`Bạn có chắc chắn muốn xóa hồ sơ của ${person.fullName} khỏi gia phả?\n\nLưu ý quan trọng:\n- Các quan hệ cha mẹ, hôn phối và con cái liên quan sẽ được tự động gỡ bỏ an toàn.\n- KHÔNG xóa bất kỳ hồ sơ cha mẹ, con cái hay bạn đời nào khác.`}
        confirmLabel="Xóa an toàn"
        cancelLabel="Giữ lại"
        danger={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
      />

      {/* Individual Formatted PDF Report Modal */}
      <PersonReportModal
        personId={person.id}
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        onSelectPerson={onSelectPerson}
      />

      {/* Audio Recorder Modal */}
      <AudioRecorderModal
        open={audioModalOpen}
        onClose={() => setAudioModalOpen(false)}
        initialPersonId={person.id}
      />

      {/* Privacy Pin Unlock Modal */}
      <PrivacyPinModal
        open={pinModalOpen}
        onClose={() => setPinModalOpen(false)}
        defaultMode="unlock"
      />
    </div>
  );
};
