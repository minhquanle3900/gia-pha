import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  AppSettings,
  FamilyBranch,
  LifeEvent,
  Person,
  Relationship,
  Union,
} from '../models/genealogy';
import { formatFlexibleDate, formatLifespan, formatLunarAnniversary } from '../utils/dateUtils';
import { escapeHtml } from '../utils/htmlUtils';

export interface ReportConfig {
  theme: 'heritage' | 'monochrome' | 'vermilion';
  paperSize: 'a4' | 'letter';
  density: 'compact' | 'complete';
  showPortrait: boolean;
  showTraditionalNames: boolean;
  showBio: boolean;
  showMerits: boolean;
  showAncestral: boolean;
  showParents: boolean;
  showSpouses: boolean;
  showChildren: boolean;
  showSiblings: boolean;
  showLifeEvents: boolean;
  showSignatures: boolean;
}

export const DEFAULT_REPORT_CONFIG: ReportConfig = {
  theme: 'heritage',
  paperSize: 'a4',
  density: 'complete',
  showPortrait: true,
  showTraditionalNames: true,
  showBio: true,
  showMerits: true,
  showAncestral: true,
  showParents: true,
  showSpouses: true,
  showChildren: true,
  showSiblings: true,
  showLifeEvents: true,
  showSignatures: true,
};

export interface PersonReportData {
  person: Person;
  branch?: FamilyBranch;
  parents: { relationship: Relationship; parent: Person }[];
  spouses: { union: Union; spouse?: Person }[];
  children: { relationship: Relationship; child: Person }[];
  siblings: Person[];
  lifeEvents: LifeEvent[];
  settings: AppSettings;
}

const CSS_PIXELS_PER_MM = 96 / 25.4;
const PDF_MARGIN = 12;
type PrintRange = { top: number; bottom: number };

/** Keep lines, table rows and the cover intact when they fit on a page. */
export function planPersonReportPages(
  contentHeight: number,
  pageHeight: number,
  protectedRanges: readonly PrintRange[],
): PrintRange[] {
  const total = Math.ceil(contentHeight);
  const pageSize = Math.floor(pageHeight);
  if (pageSize < 1) throw new RangeError('Print page height must be positive');
  const ranges = [...protectedRanges].sort((a, b) => b.top - a.top);
  const pages: PrintRange[] = [];

  for (let top = 0; top < total;) {
    const limit = Math.min(top + pageSize, total);
    let bottom = limit;
    for (const range of ranges) {
      const start = Math.floor(range.top);
      const end = Math.ceil(range.bottom);
      if (end - start <= pageSize && start > top && start < bottom && bottom < end) {
        bottom = start;
      }
    }
    pages.push({ top, bottom });
    top = bottom;
  }
  return pages;
}

function getProtectedPrintRanges(body: HTMLElement): PrintRange[] {
  const origin = body.getBoundingClientRect().top;
  const relative = ({ top, bottom }: PrintRange): PrintRange => ({
    top: top - origin,
    bottom: bottom - origin,
  });
  const ranges = Array.from(body.querySelectorAll('[data-keep], tr'), (element) =>
    relative(element.getBoundingClientRect()),
  );
  for (const heading of body.querySelectorAll('.section-title')) {
    const content = heading.nextElementSibling;
    const firstRow = content?.querySelector('tbody tr');
    const bounds = content?.getBoundingClientRect();
    const firstLineBottom = bounds && bounds.top + 20;
    ranges.push(relative({
      top: heading.getBoundingClientRect().top,
      bottom: firstRow?.getBoundingClientRect().bottom ?? firstLineBottom ?? heading.getBoundingClientRect().bottom,
    }));
  }
  for (const prose of body.querySelectorAll('[data-print-lines]')) {
    const range = body.ownerDocument.createRange();
    range.selectNodeContents(prose);
    ranges.push(...Array.from(range.getClientRects(), relative));
  }
  return ranges;
}

