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

const bookViews = [
  { id: 'book', label: 'Sách phả ký', icon: BookOpen },
  { id: 'scroll', label: 'Phả đồ khổ lớn', icon: GitFork },
  { id: 'table', label: 'Bảng chi', icon: FileText },
  { id: 'individual', label: 'Trích lục cá nhân', icon: User },
] as const;

const bookControl = 'inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C6D32] disabled:opacity-60';
const bookSecondary = 'border border-[#D5CABE] bg-white text-[#1B3B2B] hover:bg-stone-50';

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

  const reportQuery = individualSearch.trim().toLocaleLowerCase('vi');
  const reportPeople = activeTab === 'individual' ? people.filter((person) => {
    if (!reportQuery) return true;
    return [
      person.fullName,
      person.tabooName,
      person.courtesyName,
      person.commonName,
      person.generation ? `đời ${person.generation}` : undefined,
    ].some((value) => value?.toLocaleLowerCase('vi').includes(reportQuery));
  }) : [];

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
    <div className="min-w-0 space-y-4 pb-16 sm:space-y-6">
      <section aria-labelledby="book-heading" className="space-y-4 rounded-2xl border border-[#E7DFD4] bg-[#FFFDF9] p-3 shadow-xs sm:p-5 print:hidden">
        <div className="min-w-0 px-1 pt-1">
          <h1 id="book-heading" className="heritage-display text-3xl text-[#1B3B2B] sm:text-4xl">
            Sách phả ký
          </h1>
          <p className="mt-2 text-sm text-[#655A4E]">Chọn bản xem trước, khổ giấy và cách xuất bản in.</p>
        </div>

        <div role="group" aria-label="Kiểu bản xem trước" className="grid grid-cols-2 gap-1 rounded-xl border border-[#E7DFD4] bg-[#F1EBE1] p-1 sm:grid-cols-4">
          {bookViews.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              aria-pressed={activeTab === id}
              disabled={isExportingPdf}
              className={`${bookControl} px-2 text-xs sm:text-sm ${activeTab === id
                ? 'bg-[#1B3B2B] text-white shadow-xs'
                : 'text-[#54483C] hover:bg-[#FFFDF9]'}`}
            >
              <Icon aria-hidden="true" className="size-4 shrink-0" />
              <span className="text-left leading-snug">{label}</span>
            </button>
          ))}
        </div>

        <div className="grid gap-3 border-t border-[#E7DFD4] pt-3 lg:grid-cols-[1fr_auto] lg:items-center">
          {activeTab === 'scroll' ? (
            <div role="group" aria-label="Khổ giấy phả đồ" className="flex min-w-0 flex-wrap items-center gap-1.5">
              <span className="mr-1 text-sm font-medium text-[#655A4E]">Khổ giấy</span>
              {(['A1', 'A0', 'A3'] as const).map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => setScrollFormat(format)}
                  aria-pressed={scrollFormat === format}
                  disabled={isExportingPdf}
                  className={`${bookControl} ${scrollFormat === format ? 'bg-[#1B3B2B] text-white' : bookSecondary}`}
                >
                  {format}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#655A4E]">
              Khổ giấy PDF <span className="font-semibold text-[#1F1913]">{printConfig.paperSize.toUpperCase()}</span>
            </p>
          )}

          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            {activeTab === 'scroll' ? (
              <button type="button" onClick={handleExportScrollSvg} className={`${bookControl} ${bookSecondary}`}>
                <Download aria-hidden="true" className="size-4 shrink-0" />
                Tải SVG
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowPrintOptions((prev) => !prev)}
                aria-expanded={showPrintOptions}
                aria-controls="family-book-pdf-options"
                disabled={isExportingPdf}
                className={`${bookControl} ${bookSecondary}`}
              >
                <Sliders aria-hidden="true" className="size-4 shrink-0" />
                Tùy chỉnh PDF
              </button>
            )}
            <button
              type="button"
              onClick={handlePrint}
              disabled={isExportingPdf}
              className={`${bookControl} ${bookSecondary}`}
            >
              <Printer aria-hidden="true" className="size-4 shrink-0" />
              In trang
            </button>
            <button
              type="button"
              disabled={isExportingPdf}
              onClick={handleExportPdf}
              className={`${bookControl} col-span-2 bg-[#1B3B2B] text-white hover:bg-[#28503C]`}
            >
              {isExportingPdf ? (
                <>
                  <Loader2 aria-hidden="true" className="size-4 shrink-0 animate-spin" />
                  <span className="tabular-nums" role="status">Đang xuất PDF ({exportProgress}%)</span>
                </>
              ) : (
                <>
                  <FileDown aria-hidden="true" className="size-4 shrink-0" />
                  <span>{activeTab === 'scroll' ? `Xuất PDF (${scrollFormat})` : 'Xuất PDF'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {activeTab !== 'scroll' && (
          <div
            id="family-book-pdf-options"
            hidden={!showPrintOptions}
            className="space-y-3 rounded-xl border border-[#E7DFD4] bg-[#FAF8F5] p-3 sm:p-4"
          >
            <div role="group" aria-label="Khổ giấy PDF" className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-[#655A4E]">Khổ giấy</span>
              {(['a4', 'letter'] as const).map((size) => (
                <button
                  key={size}
                  type="button"
                  onClick={() => setPrintConfig((prev) => ({ ...prev, paperSize: size }))}
                  aria-pressed={printConfig.paperSize === size}
                  disabled={isExportingPdf}
                  className={`${bookControl} uppercase ${printConfig.paperSize === size ? 'bg-[#1B3B2B] text-white' : bookSecondary}`}
                >
                  {size}
                </button>
              ))}
            </div>
            <fieldset disabled={isExportingPdf}>
              <legend className="text-sm font-semibold text-[#1F1913]">Nội dung xuất bản in</legend>
              <div className="mt-1 grid grid-cols-1 gap-x-3 sm:grid-cols-3">
                {([
                  ['includeCover', 'Trang bìa'],
                  ['includePreface', 'Lời tựa'],
                  ['includeBranches', 'Chi phái'],
                  ['includeGenerations', 'Phả lục thế hệ'],
                  ['includeRelationships', 'Cha mẹ và hôn phối'],
                  ['includeTabooIndex', 'Mục lục tên húy'],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex min-h-11 cursor-pointer items-center gap-2 text-sm text-[#655A4E]">
                    <input
                      type="checkbox"
                      checked={printConfig[key]}
                      onChange={(e) => setPrintConfig((prev) => ({ ...prev, [key]: e.target.checked }))}
                      className="size-4 shrink-0 accent-[#1B3B2B]"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>
            <button
              type="button"
              onClick={handleExportPrintableHtml}
              disabled={isExportingPdf}
              className={`${bookControl} ${bookSecondary} w-full sm:w-auto`}
            >
              <Download aria-hidden="true" className="size-4 shrink-0" />
              Tải HTML bản in
            </button>
          </div>
        )}

        {exportStatus && (
          <div className={`flex min-w-0 items-center justify-between gap-2 rounded-xl border px-3 text-sm ${exportStatus.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
            <p role={exportStatus.type === 'error' ? 'alert' : 'status'} className="py-2">
              {exportStatus.text}
            </p>
            <button
              type="button"
              onClick={() => setExportStatus(null)}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl focus-visible:outline-2"
              aria-label="Đóng thông báo xuất"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* 1. SÁCH PHẢ KÝ IN ẤN (FAMILY BOOK PREVIEW & PRINT) */}
      {/* ========================================================================= */}
      {activeTab === 'book' && (
        <div className="mx-auto min-w-0 max-w-4xl space-y-8 rounded-3xl border border-[#E7DFD4] bg-white p-3 shadow-sm sm:space-y-12 sm:p-8 lg:p-12 print:space-y-12 print:border-none print:p-0 print:shadow-none">
          {/* Cover Page */}
          <section className="relative rounded-2xl border-4 border-double border-[#1B3B2B] bg-[#FAF7F2] px-4 pb-10 pt-14 text-center sm:rounded-3xl sm:border-8 sm:px-8 sm:py-24 print:rounded-3xl print:border-8 print:px-8 print:py-24">
            <div className="absolute left-0 right-0 top-4 px-3 text-center font-serif text-xs font-bold text-[#8C6D32] sm:right-auto sm:pl-4 sm:text-left">
              ✦ QUỐC ÂM PHẢ KÝ ✦
            </div>
            <div className="w-16 h-16 rounded-2xl bg-[#1B3B2B] text-[#DBC599] flex items-center justify-center font-serif text-3xl font-bold mx-auto mb-6 shadow-sm">
              源
            </div>

            <p className="text-xs uppercase tracking-[0.3em] font-semibold text-[#8C6D32] mb-3">
              Gia Phả Dòng Tộc Việt Nam
            </p>
            <h2 className="heritage-display mb-4 break-words text-3xl text-[#1B3B2B] sm:text-5xl">
              {settings.clanName}
            </h2>
            <p className={`mx-auto mb-8 max-w-xl break-words text-base text-[#54483C] sm:text-lg ${settings.clanMotto.length <= 100 ? 'heritage-intro' : 'heritage-body'}`}>
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
            <h2 className="heritage-heading mx-auto inline-block border-b-2 border-[#1B3B2B] pb-2 text-center text-xl text-[#1B3B2B]">
              LỜI TỰA PHẢ KÝ (TIỀN NGÔN)
            </h2>
            <div className="heritage-body space-y-3 indent-6 text-sm text-[#332A22]">
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
            <h2 className="heritage-heading text-center text-xl text-[#1B3B2B]">
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
            <h2 className="heritage-heading text-center text-xl text-[#1B3B2B]">
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
                            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg bg-[#FAF8F5] px-2.5 text-xs font-semibold text-[#8C6D32] transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C6D32]"
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

            <div className="max-w-full overflow-x-auto rounded-xl border border-[#E7DFD4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C6D32]" role="region" aria-label="Mục lục tên húy và tên tự" tabIndex={0}>
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
          <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 print:hidden">
            Cuộn để xem phả đồ. Tải SVG để in khổ lớn ở định dạng vector.
          </p>
          <div
            role="region"
            aria-label="Bản xem trước phả đồ có thể cuộn"
            tabIndex={0}
            className="max-h-[75vh] min-w-0 max-w-full overflow-auto rounded-2xl border border-[#D5CABE] bg-[#FAF7F2] p-3 shadow-inner focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C6D32] sm:p-6 print:max-h-none print:overflow-visible print:border-none print:p-0"
          >
            <svg
              id="family-scroll-svg"
              xmlns="http://www.w3.org/2000/svg"
              viewBox={`${treeLayout.bounds.minX - 50} ${treeLayout.bounds.minY - 120} ${
                treeLayout.bounds.width + 100
              } ${treeLayout.bounds.height + 200}`}
              width={treeLayout.bounds.width + 100}
              height={treeLayout.bounds.height + 200}
              className="block max-w-none rounded-2xl border-4 border-[#1B3B2B] bg-[#FFFDF9] shadow-md print:max-w-full"
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
        <div className="min-w-0 space-y-5 rounded-3xl border border-[#E7DFD4] bg-white p-4 shadow-xs sm:p-7 lg:p-10 print:p-10">
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
                          {p.gender === 'male' ? 'Nam' : p.gender === 'female' ? 'Nữ' : 'Chưa rõ'}
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
        <div className="min-w-0 space-y-5 rounded-3xl border border-[#E7DFD4] bg-white p-4 shadow-xs sm:p-7 lg:p-10 print:p-10">
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
              aria-label="Tìm thành viên để trích lục"
              placeholder="Họ tên, tên húy hoặc thế hệ"
              className="min-h-11 w-full rounded-xl border border-[#D5CABE] bg-[#FAF7F2] px-3 text-base text-[#1F1913] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C6D32]"
            />
          </div>

          {/* Members Grid for Quick PDF Report */}
          <div className="grid min-w-0 grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {reportPeople.length === 0 && (
              <p className="text-sm text-[#655A4E] sm:col-span-2 lg:col-span-3" role="status">
                {reportQuery ? 'Không tìm thấy thành viên phù hợp.' : 'Chưa có thành viên để trích lục.'}
              </p>
            )}
            {reportPeople.map((p) => (
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
                      className="mt-2.5 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-[#D5CABE] bg-[#FAF8F5] px-3 text-xs font-semibold text-[#1B3B2B] transition-colors hover:bg-stone-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#8C6D32]"
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
