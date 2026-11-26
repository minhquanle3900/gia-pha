import React, { useId, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Download,
  FileDown,
  FileText,
  Heart,
  HelpCircle,
  MapPin,
  Maximize2,
  Printer,
  RotateCcw,
  Settings2,
  Sliders,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import { HeritageAvatar } from '../../components/HeritageAvatar';
import { useGenealogy } from '../../context/GenealogyContext';
import { Person } from '../../models/genealogy';
import {
  DEFAULT_REPORT_CONFIG,
  exportElementToPdf,
  generateStandalonePrintableHtml,
  PersonReportData,
  ReportConfig,
  buildTextDossierSummary,
} from '../../services/personPdfReportService';
import { formatFlexibleDate, formatLifespan, formatLunarAnniversary } from '../../utils/dateUtils';

interface PersonReportModalProps {
  personId: string | null;
  open: boolean;
  onClose: () => void;
  onSelectPerson?: (personId: string) => void;
}

export const PersonReportModal: React.FC<PersonReportModalProps> = ({
  personId,
  open,
  onClose,
  onSelectPerson,
}) => {
  const {
    getPersonById,
    getBranchById,
    getParents,
    getChildren,
    getSpouses,
    getSiblings,
    lifeEvents,
    settings,
  } = useGenealogy();

  const printAreaRef = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<ReportConfig>(DEFAULT_REPORT_CONFIG);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);

  const person = personId ? getPersonById(personId) : null;

  const reportData = useMemo<PersonReportData | null>(() => {
    if (!person) return null;
    const branch = person.branchId ? getBranchById(person.branchId) : undefined;
    const parents = getParents(person.id);
    const children = getChildren(person.id);
    const spouses = getSpouses(person.id);
    const siblings = getSiblings(person.id);
    const personLifeEvents = lifeEvents.filter((e) => e.personId === person.id);

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
  }, [person, getBranchById, getParents, getChildren, getSpouses, getSiblings, lifeEvents, settings]);

  if (!open || !person || !reportData) return null;

  // Theme palettes
  const themeStyles = {
    heritage: {
      border: 'border-[#1B3B2B]',
      innerBorder: 'border-[#8C6D32]/40',
      headerBg: 'bg-[#FAF7F2]',
      titleColor: 'text-[#1B3B2B]',
      accentColor: 'text-[#8C6D32]',
      subTextColor: 'text-[#5C4F42]',
      sectionBg: 'bg-[#FAF8F5]',
      badgeBg: 'bg-[#1B3B2B]',
      badgeText: 'text-[#FAF7F2]',
      tableHeaderBg: 'bg-[#F4EFE6]',
      sealBorder: 'border-[#8C6D32]',
      sealText: 'text-[#8C6D32]',
    },
    monochrome: {
      border: 'border-[#1F1913]',
      innerBorder: 'border-stone-400',
      headerBg: 'bg-stone-50',
      titleColor: 'text-stone-900',
      accentColor: 'text-stone-700',
      subTextColor: 'text-stone-600',
      sectionBg: 'bg-stone-50',
      badgeBg: 'bg-stone-800',
      badgeText: 'text-white',
      tableHeaderBg: 'bg-stone-200',
      sealBorder: 'border-stone-800',
      sealText: 'text-stone-800',
    },
    vermilion: {
      border: 'border-[#8C2A1E]',
      innerBorder: 'border-[#C5A059]/50',
      headerBg: 'bg-[#FFF9F5]',
      titleColor: 'text-[#8C2A1E]',
      accentColor: 'text-[#C5A059]',
      subTextColor: 'text-[#68473D]',
      sectionBg: 'bg-[#FFF8F3]',
      badgeBg: 'bg-[#8C2A1E]',
      badgeText: 'text-white',
      tableHeaderBg: 'bg-[#FCEFEA]',
      sealBorder: 'border-[#8C2A1E]',
      sealText: 'text-[#8C2A1E]',
    },
  }[config.theme];

  const handleNativePrint = () => {
    // Adds a temporary printable body class for clean scoping
    document.body.classList.add('printing-person-report');
    window.print();
    // Clean up
    setTimeout(() => {
      document.body.classList.remove('printing-person-report');
    }, 1000);
  };

  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    try {
      setIsExportingPdf(true);
      setExportMessage('Đang kết xuất tệp PDF độ phân giải cao...');
      const cleanFileName = `Ho_So_Gia_Pha_${person.fullName.replace(/\s+/g, '_')}`;
      await exportElementToPdf(printAreaRef.current, cleanFileName, config.paperSize);
      setExportMessage('Đã tải xuống tệp PDF thành công!');
      setTimeout(() => setExportMessage(null), 3000);
    } catch (err) {
      console.error('Lỗi xuất PDF:', err);
      setExportMessage('Trình duyệt không tạo được PDF theo bố cục này. Dùng nút "In / Lưu PDF" để lưu qua hộp thoại in.');
      setTimeout(() => setExportMessage(null), 4000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadHtml = () => {
    try {
      const htmlContent = generateStandalonePrintableHtml(reportData, config);
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Trich_Luc_Pha_Ky_${person.fullName.replace(/\s+/g, '_')}.html`;
      a.click();
      URL.revokeObjectURL(url);
      setExportMessage('Đã lưu tệp HTML bản in độc lập!');
      setTimeout(() => setExportMessage(null), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopyText = async () => {
    try {
      const text = buildTextDossierSummary(reportData);
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch (err) {
      console.error(err);
    }
  };

  const formattedDossierCode = `GPV-${person.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:overflow-visible"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl bg-[#FAF7F2] rounded-3xl border border-[#E7DFD4] shadow-2xl flex flex-col max-h-[94vh] overflow-hidden print:border-none print:shadow-none print:max-h-none print:rounded-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Control Bar (Hidden during print) */}
        <div className="print:hidden p-4 sm:px-6 bg-[#FFFDF9] border-b border-[#E7DFD4] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#1B3B2B] text-[#DBC599] flex items-center justify-center font-serif text-base font-bold shadow-xs">
              源
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-[#8C6D32]">
                  Trích lục Phả Ký
                </span>
                <span className="text-[10px] text-stone-400">·</span>
                <span className="text-[10px] text-stone-500 font-mono">{formattedDossierCode}</span>
              </div>
              <h2 className="text-base sm:text-lg font-serif font-bold text-[#1F1913] truncate max-w-xs sm:max-w-md">
                Bản In Hồ Sơ: {person.fullName}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* Toggle Configuration Drawer */}
            <button
              type="button"
              onClick={() => setShowConfigPanel((prev) => !prev)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors ${
                showConfigPanel
                  ? 'bg-[#1B3B2B] text-white border-[#1B3B2B]'
                  : 'bg-white border-[#D5CABE] text-[#1B3B2B] hover:bg-stone-50'
              }`}
              title="Tùy chỉnh định dạng trang và các mục hiển thị"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tùy biến bản in</span>
            </button>

            {/* Copy Text Summary */}
            <button
              type="button"
              onClick={handleCopyText}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D5CABE] text-[#54483C] hover:bg-stone-50 text-xs font-semibold transition-colors"
              title="Sao chép toàn bộ trích lục dạng văn bản"
            >
              {copiedText ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Sao chép chữ</span>
                </>
              )}
            </button>

            {/* Download Standalone HTML */}
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D5CABE] text-[#54483C] hover:bg-stone-50 text-xs font-semibold transition-colors"
              title="Tải tệp HTML độc lập để gửi hoặc in ngoại tuyến bất kỳ lúc nào"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>File HTML</span>
            </button>

            {/* Direct PDF Download */}
            <button
              type="button"
              disabled={isExportingPdf}
              onClick={handleDownloadPdf}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#8C6D32] hover:bg-[#785B28] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
              title="Tải trực tiếp tệp PDF tài liệu về máy"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Đang xuất PDF...' : 'Tải PDF (.pdf)'}</span>
            </button>

            {/* Native Browser Print to PDF (Vector Sharp) */}
            <button
              type="button"
              onClick={handleNativePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-[#1B3B2B] hover:bg-[#28503C] text-white text-xs font-semibold shadow-xs transition-colors"
              title="Mở hộp thoại In của trình duyệt (In máy in hoặc Lưu dưới dạng PDF vector)"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In / Lưu PDF</span>
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors ml-1"
              aria-label="Đóng cửa sổ"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status Toast / Alert if exporting */}
        {exportMessage && (
          <div className="print:hidden px-4 py-2 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 font-medium flex items-center justify-between animate-in fade-in">
            <span>{exportMessage}</span>
            <button
              type="button"
              onClick={() => setExportMessage(null)}
              className="text-amber-700 hover:underline text-[11px]"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Configuration Toolbar Panel (Expandable) */}
        {showConfigPanel && (
          <div className="print:hidden p-4 bg-[#FAF5EB] border-b border-[#E8DDCD] space-y-3 text-xs animate-in slide-in-from-top-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {/* Theme selector */}
              <div>
                <label className="block text-stone-600 font-semibold mb-1">Phong cách bản in</label>
                <select
                  value={config.theme}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      theme: e.target.value as ReportConfig['theme'],
                    }))
                  }
                  className="w-full px-2.5 py-1.5 rounded-xl bg-white border border-[#D5CABE] text-xs font-medium"
                >
                  <option value="heritage">Hoàng Gia Truyền Thống (Xanh rừng & Vàng đồng)</option>
                  <option value="monochrome">Mực Nho Khắc Bản (Đen trắng tiết kiệm mực)</option>
                  <option value="vermilion">Chu Sa Cổ Phục (Đỏ son & Kim nhũ)</option>
                </select>
              </div>

              {/* Paper Size */}
              <div>
                <label className="block text-stone-600 font-semibold mb-1">Khổ giấy in</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, paperSize: 'a4' }))}
                    className={`flex-1 py-1.5 rounded-xl font-semibold border ${
                      config.paperSize === 'a4'
                        ? 'bg-[#1B3B2B] text-white border-[#1B3B2B]'
                        : 'bg-white text-stone-700 border-stone-200'
                    }`}
                  >
                    A4 (Tiêu chuẩn VN)
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, paperSize: 'letter' }))}
                    className={`flex-1 py-1.5 rounded-xl font-semibold border ${
                      config.paperSize === 'letter'
                        ? 'bg-[#1B3B2B] text-white border-[#1B3B2B]'
                        : 'bg-white text-stone-700 border-stone-200'
                    }`}
                  >
                    Letter (US)
                  </button>
                </div>
              </div>

              {/* Density */}
              <div>
                <label className="block text-stone-600 font-semibold mb-1">Độ chi tiết</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, density: 'complete' }))}
                    className={`flex-1 py-1.5 rounded-xl font-semibold border ${
                      config.density === 'complete'
                        ? 'bg-[#1B3B2B] text-white border-[#1B3B2B]'
                        : 'bg-white text-stone-700 border-stone-200'
                    }`}
                  >
                    Đầy đủ chi tiết
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, density: 'compact' }))}
                    className={`flex-1 py-1.5 rounded-xl font-semibold border ${
                      config.density === 'compact'
                        ? 'bg-[#1B3B2B] text-white border-[#1B3B2B]'
                        : 'bg-white text-stone-700 border-stone-200'
                    }`}
                  >
                    Rút gọn (1 trang)
                  </button>
                </div>
              </div>

              {/* Reset to defaults */}
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => setConfig(DEFAULT_REPORT_CONFIG)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-[#D5CABE] text-[#54483C] hover:bg-stone-50 font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Khôi phục mặc định</span>
                </button>
              </div>
            </div>

            {/* Section Toggles */}
            <div className="pt-2 border-t border-[#E8DDCD]">
              <span className="block text-[11px] font-bold text-stone-600 mb-2 uppercase tracking-wider">
                Các phần hiển thị trên bản in:
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2 text-[11px]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showPortrait}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, showPortrait: e.target.checked }))
                    }
                    className="rounded text-[#1B3B2B]"
                  />
                  <span>Ảnh chân dung</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showTraditionalNames}
                    onChange={(e) =>
                      setConfig((prev) => ({ ...prev, showTraditionalNames: e.target.checked }))
                    }
                    className="rounded text-[#1B3B2B]"
                  />
                  <span>Tên Húy & Tên Tự</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showBio}
                    onChange={(e) => setConfig((prev) => ({ ...prev, showBio: e.target.checked }))}
                    className="rounded text-[#1B3B2B]"
                  />
                  <span>Tiểu sử hành trạng</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showMerits}
                    onChange={(e) => setConfig((prev) => ({ ...prev, showMerits: e.target.checked }))}
                    className="rounded text-[#1B3B2B]"
                  />
                  <span>Công đức dòng họ</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showParents}
                    onChange={(e) => setConfig((prev) => ({ ...prev, showParents: e.target.checked }))}
                    className="rounded text-[#1B3B2B]"
                  />
                  <span>Thân phụ & Mẹ</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showSpouses}
                    onChange={(e) => setConfig((prev) => ({ ...prev, showSpouses: e.target.checked }))}
                    className="rounded text-[#1B3B2B]"
                  />
                  <span>Hôn phối (Vợ/Chồng)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showChildren}
                    onChange={(e) => setConfig((prev) => ({ ...prev, showChildren: e.target.checked }))}
                    className="rounded text-[#1B3B2B]"
                  />
                  <span>Hậu duệ (Con cái)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showSiblings}
                    onChange={(e) => setConfig((prev) => ({ ...prev, showSiblings: e.target.checked }))}
                    className="rounded text-[#1B3B2B]"
                  />
                  <span>Anh chị em ruột</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showAncestral}
                    onChange={(e) => setConfig((prev) => ({ ...prev, showAncestral: e.target.checked }))}
                    className="rounded text-[#1B3B2B]"
                  />
                  <span>Lễ giỗ & Mộ phần</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.showSignatures}
                    onChange={(e) => setConfig((prev) => ({ ...prev, showSignatures: e.target.checked }))}
                    className="rounded text-[#1B3B2B]"
                  />
                  <span>Khung triện & Chữ ký</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Scrollable Document Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#FAF7F2] print:p-0 print:bg-white print:overflow-visible">
          {/* ========================================================================= */}
          {/* THE PRINTABLE REPORT SHEET CONTAINER */}
          {/* ========================================================================= */}
          <div
            id="printable-person-report"
            ref={printAreaRef}
            className={`max-w-[780px] mx-auto bg-[#FFFDF9] border-4 ${themeStyles.border} p-6 sm:p-10 shadow-lg relative print:p-6 print:border-4 print:shadow-none print:max-w-none print:w-full print:bg-white`}
          >
            {/* Inner Traditional Double Border */}
            <div className={`border ${themeStyles.innerBorder} p-4 sm:p-6 space-y-6 relative`}>
              {/* Corner Traditional Decorative Ornaments */}
              <div className="absolute top-1 left-1 text-[10px] select-none text-[#8C6D32] opacity-70">
                ✦
              </div>
              <div className="absolute top-1 right-1 text-[10px] select-none text-[#8C6D32] opacity-70">
                ✦
              </div>
              <div className="absolute bottom-1 left-1 text-[10px] select-none text-[#8C6D32] opacity-70">
                ✦
              </div>
              <div className="absolute bottom-1 right-1 text-[10px] select-none text-[#8C6D32] opacity-70">
                ✦
              </div>

              {/* Header: Traditional Clan & Dossier Title */}
              <div className="text-center pb-4 border-b-2 border-double border-[#D5CABE] space-y-1">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <span className="text-[11px] font-serif font-bold uppercase tracking-[0.25em] text-[#8C6D32]">
                    VIỆT NAM DÒNG TỘC · PHẢ KÝ TRÍCH LỤC
                  </span>
                </div>

                <p className="text-xs font-semibold text-stone-500 uppercase tracking-widest">
                  Gia Phả Dòng Họ: {settings.clanName.toUpperCase()}
                </p>

                <h1
                  className={`text-2xl sm:text-3xl font-serif font-bold ${themeStyles.titleColor} tracking-tight mt-1`}
                >
                  TRÍCH LỤC TIỂU SỬ PHẢ KÝ CÁ NHÂN
                </h1>

                <div className="flex items-center justify-center gap-3 text-[11px] text-[#655A4E] pt-1">
                  <span>Mã số: <strong className="font-mono text-stone-800">{formattedDossierCode}</strong></span>
                  <span>·</span>
                  <span>Trích lục ngày: {new Date().toLocaleDateString('vi-VN')}</span>
                  {reportData.branch && (
                    <>
                      <span>·</span>
                      <span className="font-semibold text-stone-700">{reportData.branch.name}</span>
                    </>
                  )}
                </div>

                {settings.clanMotto && (
                  <p className="text-xs font-serif italic text-[#8C6D32] pt-1 max-w-lg mx-auto">
                    "{settings.clanMotto}"
                  </p>
                )}
              </div>

              {/* ========================================================================= */}
              {/* PHẦN I: THÔNG TIN CÁ NHÂN & THẾ THỨ (BASIC BIO & TRADITIONAL NAMES) */}
              {/* ========================================================================= */}
              <section className="space-y-4">
                <div className="flex items-center gap-2 border-b border-[#D5CABE] pb-1.5">
                  <span className={`w-2 h-2 rounded-full ${themeStyles.badgeBg}`} />
                  <h2
                    className={`font-serif font-bold text-xs uppercase tracking-wider ${themeStyles.titleColor}`}
                  >
                    I. Thông Tin Cá Nhân & Thế Thứ Dòng Tộc
                  </h2>
                </div>

                <div className="flex flex-col sm:flex-row gap-5 items-start">
                  {/* Portrait Avatar */}
                  {config.showPortrait && (
                    <div className="shrink-0 mx-auto sm:mx-0 text-center">
                      <div className={`p-1 rounded-2xl border-2 ${themeStyles.border} bg-[#FAF7F2] shadow-xs inline-block`}>
                        <HeritageAvatar
                          fullName={person.fullName}
                          portraitUrl={person.portraitUrl}
                          gender={person.gender}
                          size="xl"
                          isLiving={person.isLiving}
                          className="w-24 h-24 sm:w-28 sm:h-28 text-2xl"
                        />
                      </div>
                      <p className="text-[10px] text-stone-500 mt-1 font-serif">
                        {person.isLiving ? 'Ảnh chân dung' : 'Di ảnh tiền nhân'}
                      </p>
                    </div>
                  )}

                  {/* Identity Key-Value Table */}
                  <div className="flex-1 w-full space-y-2 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5 pb-2">
                      <div className="flex items-baseline justify-between border-b border-stone-100 pb-1">
                        <span className="text-stone-500 font-medium">Họ và tên chính:</span>
                        <span className={`font-serif font-bold text-sm sm:text-base ${themeStyles.titleColor}`}>
                          {person.fullName}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between border-b border-stone-100 pb-1">
                        <span className="text-stone-500 font-medium">Giới tính:</span>
                        <span className="font-semibold text-stone-800">
                          {person.gender === 'male' ? 'Nam giới' : person.gender === 'female' ? 'Nữ giới' : 'Chưa rõ'}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between border-b border-stone-100 pb-1">
                        <span className="text-stone-500 font-medium">Đời thứ trong họ:</span>
                        <span className="font-bold text-[#1B3B2B]">
                          {person.generation ? `Thế hệ thứ ${person.generation}` : 'Chưa ghi nhận'}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between border-b border-stone-100 pb-1">
                        <span className="text-stone-500 font-medium">Chi họ / Phái:</span>
                        <span className="font-semibold text-stone-800">
                          {reportData.branch?.name || 'Chi chính'}
                          {person.subBranch ? ` · Phái ${person.subBranch}` : ''}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between border-b border-stone-100 pb-1">
                        <span className="text-stone-500 font-medium">Vai vế dòng họ:</span>
                        <span className="font-semibold text-[#8C6D32]">
                          {person.clanRole || 'Thành viên'}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between border-b border-stone-100 pb-1">
                        <span className="text-stone-500 font-medium">Trạng thái:</span>
                        <span className="font-semibold text-stone-800">
                          {person.isLiving ? 'Còn sống' : 'Đã tạ thế'}
                        </span>
                      </div>
                    </div>

                    {/* Traditional Cultural Names */}
                    {config.showTraditionalNames &&
                      (person.tabooName || person.courtesyName || person.commonName || person.alias) && (
                        <div className="p-2.5 rounded-xl bg-[#FAF8F5] border border-[#E7DFD4] grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                          {person.tabooName && (
                            <div>
                              <span className="text-stone-500">Tên Húy (Tế tự): </span>
                              <strong className="text-[#8C2A1E] font-serif">{person.tabooName}</strong>
                            </div>
                          )}
                          {person.courtesyName && (
                            <div>
                              <span className="text-stone-500">Tên Tự / Hiệu: </span>
                              <strong className="text-[#1B3B2B]">{person.courtesyName}</strong>
                            </div>
                          )}
                          {person.commonName && (
                            <div>
                              <span className="text-stone-500">Tên thường gọi: </span>
                              <strong className="text-stone-800">{person.commonName}</strong>
                            </div>
                          )}
                          {person.alias && (
                            <div>
                              <span className="text-stone-500">Bí danh sinh thời: </span>
                              <strong className="text-stone-800">{person.alias}</strong>
                            </div>
                          )}
                        </div>
                      )}

                    {/* Lifespan & Dates */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 pt-1 text-xs">
                      <div className="flex items-baseline justify-between">
                        <span className="text-stone-500">Ngày sinh:</span>
                        <span className="font-medium text-stone-800">
                          {formatFlexibleDate(person.birthDate)}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between">
                        <span className="text-stone-500">Nơi sinh:</span>
                        <span className="font-medium text-stone-800 truncate max-w-[160px]">
                          {person.birthPlace || 'Chưa rõ'}
                        </span>
                      </div>

                      {!person.isLiving && (
                        <>
                          <div className="flex items-baseline justify-between">
                            <span className="text-stone-500">Ngày mất:</span>
                            <span className="font-medium text-stone-800">
                              {formatFlexibleDate(person.deathDate)}
                            </span>
                          </div>

                          <div className="flex items-baseline justify-between">
                            <span className="text-stone-500">Thọ mệnh:</span>
                            <span className="font-medium text-stone-800">
                              {formatLifespan(person.birthDate, person.deathDate, person.isLiving)}
                            </span>
                          </div>
                        </>
                      )}

                      <div className="flex items-baseline justify-between">
                        <span className="text-stone-500">Nguyên quán:</span>
                        <span className="font-medium text-stone-800 truncate max-w-[160px]">
                          {person.ancestralHome || 'Chưa rõ'}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between">
                        <span className="text-stone-500">
                          {person.isLiving ? 'Nơi cư trú:' : 'Trú quán sinh thời:'}
                        </span>
                        <span className="font-medium text-stone-800 truncate max-w-[160px]">
                          {person.residence || 'Chưa rõ'}
                        </span>
                      </div>

                      {person.occupation && (
                        <div className="flex items-baseline justify-between sm:col-span-2">
                          <span className="text-stone-500">Nghề nghiệp / Chức vụ:</span>
                          <span className="font-medium text-stone-800">{person.occupation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lunar Death Anniversary & Burial Place (If deceased) */}
                {config.showAncestral && !person.isLiving && (
                  <div className="p-3 rounded-xl bg-[#FAF5EB] border border-[#E8DDCD] grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-[#8C6D32] font-semibold flex items-center gap-1.5 mb-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Lễ Giỗ Âm Lịch (Kỵ Nhật):</span>
                      </span>
                      <p className="font-serif font-bold text-stone-900 text-sm">
                        {formatLunarAnniversary(person.deathAnniversaryLunar) || 'Chưa ghi nhận ngày giỗ'}
                      </p>
                    </div>

                    <div>
                      <span className="text-stone-500 font-medium flex items-center gap-1.5 mb-0.5">
                        <MapPin className="w-3.5 h-3.5 text-stone-400" />
                        <span>Nơi An Táng / Mộ Phần:</span>
                      </span>
                      <p className="font-medium text-stone-800 text-xs">
                        {person.burialPlace || 'Chưa ghi nhận vị trí mộ phần'}
                      </p>
                    </div>
                  </div>
                )}
              </section>

              {/* ========================================================================= */}
              {/* PHẦN II: CÔNG ĐỨC & TIỂU SỬ HÀNH TRẠNG */}
              {/* ========================================================================= */}
              {(config.showMerits && person.merits) || (config.showBio && person.biography) ? (
                <section className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 border-b border-[#D5CABE] pb-1.5">
                    <span className={`w-2 h-2 rounded-full ${themeStyles.badgeBg}`} />
                    <h2
                      className={`font-serif font-bold text-xs uppercase tracking-wider ${themeStyles.titleColor}`}
                    >
                      II. Công Đức & Tiểu Sử Hành Trạng
                    </h2>
                  </div>

                  {config.showMerits && person.merits && (
                    <div className="p-3 rounded-xl bg-[#FAF7F2] border-l-4 border-[#8C6D32] border border-[#E7DFD4] space-y-1">
                      <h3 className="text-xs font-semibold text-[#8C6D32]">
                        Công Đức & Đóng Góp Cho Dòng Họ:
                      </h3>
                      <p className="text-xs text-[#3A2E25] leading-relaxed whitespace-pre-line">
                        {person.merits}
                      </p>
                    </div>
                  )}

                  {config.showBio && person.biography && (
                    <div className="space-y-1">
                      <h3 className="text-xs font-semibold text-stone-600">Tiểu Sử Sinh Thời:</h3>
                      <p className="text-xs font-serif text-[#2C241C] leading-relaxed text-justify indent-6 whitespace-pre-line">
                        {person.biography}
                      </p>
                    </div>
                  )}

                  {/* Life Events if any */}
                  {config.showLifeEvents && reportData.lifeEvents.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <h4 className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                        Các Mốc Biến Cố Quan Trọng:
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                        {reportData.lifeEvents.map((evt) => (
                          <div
                            key={evt.id}
                            className="p-2 rounded-lg bg-white border border-[#E7DFD4] space-y-0.5"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-stone-800">{evt.title}</span>
                              <span className="text-[10px] text-stone-500">
                                {formatFlexibleDate(evt.date)}
                              </span>
                            </div>
                            {evt.location && (
                              <p className="text-[10px] text-stone-500">Địa điểm: {evt.location}</p>
                            )}
                            {evt.description && (
                              <p className="text-[10px] text-stone-600 line-clamp-2">
                                {evt.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </section>
              ) : null}

              {/* ========================================================================= */}
              {/* PHẦN III: TIỀN NHÂN / THÂN PHỤ & THÂN MẪU (PARENTS) */}
              {/* ========================================================================= */}
              {config.showParents && (
                <section className="space-y-3 pt-2 page-break-inside-avoid">
                  <div className="flex items-center gap-2 border-b border-[#D5CABE] pb-1.5">
                    <span className={`w-2 h-2 rounded-full ${themeStyles.badgeBg}`} />
                    <h2
                      className={`font-serif font-bold text-xs uppercase tracking-wider ${themeStyles.titleColor}`}
                    >
                      III. Tiền Nhân / Thân Phụ & Thân Mẫu
                    </h2>
                  </div>

                  {reportData.parents.length === 0 ? (
                    <p className="text-xs text-stone-400 italic">
                      Chưa ghi nhận thông tin thân phụ mẫu trong phả bản.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {reportData.parents.map(({ relationship, parent }) => {
                        const isFather = parent.gender === 'male';
                        return (
                          <div
                            key={relationship.id}
                            className="p-3 rounded-xl border border-[#D5CABE] bg-[#FAF8F5] flex items-center gap-3"
                          >
                            <HeritageAvatar
                              fullName={parent.fullName}
                              portraitUrl={parent.portraitUrl}
                              gender={parent.gender}
                              size="sm"
                              isLiving={parent.isLiving}
                            />
                            <div className="flex-1 min-w-0 text-xs">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] uppercase font-bold text-[#8C6D32]">
                                  {isFather ? 'Thân phụ (Cha)' : 'Thân mẫu (Mẹ)'}
                                </span>
                                {relationship.lineageType === 'adoptive' && (
                                  <span className="text-[10px] text-amber-800">Con nuôi</span>
                                )}
                              </div>
                              <p className="font-serif font-bold text-stone-900 text-sm truncate">
                                {parent.fullName}
                              </p>
                              <p className="text-[11px] text-stone-500">
                                {formatLifespan(parent.birthDate, parent.deathDate, parent.isLiving)}
                                {parent.generation ? ` · Đời thứ ${parent.generation}` : ''}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

              {/* ========================================================================= */}
              {/* PHẦN IV: HÔN PHỐI / BẠN ĐỜI (SPOUSES) */}
              {/* ========================================================================= */}
              {config.showSpouses && (
                <section className="space-y-3 pt-2 page-break-inside-avoid">
                  <div className="flex items-center gap-2 border-b border-[#D5CABE] pb-1.5">
                    <span className={`w-2 h-2 rounded-full ${themeStyles.badgeBg}`} />
                    <h2
                      className={`font-serif font-bold text-xs uppercase tracking-wider ${themeStyles.titleColor}`}
                    >
                      IV. Hôn Phối / Bạn Đời
                    </h2>
                  </div>

                  {reportData.spouses.length === 0 ? (
                    <p className="text-xs text-stone-400 italic">
                      Chưa ghi nhận thông tin phối ngẫu trong phả hệ.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-[#D5CABE]">
                      <table className="w-full text-left text-xs">
                        <thead className={`${themeStyles.tableHeaderBg} text-stone-700 font-semibold border-b border-[#D5CABE]`}>
                          <tr>
                            <th className="p-2 sm:px-3">Thứ bậc hôn phối</th>
                            <th className="p-2 sm:px-3">Họ và tên bạn đời</th>
                            <th className="p-2 sm:px-3">Năm sinh – mất</th>
                            <th className="p-2 sm:px-3">Tình trạng</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 bg-white">
                          {reportData.spouses.map(({ union, spouse }) => (
                            <tr key={union.id} className="hover:bg-stone-50">
                              <td className="p-2 sm:px-3 font-semibold text-[#8C6D32]">
                                {union.marriageOrder === 1
                                  ? 'Chính thất (Lần 1)'
                                  : union.marriageOrder === 2
                                  ? 'Kế thất / Tục huyền (Lần 2)'
                                  : `Hôn phối lần ${union.marriageOrder || 1}`}
                              </td>
                              <td className="p-2 sm:px-3">
                                <div className="flex items-center gap-2">
                                  <HeritageAvatar
                                    fullName={spouse?.fullName || 'Chưa rõ'}
                                    portraitUrl={spouse?.portraitUrl}
                                    gender={spouse?.gender}
                                    size="sm"
                                    className="w-6 h-6 text-[10px]"
                                  />
                                  <span className="font-serif font-bold text-stone-900">
                                    {spouse?.fullName || 'Chưa rõ danh tính'}
                                  </span>
                                </div>
                              </td>
                              <td className="p-2 sm:px-3 text-stone-600">
                                {spouse
                                  ? formatLifespan(spouse.birthDate, spouse.deathDate, spouse.isLiving)
                                  : '—'}
                              </td>
                              <td className="p-2 sm:px-3 text-stone-600">
                                {spouse ? (spouse.isLiving ? 'Còn sống' : 'Đã tạ thế') : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}

              {/* ========================================================================= */}
              {/* PHẦN V: HẬU DUỆ / CON CÁI (CHILDREN) */}
              {/* ========================================================================= */}
              {config.showChildren && (
                <section className="space-y-3 pt-2 page-break-inside-avoid">
                  <div className="flex items-center justify-between border-b border-[#D5CABE] pb-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${themeStyles.badgeBg}`} />
                      <h2
                        className={`font-serif font-bold text-xs uppercase tracking-wider ${themeStyles.titleColor}`}
                      >
                        V. Hậu Duệ Tiếp Nối ({reportData.children.length} người con)
                      </h2>
                    </div>
                    <span className="text-[11px] text-stone-500 font-medium">
                      Thế hệ con cháu kế thừa
                    </span>
                  </div>

                  {reportData.children.length === 0 ? (
                    <p className="text-xs text-stone-400 italic">
                      Chưa ghi nhận hậu duệ / con cái trong gia phả.
                    </p>
                  ) : (
                    <div className="overflow-x-auto rounded-xl border border-[#D5CABE]">
                      <table className="w-full text-left text-xs">
                        <thead className={`${themeStyles.tableHeaderBg} text-stone-700 font-semibold border-b border-[#D5CABE]`}>
                          <tr>
                            <th className="p-2 sm:px-3 text-center w-12">Thứ tự</th>
                            <th className="p-2 sm:px-3">Họ và tên con</th>
                            <th className="p-2 sm:px-3">Giới tính</th>
                            <th className="p-2 sm:px-3">Năm sinh – mất</th>
                            <th className="p-2 sm:px-3">Đời thứ</th>
                            <th className="p-2 sm:px-3">Ghi chú</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-stone-100 bg-white">
                          {reportData.children.map(({ relationship, child }, idx) => {
                            const isMale = child.gender === 'male';
                            return (
                              <tr key={relationship.id} className="hover:bg-stone-50">
                                <td className="p-2 sm:px-3 text-center font-bold text-stone-500">
                                  {relationship.birthOrder || idx + 1}
                                </td>
                                <td className="p-2 sm:px-3">
                                  <div className="flex items-center gap-2">
                                    <HeritageAvatar
                                      fullName={child.fullName}
                                      portraitUrl={child.portraitUrl}
                                      gender={child.gender}
                                      size="sm"
                                      className="w-6 h-6 text-[10px]"
                                    />
                                    <span className="font-serif font-bold text-stone-900">
                                      {child.fullName}
                                    </span>
                                  </div>
                                </td>
                                <td className="p-2 sm:px-3">
                                  <span
                                    className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                                      isMale
                                        ? 'bg-emerald-50 text-emerald-800'
                                        : 'bg-rose-50 text-rose-800'
                                    }`}
                                  >
                                    {isMale ? 'Con trai' : 'Con gái'}
                                  </span>
                                </td>
                                <td className="p-2 sm:px-3 text-stone-600">
                                  {formatLifespan(child.birthDate, child.deathDate, child.isLiving)}
                                </td>
                                <td className="p-2 sm:px-3 font-semibold text-[#1B3B2B]">
                                  {child.generation ? `Đời thứ ${child.generation}` : '—'}
                                </td>
                                <td className="p-2 sm:px-3 text-stone-500 text-[11px]">
                                  {relationship.lineageType === 'adoptive'
                                    ? 'Con nuôi'
                                    : child.clanRole || '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}

              {/* ========================================================================= */}
              {/* PHẦN VI: HUYNH ĐỆ / ANH CHỊ EM (SIBLINGS - OPTIONAL) */}
              {/* ========================================================================= */}
              {config.showSiblings && reportData.siblings.length > 0 && (
                <section className="space-y-3 pt-2 page-break-inside-avoid">
                  <div className="flex items-center gap-2 border-b border-[#D5CABE] pb-1.5">
                    <span className={`w-2 h-2 rounded-full ${themeStyles.badgeBg}`} />
                    <h2
                      className={`font-serif font-bold text-xs uppercase tracking-wider ${themeStyles.titleColor}`}
                    >
                      VI. Huynh Đệ Đồng Bào ({reportData.siblings.length} anh chị em)
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                    {reportData.siblings.map((sib) => (
                      <div
                        key={sib.id}
                        className="p-2.5 rounded-xl border border-[#E7DFD4] bg-white flex items-center gap-2"
                      >
                        <HeritageAvatar
                          fullName={sib.fullName}
                          portraitUrl={sib.portraitUrl}
                          gender={sib.gender}
                          size="sm"
                          className="w-7 h-7 text-[10px]"
                        />
                        <div className="truncate">
                          <p className="font-serif font-bold text-stone-900 truncate">
                            {sib.fullName}
                          </p>
                          <p className="text-[10px] text-stone-500">
                            {sib.gender === 'male' ? 'Anh/Em trai' : 'Chị/Em gái'} ·{' '}
                            {formatLifespan(sib.birthDate, sib.deathDate, sib.isLiving)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ========================================================================= */}
              {/* PHẦN VII: LỜI CHỨNG THỰC & CHỮ KÝ TRƯỞNG TỘC (SIGNATURES & SEALS) */}
              {/* ========================================================================= */}
              {config.showSignatures && (
                <section className="pt-6 border-t-2 border-dashed border-[#D5CABE] space-y-4 page-break-inside-avoid">
                  <p className="text-[11px] text-stone-600 text-center italic max-w-lg mx-auto">
                    "Hồ sơ được trích lục chính thức từ bộ Phả bản Dòng họ {settings.clanName}, lưu trữ
                    an toàn trên hệ thống Gia Phả Việt. Dùng để đối chiếu, lưu niệm gia đình và truyền
                    nối hậu thế."
                  </p>

                  <div className="grid grid-cols-2 gap-8 text-center pt-2">
                    {/* Left: Recorder Signature */}
                    <div className="space-y-1">
                      <p className="font-serif font-bold text-xs uppercase text-stone-800">
                        NGƯỜI TRÍCH LỤC PHẢ KÝ
                      </p>
                      <p className="text-[10px] text-stone-500 italic">
                        (Ký tên và ghi rõ họ tên)
                      </p>
                      <div className="h-16 flex items-center justify-center">
                        <span className="text-[11px] font-serif italic text-stone-400">
                          Ban Quản Trị Phả Ký
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-stone-700 border-t border-dotted border-stone-400 pt-1 inline-block min-w-[140px]">
                        Ban Trị Sự Tông Tộc
                      </p>
                    </div>

                    {/* Right: Clan Patriarch Seal & Signature */}
                    <div className="space-y-1">
                      <p className="font-serif font-bold text-xs uppercase text-stone-800">
                        TRƯỞNG TỘC CHỨNG NHẬN
                      </p>
                      <p className="text-[10px] text-stone-500 italic">
                        (Ký tên và thị thực dấu dòng họ)
                      </p>

                      {/* Traditional Square Clan Seal */}
                      <div className="h-16 flex items-center justify-center">
                        <div
                          className={`w-14 h-14 border-2 border-dashed ${themeStyles.sealBorder} rounded-lg flex flex-col items-center justify-center select-none ${themeStyles.sealText} text-[9px] font-bold tracking-widest leading-tight`}
                        >
                          <span>TỘC ẤN</span>
                          <span className="text-[8px] font-normal">THỊ THỰC</span>
                        </div>
                      </div>

                      <p className={`text-xs font-serif font-bold ${themeStyles.titleColor} border-t border-dotted border-stone-400 pt-1 inline-block min-w-[140px]`}>
                        Hội Đồng Tộc Biểu
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {/* Document Micro Footer */}
              <div className="pt-4 border-t border-stone-200 flex items-center justify-between text-[10px] text-stone-400">
                <span>Gia Phả Việt – Cội Nguồn ({settings.clanName})</span>
                <span>Khổ in {config.paperSize.toUpperCase()} · Lưu truyền vạn đại</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