function loadPrintDocument(frame: HTMLIFrameElement, html: string): Promise<Document> {
  return new Promise((resolve, reject) => {
    frame.addEventListener('load', () => {
      const report = frame.contentDocument;
      if (report?.querySelector('.sheet')) resolve(report);
      else reject(new Error('Không thể mở tài liệu in hồ sơ.'));
    }, { once: true });
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
}

function createPrintFrame(width: number, height: number, permissions: string): HTMLIFrameElement {
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', permissions);
  frame.setAttribute('aria-hidden', 'true');
  frame.tabIndex = -1;
  Object.assign(frame.style, {
    position: 'fixed',
    left: `-${width + 10}px`,
    top: '0',
    width: `${width}px`,
    height: `${height}px`,
    border: '0',
    pointerEvents: 'none',
  });
  return frame;
}

export async function printPersonReport(data: PersonReportData, config: ReportConfig): Promise<void> {
  const width = Math.floor((config.paperSize === 'letter' ? 215.9 : 210) * CSS_PIXELS_PER_MM);
  const height = Math.floor((config.paperSize === 'letter' ? 279.4 : 297) * CSS_PIXELS_PER_MM);
  const frame = createPrintFrame(width, height, 'allow-same-origin allow-modals');
  try {
    const report = await loadPrintDocument(frame, generateStandalonePrintableHtml(data, config, true));
    await report.fonts.ready;
    const printWindow = frame.contentWindow;
    if (!printWindow) throw new Error('Không thể mở hộp thoại in.');
    printWindow.addEventListener('afterprint', () => frame.remove(), { once: true });
    printWindow.print();
  } catch (err) {
    frame.remove();
    throw err;
  }
}

export async function exportPersonReportPdf(
  data: PersonReportData,
  config: ReportConfig,
): Promise<void> {
  const pdf = new jsPDF('p', 'mm', config.paperSize);
  const printWidth = pdf.internal.pageSize.getWidth() - 2 * PDF_MARGIN;
  const printHeight = pdf.internal.pageSize.getHeight() - 2 * PDF_MARGIN;
  const width = Math.floor(printWidth * CSS_PIXELS_PER_MM);
  const pageHeight = Math.floor(printHeight * width / printWidth);
  const frame = createPrintFrame(width, pageHeight, 'allow-same-origin');

  try {
    const report = await loadPrintDocument(frame, generateStandalonePrintableHtml(data, config, true));
    await report.fonts.ready;
    const { body } = report;
    const pages = planPersonReportPages(body.getBoundingClientRect().height, pageHeight, getProtectedPrintRanges(body));

    for (const [index, { top, bottom }] of pages.entries()) {
      const canvas = await html2canvas(body, {
        x: 0,
        y: top,
        width,
        height: bottom - top,
        windowWidth: width,
        windowHeight: pageHeight,
        scrollX: 0,
        scrollY: 0,
        scale: 2,
        logging: false,
        backgroundColor: '#FFFDF9',
      });
      const image = canvas.toDataURL('image/jpeg', 0.95);
      canvas.width = canvas.height = 0;
      if (image === 'data:,') throw new Error('Trình duyệt không thể tạo ảnh PDF cho hồ sơ này.');
      if (index > 0) pdf.addPage();
      pdf.addImage(image, 'JPEG', PDF_MARGIN, PDF_MARGIN, printWidth, (bottom - top) * printWidth / width);
    }
    pdf.save(personReportFileName(data.person));
  } finally {
    frame.remove();
  }
}

/**
 * Builds a plain text / Markdown dossier summary for clipboard or text archives.
 */
export function buildTextDossierSummary(data: PersonReportData): string {
  const { person, branch, parents, spouses, children, siblings, settings } = data;

  const lines: string[] = [];
  lines.push(`=======================================================`);
  lines.push(`TRÍCH LỤC TIỂU SỬ PHẢ KÝ CÁ NHÂN`);
  lines.push(`DÒNG HỌ: ${settings.clanName.toUpperCase()}`);
  if (settings.clanMotto) lines.push(`GIA HUẤN: "${settings.clanMotto}"`);
  lines.push(`=======================================================`);
  lines.push(``);
  lines.push(`I. THÔNG TIN BẢN THÂN`);
  lines.push(`- Họ và tên: ${person.fullName}`);
  lines.push(`- Giới tính: ${person.gender === 'male' ? 'Nam' : person.gender === 'female' ? 'Nữ' : 'Chưa rõ'}`);
  lines.push(`- Thế hệ: Đời thứ ${person.generation ?? '—'}`);
  if (branch) lines.push(`- Chi họ: ${branch.name}`);
  if (person.subBranch) lines.push(`- Phái: ${person.subBranch}`);
  if (person.clanRole) lines.push(`- Vai vế: ${person.clanRole}`);
  if (person.tabooName) lines.push(`- Tên húy (tế tự): ${person.tabooName}`);
  if (person.courtesyName) lines.push(`- Tên tự/hiệu: ${person.courtesyName}`);
  if (person.commonName) lines.push(`- Tên thường gọi: ${person.commonName}`);
  lines.push(`- Trạng thái: ${person.isLiving ? 'Còn sống' : 'Đã tạ thế'}`);
  lines.push(`- Thọ mệnh: ${formatLifespan(person.birthDate, person.deathDate, person.isLiving)}`);
  lines.push(`- Ngày sinh: ${formatFlexibleDate(person.birthDate)}${person.birthPlace ? ` tại ${person.birthPlace}` : ''}`);
  if (!person.isLiving) {
    lines.push(`- Ngày mất: ${formatFlexibleDate(person.deathDate)}${person.deathPlace ? ` tại ${person.deathPlace}` : ''}`);
    if (person.deathAnniversaryLunar?.day) {
      lines.push(`- Ngày giỗ Âm lịch: ${formatLunarAnniversary(person.deathAnniversaryLunar)}`);
    }
    if (person.burialPlace) lines.push(`- Nơi an táng/Mộ phần: ${person.burialPlace}`);
  }
  if (person.ancestralHome) lines.push(`- Nguyên quán: ${person.ancestralHome}`);
  if (person.residence) lines.push(`- Nơi cư trú: ${person.residence}`);
  if (person.occupation) lines.push(`- Nghề nghiệp: ${person.occupation}`);
  if (person.merits) lines.push(`- Công đức dòng tộc: ${person.merits}`);
  if (person.biography) {
    lines.push(``);
    lines.push(`II. TIỂU SỬ HÀNH TRẠNG`);
    lines.push(person.biography);
  }

  lines.push(``);
  lines.push(`III. THÂN PHỤ - THÂN MẪU (CHA MẸ)`);
  if (parents.length === 0) {
    lines.push(`(Chưa ghi nhận thông tin cha mẹ)`);
  } else {
    parents.forEach(({ relationship, parent }) => {
      const role = parent.gender === 'male' ? 'Cha (Thân phụ)' : 'Mẹ (Thân mẫu)';
      const type = relationship.lineageType === 'adoptive' ? ' [Con nuôi]' : '';
      lines.push(`- ${role}: ${parent.fullName} (${formatLifespan(parent.birthDate, parent.deathDate, parent.isLiving)})${type}`);
    });
  }

  lines.push(``);
  lines.push(`IV. HÔN PHỐI / BẠN ĐỜI`);
  if (spouses.length === 0) {
    lines.push(`(Chưa ghi nhận bạn đời)`);
  } else {
    spouses.forEach(({ union, spouse }) => {
      const order =
        union.marriageOrder === 1
          ? 'Chính thất'
          : union.marriageOrder === 2
          ? 'Kế thất'
          : `Lần ${union.marriageOrder || 1}`;
      lines.push(
        `- ${order}: ${spouse?.fullName || 'Chưa rõ danh tính'} (${spouse ? formatLifespan(spouse.birthDate, spouse.deathDate, spouse.isLiving) : ''})`
      );
    });
  }

  lines.push(``);
  lines.push(`V. HẬU DUỆ (CON CÁI) (${children.length} người)`);
  if (children.length === 0) {
    lines.push(`(Chưa ghi nhận con cái)`);
  } else {
    children.forEach(({ child }, idx) => {
      const gender = child.gender === 'male' ? 'Nam' : 'Nữ';
      lines.push(
        `  ${idx + 1}. ${child.fullName} [${gender}] - ${formatLifespan(child.birthDate, child.deathDate, child.isLiving)}${child.generation ? ` (Đời ${child.generation})` : ''}`
      );
    });
  }

  if (siblings.length > 0) {
    lines.push(``);
    lines.push(`VI. ANH CHỊ EM RUỘT (${siblings.length} người)`);
    siblings.forEach((sib, idx) => {
      lines.push(`  ${idx + 1}. ${sib.fullName} (${formatLifespan(sib.birthDate, sib.deathDate, sib.isLiving)})`);
    });
  }

  lines.push(``);
  lines.push(`Trích lục ngày: ${new Date().toLocaleDateString('vi-VN')}`);
  lines.push(`Hệ thống Gia Phả Việt – Cội Nguồn`);
  return lines.join('\n');
}

/**
 * Creates a standalone offline HTML document for printing or archiving.
 */
export function generateStandalonePrintableHtml(
  data: PersonReportData,
  config: ReportConfig,
  forCapture = false,
): string {
  const { person, branch, parents, spouses, children, siblings, lifeEvents, settings } = data;
  const isMono = config.theme === 'monochrome';
  const isVermilion = config.theme === 'vermilion';

  const primaryColor = isMono ? '#1F1913' : isVermilion ? '#8C2A1E' : '#1B3B2B';
  const accentColor = isMono ? '#4A3F35' : isVermilion ? '#8C532F' : '#8C6D32';
  const portraitUrl = person.portraitUrl;
  // Embed local raster portraits; legacy URLs stay out of the exported document.
  const hasEmbeddedPortrait = /^data:image\/(?:png|jpe?g|webp|gif|avif);base64,/i.test(portraitUrl ?? '');

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Trích Lục Phả Ký – ${escapeHtml(person.fullName)}</title>
  <style>
    @page {
      size: ${config.paperSize === 'letter' ? 'letter' : 'A4'} portrait;
      margin: 12mm;
    }
    :root { color-scheme: light; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #FAF7F2;
      color: #231C16;
      line-height: 1.5;
      padding: 20px;
      overflow-wrap: anywhere;
    }
    body.capture { padding: 0; overflow: hidden; background: #FFFDF9; }
    .sheet {
      max-width: 820px;
      margin: 0 auto;
      background: #FFFDF9;
      border: 2px solid ${primaryColor};
      padding: 24px;
      position: relative;
    }
    .inner-border {
      border: 1px solid ${accentColor};
      padding: 16px;
    }
    .compact { padding: 16px; }
    .compact .inner-border { padding: 12px; }
    .compact .section-title { margin-top: 8px; }
    .header {
      text-align: center;
      border-bottom: 2px solid ${primaryColor};
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .clan-name {
      font-size: 14px;
      font-weight: 700;
      color: ${accentColor};
      text-transform: uppercase;
      letter-spacing: 2px;
    }
    .title {
      font-size: 22px;
      font-weight: bold;
      color: ${primaryColor};
      margin: 4px 0;
      font-family: serif;
    }
    .sub-title {
      font-size: 11px;
      color: #655A4E;
    }
    .section-title {
      font-size: 12px;
      font-weight: bold;
      color: ${primaryColor};
      border-bottom: 1px solid ${accentColor};
      padding-bottom: 3px;
      margin: 14px 0 8px 0;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px;
    }
    .with-portrait { grid-template-columns: auto repeat(2, minmax(0, 1fr)); }
    .portrait {
      width: 76px;
      text-align: center;
      color: #655A4E;
      font-size: 9px;
    }
    .portrait img, .portrait-initial {
      display: block;
      width: 76px;
      height: 86px;
      border: 1px solid ${accentColor};
      border-radius: 4px;
      background: #F4EFE6;
      object-fit: cover;
    }
    .portrait-initial {
      color: ${primaryColor};
      font: bold 26px/84px serif;
    }
    .event { margin-top: 5px; border: 1px solid #E7DFD4; padding: 5px 8px; font-size: 11px; }
    .info-item {
      display: grid;
      grid-template-columns: 100px minmax(0, 1fr);
      gap: 5px;
      font-size: 11px;
      margin-bottom: 4px;
    }
    .info-label {
      color: #655A4E;
    }
    .info-val {
      font-weight: 600;
      color: #1F1913;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
      margin-top: 6px;
    }
    th, td {
      border: 1px solid #D5CABE;
      padding: 5px 8px;
      text-align: left;
    }
    td { color: #231C16; }
    th {
      background: #F4EFE6;
      color: ${primaryColor};
      font-weight: bold;
    }
    .footer-signs {
      margin-top: 30px;
      display: flex;
      justify-content: space-between;
      text-align: center;
      font-size: 11px;
    }
    .sign-box {
      width: 220px;
    }
    .stamp-box {
      width: 90px;
      height: 90px;
      border: 1px dashed ${accentColor};
      margin: 12px auto;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${accentColor};
      font-size: 10px;
    }
    @media print {
      body { background: white; padding: 0; }
      body.capture { overflow: visible; }
      .sheet { border: 2px solid ${primaryColor}; box-shadow: none; max-width: 100%; }
      .no-print { display: none; }
      [data-keep], tr { break-inside: avoid; }
      .section-title { break-after: avoid; }
      .sheet { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    }
  </style>
</head>
<body${forCapture ? ' class="capture"' : ''}>
  ${forCapture ? '' : `<div class="no-print" style="max-width: 820px; margin: 0 auto 12px auto; text-align: right;">
    <button onclick="window.print()" style="padding: 8px 16px; background: ${primaryColor}; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">In tài liệu / Lưu PDF</button>
  </div>`}
  <div class="sheet${config.density === 'compact' ? ' compact' : ''}">
    <div class="inner-border">
      <div class="header" data-keep>
        <div class="clan-name">DÒNG HỌ ${escapeHtml(settings.clanName.toUpperCase())}</div>
        <h1 class="title">TRÍCH LỤC TIỂU SỬ PHẢ KÝ</h1>
        <div class="sub-title">Số hiệu: GPV-${escapeHtml(person.id.slice(0, 8).toUpperCase())} · Trích lục ngày: ${new Date().toLocaleDateString('vi-VN')}</div>
        ${settings.clanMotto ? `<div style="font-size: 10px; font-style: italic; color: ${accentColor}; margin-top: 3px;">"${escapeHtml(settings.clanMotto)}"</div>` : ''}
      </div>

      <div class="section-title">I. Thông Tin Cá Nhân & Danh Xưng</div>
      <div class="grid-2${config.showPortrait ? ' with-portrait' : ''}" data-keep>
          ${config.showPortrait ? `
            <figure class="portrait">
              ${hasEmbeddedPortrait ? `<img src="${escapeHtml(portraitUrl)}" alt="">` : `<span class="portrait-initial">${escapeHtml(person.fullName.trim().charAt(0).toUpperCase())}</span>`}
              <figcaption>${person.isLiving ? 'Ảnh chân dung' : 'Di ảnh tiền nhân'}</figcaption>
            </figure>
          ` : ''}
        <div>
          <div class="info-item"><span class="info-label">Họ và tên:</span> <span class="info-val" style="font-size: 13px; color: ${primaryColor};">${escapeHtml(person.fullName)}</span></div>
          <div class="info-item"><span class="info-label">Giới tính:</span> <span class="info-val">${person.gender === 'male' ? 'Nam' : person.gender === 'female' ? 'Nữ' : 'Chưa rõ'}</span></div>
          <div class="info-item"><span class="info-label">Thế hệ:</span> <span class="info-val">Đời thứ ${escapeHtml(person.generation ?? '—')}</span></div>
          <div class="info-item"><span class="info-label">Chi phái:</span> <span class="info-val">${escapeHtml(branch?.name || 'Chưa phân chi')}${person.subBranch ? ` (${escapeHtml(person.subBranch)})` : ''}</span></div>
          <div class="info-item"><span class="info-label">Vai vế dòng tộc:</span> <span class="info-val">${escapeHtml(person.clanRole || 'Thành viên')}</span></div>
        </div>
        <div>
          ${config.showTraditionalNames ? `
          <div class="info-item"><span class="info-label">Tên húy (Tế tự):</span> <span class="info-val" style="color: #8C2A1E;">${escapeHtml(person.tabooName || '—')}</span></div>
          <div class="info-item"><span class="info-label">Tên tự / Tên hiệu:</span> <span class="info-val">${escapeHtml(person.courtesyName || '—')}</span></div>
          <div class="info-item"><span class="info-label">Tên thường gọi:</span> <span class="info-val">${escapeHtml(person.commonName || '—')}</span></div>
          ${person.alias ? `<div class="info-item"><span class="info-label">Bí danh:</span> <span class="info-val">${escapeHtml(person.alias)}</span></div>` : ''}
          ` : ''}
          <div class="info-item"><span class="info-label">Trạng thái:</span> <span class="info-val">${person.isLiving ? 'Còn sống' : 'Đã tạ thế'}</span></div>
          <div class="info-item"><span class="info-label">Thọ mệnh:</span> <span class="info-val">${escapeHtml(formatLifespan(person.birthDate, person.deathDate, person.isLiving))}</span></div>
        </div>
      </div>

      <div class="grid-2" data-keep style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #E7DFD4;">
        <div>
          <div class="info-item"><span class="info-label">Ngày sinh:</span> <span class="info-val">${escapeHtml(formatFlexibleDate(person.birthDate))}</span></div>
          <div class="info-item"><span class="info-label">Nơi sinh:</span> <span class="info-val">${escapeHtml(person.birthPlace || 'Chưa rõ')}</span></div>
          <div class="info-item"><span class="info-label">Nguyên quán:</span> <span class="info-val">${escapeHtml(person.ancestralHome || 'Chưa rõ')}</span></div>
        </div>
        <div>
          ${!person.isLiving ? `
          <div class="info-item"><span class="info-label">Ngày mất:</span> <span class="info-val">${escapeHtml(formatFlexibleDate(person.deathDate))}</span></div>
          ${config.showAncestral ? `
          <div class="info-item"><span class="info-label">Giỗ Âm lịch:</span> <span class="info-val" style="color: ${accentColor}; font-weight: bold;">${escapeHtml(formatLunarAnniversary(person.deathAnniversaryLunar) || 'Chưa ghi nhận')}</span></div>
          <div class="info-item"><span class="info-label">Nơi an táng:</span> <span class="info-val">${escapeHtml(person.burialPlace || 'Chưa ghi nhận')}</span></div>
          ` : ''}
          ` : ''}
          <div class="info-item"><span class="info-label">Nơi cư trú:</span> <span class="info-val">${escapeHtml(person.residence || 'Chưa rõ')}</span></div>
          <div class="info-item"><span class="info-label">Nghề nghiệp:</span> <span class="info-val">${escapeHtml(person.occupation || 'Chưa rõ')}</span></div>
        </div>
      </div>

      ${config.showMerits && person.merits ? `
      <div class="section-title">II. Công Đức & Đóng Góp Tông Tộc</div>
      <p data-print-lines style="font-size: 11px; color: #4A3F35; background: #FAF7F2; padding: 8px; border-left: 3px solid ${accentColor}; font-style: italic; white-space: pre-line;">
        ${escapeHtml(person.merits)}
      </p>
      ` : ''}

      ${config.showBio && person.biography ? `
      <div class="section-title">III. Tiểu Sử Hành Trạng</div>
      <p data-print-lines style="font-size: 11px; color: #3A2E25; line-height: 1.6; white-space: pre-line;">
        ${escapeHtml(person.biography)}
      </p>
      ` : ''}

      ${config.showLifeEvents && lifeEvents.length ? `
      <div class="section-title">Các Mốc Biến Cố Quan Trọng</div>
      <div>${lifeEvents.map((event) => `
        <div class="event" data-keep>
          <strong>${escapeHtml(event.title)}</strong> · ${escapeHtml(formatFlexibleDate(event.date))}
          ${event.location ? `<p>Địa điểm: ${escapeHtml(event.location)}</p>` : ''}
          ${event.description ? `<p data-print-lines style="white-space: pre-line;">${escapeHtml(event.description)}</p>` : ''}
        </div>
      `).join('')}</div>
      ` : ''}

      ${config.showParents ? `
      <div class="section-title">IV. Tiền Nhân / Thân Phụ - Thân Mẫu</div>
      <div class="grid-2">
        ${parents.length === 0 ? '<p style="font-size: 11px; color: #888; font-style: italic;">Chưa ghi nhận thông tin cha mẹ.</p>' : parents.map(({ relationship, parent }) => `
          <div data-keep style="background: #F9F6F0; padding: 6px 10px; border: 1px solid #E7DFD4; border-radius: 4px; font-size: 11px;">
            <strong>${parent.gender === 'male' ? 'Thân phụ (Cha)' : 'Thân mẫu (Mẹ)'}:</strong> ${escapeHtml(parent.fullName)}
            <div style="color: #655A4E; font-size: 10px; margin-top: 2px;">
              ${escapeHtml(formatLifespan(parent.birthDate, parent.deathDate, parent.isLiving))}${relationship.lineageType === 'adoptive' ? ' · Con nuôi' : ''}
            </div>
          </div>
        `).join('')}
      </div>
      ` : ''}

      ${config.showSpouses ? `
      <div class="section-title">V. Phối Ngẫu / Bạn Đời</div>
      ${spouses.length === 0 ? '<p style="font-size: 11px; color: #888; font-style: italic;">Chưa ghi nhận bạn đời.</p>' : `
        <table>
          <thead>
            <tr>
              <th>Thứ tự</th>
              <th>Họ và tên</th>
              <th>Năm sinh - Năm mất</th>
              <th>Tình trạng</th>
            </tr>
          </thead>
          <tbody>
            ${spouses.map(({ union, spouse }) => `
              <tr>
                <td>${union.marriageOrder === 1 ? 'Chính thất' : union.marriageOrder === 2 ? 'Kế thất' : `Lần ${escapeHtml(union.marriageOrder || 1)}`}</td>
                <td><strong>${escapeHtml(spouse?.fullName || 'Chưa rõ danh tính')}</strong></td>
                <td>${spouse ? escapeHtml(formatLifespan(spouse.birthDate, spouse.deathDate, spouse.isLiving)) : '—'}</td>
                <td>${spouse ? (spouse.isLiving ? 'Còn sống' : 'Đã tạ thế') : '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
      ` : ''}

      ${config.showChildren ? `
      <div class="section-title">VI. Hậu Duệ / Con Cái (${children.length} người)</div>
      ${children.length === 0 ? '<p style="font-size: 11px; color: #888; font-style: italic;">Chưa ghi nhận con cái.</p>' : `
        <table>
          <thead>
            <tr>
              <th style="width: 38px; white-space: nowrap;">STT</th>
              <th>Họ và tên</th>
              <th>Giới tính</th>
              <th>Năm sinh - mất</th>
              <th>Thế hệ</th>
              <th>Dòng máu</th>
            </tr>
          </thead>
          <tbody>
            ${children.map(({ child, relationship }, i) => `
              <tr>
                <td style="text-align: center;">${escapeHtml(relationship.birthOrder || i + 1)}</td>
                <td><strong>${escapeHtml(child.fullName)}</strong></td>
                <td>${child.gender === 'male' ? 'Nam' : 'Nữ'}</td>
                <td>${escapeHtml(formatLifespan(child.birthDate, child.deathDate, child.isLiving))}</td>
                <td>${child.generation ? `Đời ${escapeHtml(child.generation)}` : '—'}</td>
                <td>${relationship.lineageType === 'adoptive' ? 'Con nuôi' : relationship.lineageType === 'biological' ? 'Con ruột' : '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
      ` : ''}

      ${config.showSiblings && siblings.length ? `
      <div class="section-title">VII. Anh Chị Em</div>
      <div>${siblings.map((sibling) => `
        <p class="event" data-keep><strong>${escapeHtml(sibling.fullName)}</strong> · ${escapeHtml(formatLifespan(sibling.birthDate, sibling.deathDate, sibling.isLiving))}</p>
      `).join('')}</div>
      ` : ''}

      ${config.showSignatures ? `
      <div class="footer-signs" data-keep>
        <div class="sign-box">
          <p><strong>NGƯỜI TRÍCH LỤC PHẢ KÝ</strong></p>
          <p style="color: #655A4E; font-size: 10px;">(Ký, ghi rõ họ tên)</p>
          <div style="height: 60px;"></div>
          <p style="border-top: 1px dotted #888; padding-top: 4px; display: inline-block; width: 140px;">Ban Trị Sự Tông Tộc</p>
        </div>
        <div class="sign-box">
          <p><strong>TRƯỞNG TỘC CHỨNG NHẬN</strong></p>
          <p style="color: #655A4E; font-size: 10px;">(Ký tên và thị thực)</p>
          <div class="stamp-box">TỘC ẤN<br>THỊ THỰC</div>
          <p style="font-weight: bold; color: ${primaryColor};">Hội Đồng Tộc Biểu</p>
        </div>
      </div>
      ` : ''}
    </div>
  </div>
</body>
</html>`;
}

/**
 * Downloads a personal dossier using the same print template for direct and modal export.
 */
export async function exportPersonReportToPdfDirect(
  data: PersonReportData,
  config: ReportConfig = DEFAULT_REPORT_CONFIG,
): Promise<'layout' | 'text'> {
  const fileName = personReportFileName(data.person);
  if (typeof document === 'undefined') {
    const doc = new jsPDF('p', 'mm', config.paperSize);
    doc.text(`TRICH LUC TIEU SU PHA KY - ${data.person.fullName}`, 20, 20);
    doc.save(fileName);
    return 'text';
  }

  try {
    await exportPersonReportPdf(data, config);
    return 'layout';
  } catch (err) {
    console.warn('Canvas export failed, falling back to direct jsPDF text document:', err);
    const doc = new jsPDF('p', 'mm', config.paperSize);
    doc.setFont('helvetica', 'normal');
    let cursorY = 20;
    doc.setFontSize(14);
    doc.setTextColor(27, 59, 43);
    doc.text(`TRICH LUC PHA KY: ${data.person.fullName.toUpperCase()}`, 20, cursorY);
    cursorY += 10;

    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);
    const splitText = doc.splitTextToSize(buildTextDossierSummary(data), doc.internal.pageSize.getWidth() - 40);
    for (const line of splitText) {
      if (cursorY > doc.internal.pageSize.getHeight() - 17) {
        doc.addPage();
        cursorY = 20;
      }
      doc.text(line, 20, cursorY);
      cursorY += 6;
    }

    doc.save(fileName);
    return 'text';
  }
}

function personReportFileName(person: Person): string {
  return `Ho_So_Gia_Pha_${person.fullName.replace(/\s+/g, '_')}.pdf`;
}
