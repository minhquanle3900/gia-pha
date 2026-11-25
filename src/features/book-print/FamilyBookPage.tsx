import React, { useMemo, useState } from 'react';
import {
  BookOpen,
  Download,
  FileDown,
  FileText,
  GitFork,
  Loader2,
  Printer,
  Sliders,
  Sparkles,
  User,
  X,
} from 'lucide-react';
import { HeritageAvatar } from '../../components/HeritageAvatar';
import { useGenealogy } from '../../context/GenealogyContext';
import { Person } from '../../models/genealogy';
import {
  DEFAULT_FAMILY_BOOK_CONFIG,
  exportFamilyBookToPdf,
  exportScrollSvgToPdf,
  FamilyBookPrintConfig,
  generateFamilyBookPrintableHtml,
} from '../../services/familyBookPdfService';
import { formatLifespan, formatLunarAnniversary } from '../../utils/dateUtils';
import { buildFamilyTreeLayout, generateCurvedLinkPath } from '../family-tree/treeLayout';
import { PersonReportModal } from '../people/PersonReportModal';

export const FamilyBookPage: React.FC = () => {
  const { people, branches, settings, stories, relationships, unions } = useGenealogy();

  const [activeTab, setActiveTab] = useState<'book' | 'scroll' | 'table' | 'individual'>('book');
  const [scrollFormat, setScrollFormat] = useState<'A0' | 'A1' | 'A3'>('A1');
  const [selectedReportPersonId, setSelectedReportPersonId] = useState<string | null>(null);
  const [individualSearch, setIndividualSearch] = useState('');
  const [printConfig, setPrintConfig] = useState<FamilyBookPrintConfig>(DEFAULT_FAMILY_BOOK_CONFIG);
  const [showPrintOptions, setShowPrintOptions] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Group members by generation for book publication
  const peopleByGeneration = useMemo(() => {
    const map = new Map<number, Person[]>();
    for (const p of people) {
      const gen = p.generation ?? 1;
      const list = map.get(gen) ?? [];
      list.push(p);
      map.set(gen, list);
    }
    const gens = Array.from(map.keys()).sort((a, b) => a - b);
    return gens.map((gen) => ({
      generation: gen,
      members: map.get(gen)!.sort((a, b) => {
        const yA = a.birthDate?.year ?? 9999;
        const yB = b.birthDate?.year ?? 9999;
        return yA - yB;
      }),
    }));
  }, [people]);

  // Index of taboo names (Mục lục tra cứu tên húy)
  const tabooIndex = useMemo(() => {
    return people
      .filter((p) => p.tabooName || p.courtesyName || p.commonName)
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));
  }, [people]);

  // Tree layout for A0/A1 scroll export
  const treeLayout = useMemo(() => {
    return buildFamilyTreeLayout({
      people,
      relationships,
      unions,
      viewMode: 'full',
      rootPersonId: settings.rootPersonId,
    });
  }, [people, relationships, unions, settings.rootPersonId]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    setExportProgress(5);
    setExportStatus(null);

    try {
      if (activeTab === 'scroll') {
        const svgEl = document.getElementById('family-scroll-svg') as SVGSVGElement | null;
        if (!svgEl) throw new Error('Không tìm thấy bản đồ phả hệ để xuất PDF.');
        setExportProgress(45);
        await exportScrollSvgToPdf(svgEl, settings.clanName, scrollFormat);
        setExportProgress(100);
        setExportStatus({
          type: 'success',
          text: `Đã xuất Phả đồ khổ ${scrollFormat} (.pdf) thành công.`,
        });
      } else {
        await exportFamilyBookToPdf(
          {
            settings,
            people,
            branches,
            stories,
            relationships,
            unions,
          },
          printConfig,
          (pct) => setExportProgress(pct)
        );
        setExportStatus({
          type: 'success',
          text: `Đã kết xuất Sách Phả Ký (${printConfig.paperSize.toUpperCase()}) ra tệp PDF thành công.`,
        });
      }
      setTimeout(() => setExportStatus(null), 4500);
    } catch (err) {
      console.error('Lỗi khi xuất PDF gia phả:', err);
      setExportStatus({
        type: 'error',
        text: 'Không thể tạo tệp PDF trực tiếp. Vui lòng thử nút "In trang" hoặc "Tải HTML bản in".',
      });
    } finally {
      setIsExportingPdf(false);
      setExportProgress(0);
    }
  };

  const handleExportPrintableHtml = () => {
    const html = generateFamilyBookPrintableHtml(
      {
        settings,
        people,
        branches,
        stories,
        relationships,
        unions,
      },
      printConfig
    );
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sach-Pha-Ky-${settings.clanName.replace(/\s+/g, '_')}.html`;
    a.click();
    URL.revokeObjectURL(url);
    setExportStatus({
      type: 'success',
      text: 'Đã lưu tệp HTML bản in độc lập.',
    });
    setTimeout(() => setExportStatus(null), 3500);
  };

  const handleExportScrollSvg = () => {
    const svgEl = document.getElementById('family-scroll-svg');
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Pha-Do-${scrollFormat}-${settings.clanName.replace(/\s+/g, '_')}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-16 animate-in fade-in">
      {/* Top Controls Toolbar (Hidden during print) */}
      <div className="print:hidden p-4 rounded-2xl bg-[#FFFDF9] border border-[#E7DFD4] shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveTab('book')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'book'
                  ? 'bg-[#1B3B2B] text-white shadow-xs'
                  : 'bg-stone-100 text-[#54483C] hover:bg-stone-200'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span>Sách Phả Ký In Ấn</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('scroll')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'scroll'
                  ? 'bg-[#1B3B2B] text-white shadow-xs'
                  : 'bg-stone-100 text-[#54483C] hover:bg-stone-200'
              }`}
            >
              <GitFork className="w-4 h-4" />
              <span>Phả Đồ Khổ Lớn ({scrollFormat})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('table')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'table'
                  ? 'bg-[#1B3B2B] text-white shadow-xs'
                  : 'bg-stone-100 text-[#54483C] hover:bg-stone-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Bảng Chi Truyền Thống</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('individual')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === 'individual'
                  ? 'bg-[#1B3B2B] text-white shadow-xs'
                  : 'bg-stone-100 text-[#54483C] hover:bg-stone-200'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Trích Lục Cá Nhân (PDF)</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'scroll' && (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-stone-500">Khổ giấy:</span>
                {(['A1', 'A0', 'A3'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setScrollFormat(fmt)}
                    className={`px-2 py-1 rounded-lg text-xs font-semibold ${
                      scrollFormat === fmt
                        ? 'bg-[#1B3B2B] text-white'
                        : 'bg-stone-100 text-stone-600'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleExportScrollSvg}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#D5CABE] text-[#54483C] hover:bg-stone-50 text-xs font-semibold ml-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải SVG</span>
                </button>
              </div>
            )}

            {activeTab !== 'scroll' && (
              <button
                type="button"
                onClick={() => setShowPrintOptions((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
                  showPrintOptions
                    ? 'bg-[#FAF5EB] border-[#8C6D32] text-[#8C6D32]'
                    : 'bg-white border-[#D5CABE] text-[#54483C] hover:bg-stone-50'
                }`}
                title="Tùy chỉnh khổ giấy và nội dung xuất PDF"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tùy chỉnh PDF</span>
              </button>
            )}

            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-[#D5CABE] hover:bg-stone-50 text-[#1B3B2B] text-xs font-semibold transition-colors"
              title="Mở hộp thoại in ấn của trình duyệt"
            >
              <Printer className="w-4 h-4" />
              <span>In trang</span>
            </button>

            <button
              type="button"
              disabled={isExportingPdf}
              onClick={handleExportPdf}
              aria-label="In Ấn / Xuất PDF"
              title="Tạo và tải xuống tài liệu PDF gia phả hoàn chỉnh để lưu trữ hoặc in ấn"
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1B3B2B] hover:bg-[#28503C] text-white text-xs font-semibold shadow-xs transition-colors disabled:opacity-60"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="tabular-nums">Đang xuất PDF ({exportProgress}%)</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>
                    {activeTab === 'scroll' ? `Xuất PDF (${scrollFormat})` : 'In / Xuất PDF'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Print & PDF Options Panel */}
        {showPrintOptions && activeTab !== 'scroll' && (
          <div className="pt-3 border-t border-[#E7DFD4] flex flex-wrap items-center justify-between gap-4 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="text-stone-500 font-semibold">Khổ giấy:</span>
                {(['a4', 'letter'] as const).map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => setPrintConfig((prev) => ({ ...prev, paperSize: sz }))}
                    className={`px-2.5 py-1 rounded-lg font-semibold uppercase border transition-colors ${
                      printConfig.paperSize === sz
                        ? 'bg-[#1B3B2B] text-white border-[#1B3B2B]'
                        : 'bg-white text-stone-600 border-[#D5CABE]'
                    }`}
                  >
                    {sz}
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#4A3F35]">
                {(
                  [
                    ['includeCover', 'Trang bìa'],
                    ['includePreface', 'Lời tựa'],
                    ['includeBranches', 'Chi phái'],
                    ['includeGenerations', 'Phả lục thế hệ'],
                    ['includeRelationships', 'Cha mẹ & Hôn phối'],
                    ['includeTabooIndex', 'Mục lục tên húy'],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="flex items-center gap-1.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={printConfig[key]}
                      onChange={(e) =>
                        setPrintConfig((prev) => ({ ...prev, [key]: e.target.checked }))
                      }
                      className="rounded text-[#1B3B2B]"
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleExportPrintableHtml}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#FAF5EB] hover:bg-[#F0E6D2] text-[#8C6D32] font-semibold border border-[#E8DDCD] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải HTML bản in</span>
            </button>
          </div>
        )}

        {/* Export feedback message */}
        {exportStatus && (
          <div
            className={`px-3.5 py-2 rounded-xl border text-xs font-medium flex items-center justify-between ${
              exportStatus.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}
          >
            <span>{exportStatus.text}</span>
            <button
              type="button"
              onClick={() => setExportStatus(null)}
              className="p-0.5 rounded hover:bg-black/5"
              aria-label="Đóng thông báo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 1. SÁCH PHẢ KÝ IN ẤN (FAMILY BOOK PREVIEW & PRINT) */}
      {/* ========================================================================= */}
      {activeTab === 'book' && (
        <div className="max-w-4xl mx-auto space-y-12 bg-white p-6 sm:p-12 rounded-3xl border border-[#E7DFD4] shadow-sm print:p-0 print:border-none print:shadow-none">
          {/* Cover Page */}
          <section className="text-center py-16 sm:py-24 border-8 border-double border-[#1B3B2B] rounded-3xl p-8 bg-[#FAF7F2] relative">
            <div className="absolute top-4 left-4 text-[#C19B4C] text-xs font-serif font-bold">
              ✦ QUỐC ÂM PHẢ KÝ ✦
            </div>
            <div className="w-16 h-16 rounded-2xl bg-[#1B3B2B] text-[#DBC599] flex items-center justify-center font-serif text-3xl font-bold mx-auto mb-6 shadow-sm">
              源
            </div>

            <p className="text-xs uppercase tracking-[0.3em] font-semibold text-[#8C6D32] mb-3">
              Gia Phả Dòng Tộc Việt Nam
            </p>
            <h1 className="text-3xl sm:text-5xl font-serif font-bold text-[#1B3B2B] tracking-tight mb-4">
              {settings.clanName}
            </h1>
            <p className="text-base sm:text-lg font-serif italic text-[#54483C] max-w-xl mx-auto mb-8">
              "{settings.clanMotto}"
            </p>

            <div className="text-xs text-stone-500 space-y-1 pt-6 border-t border-[#D5CABE] max-w-md mx-auto">
              <p>Nhà thờ tổ: {settings.ancestralHallLocation || 'Việt Nam'}</p>
              <p>Biên tập & Kết xuất: Ngày {new Date().toLocaleDateString('vi-VN')}</p>
              <p>Lưu truyền vạn đại hậu thế tử tôn</p>
            </div>
          </section>

          {/* Preface / Lời Tựa */}
          <section className="space-y-4 pt-6 border-t border-stone-200">
            <h2 className="text-xl font-serif font-bold text-[#1B3B2B] text-center border-b-2 border-[#1B3B2B] pb-2 inline-block mx-auto">
              LỜI TỰA PHẢ KÝ (TIỀN NGÔN)
            </h2>
            <div className="text-sm font-serif text-[#332A22] leading-relaxed space-y-3 indent-6">
              <p>
                Cổ nhân có câu: "Mộc hữu bản, thủy hữu nguyên; nhân hữu tổ". Cây có gốc mới trổ
                nhánh đơm hoa kết trái, nước có nguồn mới chảy xiết thành sông lớn; con người có tổ
                tiên mới sinh sôi nảy nở đời đời nối tiếp.
              </p>
              <p>
                Phả ký dòng họ chính là linh hồn và cột mốc lịch sử thiêng liêng để con cháu đời sau
                nhìn vào, thấu suốt nguồn cội phát tích, tri ân đức dầy của các bậc Tiên tổ, hiểu rõ
                vai vế thứ bậc trên dưới, giữ trọn chữ Hiếu, chữ Đễ và đạo lý Uống nước nhớ nguồn.
              </p>
              {stories.length > 0 && (
                <div className="my-4 p-4 rounded-2xl bg-[#FAF8F5] border border-[#E7DFD4] font-sans not-italic text-xs">
                  <h3 className="font-serif font-bold text-[#8C6D32] text-sm mb-1">
                    {stories[0].title}
                  </h3>
                  <p className="text-[#4A3F35] leading-relaxed">{stories[0].content}</p>
                </div>
              )}
            </div>
          </section>

          {/* Branches Directory / Chi Phái */}
          <section className="space-y-4 pt-6 border-t border-stone-200">
            <h2 className="text-xl font-serif font-bold text-[#1B3B2B] text-center">
              DANH SÁCH CÁC CHI PHÁI TRỰC THUỘC
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {branches.map((b) => (
                <div
                  key={b.id}
                  className="p-4 rounded-2xl border border-[#D5CABE] bg-[#FAF8F5] space-y-1.5"
                >
                  <h3 className="text-sm font-serif font-bold text-[#1F1913] flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-[#8C6D32]" />
                    <span>{b.name}</span>
                  </h3>
                  {b.description && (
                    <p className="text-xs text-stone-600 line-clamp-2">{b.description}</p>
                  )}
                  {b.originPlace && (
                    <p className="text-[11px] text-stone-500">Địa bàn phát tích: {b.originPlace}</p>
                  )}
                  {b.subBranches.length > 0 && (
                    <p className="text-[11px] text-[#8C6D32]">
                      Phái: {b.subBranches.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Generation Biographies (Phả Lục Từng Đời) */}
          <section className="space-y-8 pt-6 border-t border-stone-200">
            <h2 className="text-xl font-serif font-bold text-[#1B3B2B] text-center">
              PHẢ LỤC CHI TIẾT CÁC THẾ HỆ
            </h2>

            {peopleByGeneration.map(({ generation, members }) => (
              <div key={generation} className="space-y-4 page-break-before">
                <div className="flex items-center gap-3 border-b-2 border-[#1B3B2B]/20 pb-2">
                  <span className="px-3 py-1 rounded-xl bg-[#1B3B2B] text-white font-serif font-bold text-xs">
                    ĐỜI THỨ {generation}
                  </span>
                  <span className="text-xs text-stone-500">{members.length} vị thành viên</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {members.map((p) => (
                    <div
                      key={p.id}
                      className="p-4 rounded-2xl border border-[#E7DFD4] bg-[#FFFDF9] space-y-2 flex gap-3.5"
                    >
                      <HeritageAvatar
                        fullName={p.fullName}
                        portraitUrl={p.portraitUrl}
                        gender={p.gender}
                        size="md"
                        isLiving={p.isLiving}
                      />

                      <div className="flex-1 min-w-0 text-xs">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="font-serif font-bold text-sm text-[#1F1913] truncate">
                            {p.fullName}
                          </h3>
                          {p.clanRole && (
                            <span className="text-[10px] text-[#8C6D32] font-semibold truncate max-w-[80px]">
                              {p.clanRole}
                            </span>
                          )}
                        </div>

                        <p className="text-stone-500 text-[11px]">
                          {formatLifespan(p.birthDate, p.deathDate, p.isLiving)}
                        </p>

                        {(p.commonName || p.tabooName || p.courtesyName) && (
                          <p className="text-[10px] text-[#6E5F4F] mt-0.5">
                            {p.commonName && <span>Thường gọi: {p.commonName} </span>}
                            {p.tabooName && <span>• Húy: {p.tabooName} </span>}
                            {p.courtesyName && <span>• Tự: {p.courtesyName}</span>}
                          </p>
                        )}

                        {!p.isLiving && p.deathAnniversaryLunar?.day && (
                          <p className="text-[10px] text-[#8C6D32] font-medium mt-0.5">
                            Giỗ: {formatLunarAnniversary(p.deathAnniversaryLunar)}
                          </p>
                        )}

                        {p.burialPlace && (
                          <p className="text-[10px] text-stone-400 truncate">
                            Mộ: {p.burialPlace}
                          </p>
                        )}

                        {p.merits && (
                          <p className="text-[10px] text-[#4A3B2C] italic mt-1 line-clamp-2">
                            Công đức: {p.merits}
                          </p>
                        )}

                        <div className="pt-2 mt-1 border-t border-stone-100 flex items-center justify-end print:hidden">
                          <button
                            type="button"
                            onClick={() => setSelectedReportPersonId(p.id)}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#FAF5EB] text-[#8C6D32] hover:bg-[#F0E6D2] text-[10px] font-semibold transition-colors"
                            title="Xuất bản in & PDF riêng cho thành viên này"
                          >
                            <Printer className="w-3 h-3" />
                            <span>Trích lục PDF</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </section>

          {/* Index of Taboo & Courtesy Names (Mục lục Tên Húy & Tên Tự) */}
          <section className="space-y-4 pt-6 border-t border-stone-200 page-break-before">
            <h2 className="text-xl font-serif font-bold text-[#1B3B2B] text-center">
              MỤC LỤC TRA CỨU TÊN HÚY & TÊN TỰ TIỀN NHÂN
            </h2>
            <p className="text-xs text-stone-500 text-center max-w-lg mx-auto">
              Theo phong tục Việt Nam, con cháu khi tế tự xướng danh theo Tên Húy để tỏ lòng cung kính.
            </p>

            <div className="overflow-x-auto rounded-xl border border-[#E7DFD4]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF7F2] text-stone-600 font-semibold border-b border-[#E7DFD4]">
                  <tr>
                    <th className="p-2.5">Họ và tên</th>
                    <th className="p-2.5">Đời thứ</th>
                    <th className="p-2.5">Tên Húy (Tế tự)</th>
                    <th className="p-2.5">Tên Tự / Hiệu</th>
                    <th className="p-2.5">Tên thường gọi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {tabooIndex.map((p) => (
                    <tr key={p.id} className="hover:bg-stone-50">
                      <td className="p-2.5 font-serif font-bold text-[#1F1913]">{p.fullName}</td>
                      <td className="p-2.5 font-semibold text-[#1B3B2B]">
                        {p.generation ? `Đời ${p.generation}` : '—'}
                      </td>
                      <td className="p-2.5 font-semibold text-[#8C3A27]">
                        {p.tabooName || '—'}
                      </td>
                      <td className="p-2.5 text-[#1B3B2B]">{p.courtesyName || '—'}</td>
                      <td className="p-2.5 text-stone-600">{p.commonName || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. PHẢ ĐỒ KHỔ LỚN (A0 / A1 SCROLL EXPORTER) */}
      {/* ========================================================================= */}
      {activeTab === 'scroll' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
            <div>
              <p className="font-semibold">Bản đồ phả hệ khổ lớn định dạng vector ({scrollFormat})</p>
              <p className="text-[11px] text-amber-800">
                Tệp vector sắc nét không bị vỡ hạt, thích hợp đem in bạt Hiflex hoặc lụa treo nhà thờ tổ.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportScrollSvg}
              className="px-3.5 py-1.5 rounded-xl bg-[#1B3B2B] text-white font-semibold text-xs shrink-0"
            >
              Tải tệp SVG
            </button>
          </div>

          <div className="overflow-auto max-h-[75vh] p-6 bg-[#FAF7F2] rounded-3xl border border-[#D5CABE] shadow-inner flex items-center justify-center">
            <svg
              id="family-scroll-svg"
              xmlns="http://www.w3.org/2000/svg"
              viewBox={`${treeLayout.bounds.minX - 50} ${treeLayout.bounds.minY - 120} ${
                treeLayout.bounds.width + 100
              } ${treeLayout.bounds.height + 200}`}
              width={treeLayout.bounds.width + 100}
              height={treeLayout.bounds.height + 200}
              className="bg-[#FFFDF9] shadow-md border-4 border-[#1B3B2B] rounded-2xl"
            >
              {/* Header Title on Scroll */}
              <text
                x={(treeLayout.bounds.minX + treeLayout.bounds.maxX) / 2}
                y={treeLayout.bounds.minY - 60}
                textAnchor="middle"
                fontSize={24}
                fontWeight="bold"
                fontFamily="'Cormorant Garamond', serif"
                fill="#1B3B2B"
              >
                PHẢ ĐỒ ĐẠI GIA ĐÌNH: {settings.clanName.toUpperCase()}
              </text>
              <text
                x={(treeLayout.bounds.minX + treeLayout.bounds.maxX) / 2}
                y={treeLayout.bounds.minY - 35}
                textAnchor="middle"
                fontSize={12}
                fontStyle="italic"
                fill="#8C6D32"
              >
                "{settings.clanMotto}"
              </text>

              {/* Links */}
              {treeLayout.links.map((link) => (
                <path
                  key={link.id}
                  d={generateCurvedLinkPath(link)}
                  fill="none"
                  stroke="#2D5A43"
                  strokeWidth={2}
                />
              ))}

              {/* Nodes */}
              {treeLayout.nodes.map((node) => {
                const p = node.person;
                return (
                  <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
                    <rect
                      width={node.width}
                      height={node.height}
                      rx={10}
                      ry={10}
                      fill="#FAF8F5"
                      stroke={p.gender === 'male' ? '#1B3B2B' : '#B75338'}
                      strokeWidth={1.5}
                    />
                    <text
                      x={node.width / 2}
                      y={25}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight="bold"
                      fill="#8C6D32"
                    >
                      Đời {node.generation}
                    </text>
                    <text
                      x={node.width / 2}
                      y={45}
                      textAnchor="middle"
                      fontSize={13}
                      fontWeight="bold"
                      fontFamily="'Cormorant Garamond', serif"
                      fill="#1F1913"
                    >
                      {p.fullName}
                    </text>
                    <text
                      x={node.width / 2}
                      y={65}
                      textAnchor="middle"
                      fontSize={9}
                      fill="#5C4F42"
                    >
                      {formatLifespan(p.birthDate, p.deathDate, p.isLiving)}
                    </text>
                    {p.clanRole && (
                      <text
                        x={node.width / 2}
                        y={82}
                        textAnchor="middle"
                        fontSize={9}
                        fontWeight="600"
                        fill="#8C3A27"
                      >
                        {p.clanRole}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. BẢNG CHI TRUYỀN THỐNG (TRADITIONAL ANCESTOR TABLE) */}
      {/* ========================================================================= */}
      {activeTab === 'table' && (
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-[#E7DFD4] shadow-xs space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1B3B2B]">
              BẢNG PHÂN ĐỊNH CHI PHÁI & THẾ THỨ CỔ TRUYỀN
            </h2>
            <p className="text-xs text-stone-500">
              Sắp xếp theo thứ tự dòng họ truyền thống Việt Nam từ Thủy tổ truyền thừa
            </p>
          </div>

          <div className="space-y-6">
            {peopleByGeneration.map(({ generation, members }) => (
              <div
                key={generation}
                className="p-4 rounded-2xl border border-[#D5CABE] bg-[#FAF8F5] space-y-3"
              >
                <div className="flex items-center justify-between border-b border-[#D5CABE] pb-2">
                  <h3 className="text-sm font-serif font-bold text-[#1B3B2B] flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-[#1B3B2B] text-white flex items-center justify-center text-xs">
                      {generation}
                    </span>
                    <span>THẾ HỆ THỨ {generation}</span>
                  </h3>
                  <span className="text-xs text-stone-500">{members.length} vị</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {members.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-xl bg-white border border-[#E7DFD4] space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-serif font-bold text-xs text-[#1F1913]">
                          {p.fullName}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            p.gender === 'male'
                              ? 'bg-emerald-50 text-emerald-800'
                              : 'bg-rose-50 text-rose-800'
                          }`}
                        >
                          {p.gender === 'male' ? 'Nam' : 'Nữ'}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-500">
                        {formatLifespan(p.birthDate, p.deathDate, p.isLiving)}
                      </p>
                      {p.clanRole && (
                        <p className="text-[10px] text-[#8C6D32] font-semibold">{p.clanRole}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TRÍCH LỤC HỒ SƠ CÁ NHÂN (INDIVIDUAL PDF DOSSIER SELECTOR) */}
      {/* ========================================================================= */}
      {activeTab === 'individual' && (
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-[#E7DFD4] shadow-xs space-y-6">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-[#1B3B2B]">
              TRÍCH LỤC TIỂU SỬ & HỒ SƠ PHẢ KÝ CÁ NHÂN
            </h2>
            <p className="text-xs text-stone-500 max-w-xl mx-auto">
              Tạo bản in trang trọng và kết xuất tệp PDF cho từng vị thành viên hoặc tiền nhân, bao gồm
              tiểu sử, thân phụ mẫu, phối ngẫu, các con và con dấu xác thực dòng tộc.
            </p>
          </div>

          {/* Quick Search */}
          <div className="max-w-md mx-auto">
            <input
              type="text"
              value={individualSearch}
              onChange={(e) => setIndividualSearch(e.target.value)}
              placeholder="Tìm kiếm thành viên theo họ tên, tên húy, thế hệ..."
              className="w-full px-4 py-2.5 rounded-2xl bg-[#FAF7F2] border border-[#D5CABE] text-xs outline-none focus:border-[#1B3B2B]"
            />
          </div>

          {/* Members Grid for Quick PDF Report */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5 pt-2">
            {people
              .filter((p) => {
                if (!individualSearch.trim()) return true;
                const q = individualSearch.toLowerCase();
                return (
                  p.fullName.toLowerCase().includes(q) ||
                  p.tabooName?.toLowerCase().includes(q) ||
                  p.courtesyName?.toLowerCase().includes(q) ||
                  p.commonName?.toLowerCase().includes(q) ||
                  (p.generation && `đời ${p.generation}`.includes(q))
                );
              })
              .map((p) => (
                <div
                  key={p.id}
                  className="p-3.5 rounded-2xl border border-[#E7DFD4] bg-[#FFFDF9] hover:border-[#1B3B2B]/40 hover:shadow-xs transition-all flex items-start gap-3"
                >
                  <HeritageAvatar
                    fullName={p.fullName}
                    portraitUrl={p.portraitUrl}
                    gender={p.gender}
                    size="md"
                    isLiving={p.isLiving}
                  />
                  <div className="flex-1 min-w-0 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-[#8C6D32]">
                        {p.generation ? `Đời thứ ${p.generation}` : 'Thành viên'}
                      </span>
                      {p.clanRole && (
                        <span className="text-[10px] text-stone-500 font-medium truncate max-w-[80px]">
                          {p.clanRole}
                        </span>
                      )}
                    </div>
                    <p className="font-serif font-bold text-sm text-[#1F1913] truncate">
                      {p.fullName}
                    </p>
                    <p className="text-[11px] text-stone-500">
                      {formatLifespan(p.birthDate, p.deathDate, p.isLiving)}
                    </p>

                    <button
                      type="button"
                      onClick={() => setSelectedReportPersonId(p.id)}
                      className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-xl bg-[#FAF5EB] hover:bg-[#1B3B2B] text-[#8C6D32] hover:text-white font-semibold text-[11px] transition-colors border border-[#E8DDCD]"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>Xuất Bản In PDF</span>
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Person Report Modal */}
      <PersonReportModal
        personId={selectedReportPersonId}
        open={Boolean(selectedReportPersonId)}
        onClose={() => setSelectedReportPersonId(null)}
      />
    </div>
  );
};
