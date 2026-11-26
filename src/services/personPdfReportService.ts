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

const captureColorProperties = [
  'color', 'background-color',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'box-shadow', 'text-shadow', 'text-decoration-color', '-webkit-text-stroke-color', 'fill', 'stroke',
];

/** Convert computed colors in html2canvas's cloned document to its supported sRGB syntax. */
function normalizePdfCaptureColors(document: Document, report: HTMLElement): void {
  const view = document.defaultView;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!view || !context) return;

  const normalized = new Map<string, string>();
  const modernColor = /\b(?:oklab|oklch|lab|lch|color)\([^()]*\)/gi;
  const toRgb = (color: string): string => {
    const cached = normalized.get(color);
    if (cached) return cached;

    // Let the browser convert from the original color space and preserve opacity.
    context.clearRect(0, 0, 1, 1);
    context.fillStyle = color;
    context.fillRect(0, 0, 1, 1);
    const [red, green, blue, alpha] = context.getImageData(0, 0, 1, 1).data;
    const rgba = 'rgba(' + [red, green, blue, (alpha / 255).toFixed(3)].join(', ') + ')';
    normalized.set(color, rgba);
    return rgba;
  };

  // html2canvas reads the root and body backgrounds even when capturing a subtree.
  const elements = [document.documentElement, document.body, report, ...report.querySelectorAll<HTMLElement | SVGElement>('*')];
  for (const element of elements) {
    const computed = view.getComputedStyle(element);
    for (const property of captureColorProperties) {
      const color = computed.getPropertyValue(property);
      const replacement = color.replace(modernColor, toRgb);
      if (replacement !== color) element.style.setProperty(property, replacement, 'important');
    }
  }
}

/**
 * Generates and downloads a high-fidelity PDF from an HTML element using html2canvas & jsPDF.
 */
export async function exportElementToPdf(
  element: HTMLElement,
  fileName: string,
  paperSize: 'a4' | 'letter' = 'a4'
): Promise<void> {
  const isLetter = paperSize === 'letter';
  const pdfWidth = isLetter ? 215.9 : 210; // mm
  const pdfHeight = isLetter ? 279.4 : 297; // mm

  // Capture canvas with 2x scale for crisp printing
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#FAF7F2',
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
    onclone: normalizePdfCaptureColors,
  });

  const { width: canvasWidth, height: canvasHeight } = canvas;
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  if (!canvasWidth || !canvasHeight || imgData === 'data:,') {
    throw new Error('Trình duyệt không thể tạo ảnh PDF cho khổ và độ dài hồ sơ này.');
  }
  const pdf = new jsPDF('p', 'mm', paperSize);

  // Calculate proportional height in mm
  const imgHeightMm = (canvasHeight * pdfWidth) / canvasWidth;

  // If content fits comfortably on one page
  if (imgHeightMm <= pdfHeight) {
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, imgHeightMm);
  } else {
    // Multi-page slicing
    let heightLeft = imgHeightMm;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeightMm);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = position - pdfHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeightMm);
      heightLeft -= pdfHeight;
    }
  }

  pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
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
  config: ReportConfig
): string {
  const { person, branch, parents, spouses, children, siblings, settings } = data;
  const isMono = config.theme === 'monochrome';
  const isVermilion = config.theme === 'vermilion';

  const primaryColor = isMono ? '#1F1913' : isVermilion ? '#8C2A1E' : '#1B3B2B';
  const accentColor = isMono ? '#4A3F35' : isVermilion ? '#C5A059' : '#8C6D32';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <title>Trích Lục Phả Ký – ${escapeHtml(person.fullName)}</title>
  <style>
    @page {
      size: ${config.paperSize === 'letter' ? 'letter' : 'A4'} portrait;
      margin: 12mm 15mm;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #FAF7F2;
      color: #231C16;
      line-height: 1.5;
      padding: 20px;
    }
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
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .info-item {
      font-size: 11px;
      margin-bottom: 4px;
    }
    .info-label {
      color: #655A4E;
      display: inline-block;
      width: 130px;
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
      .sheet { border: 2px solid ${primaryColor}; box-shadow: none; max-width: 100%; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print" style="max-width: 820px; margin: 0 auto 12px auto; text-align: right;">
    <button onclick="window.print()" style="padding: 8px 16px; background: ${primaryColor}; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: bold;">In tài liệu / Lưu PDF</button>
  </div>
  <div class="sheet">
    <div class="inner-border">
      <div class="header">
        <div class="clan-name">DÒNG HỌ ${escapeHtml(settings.clanName.toUpperCase())}</div>
        <h1 class="title">TRÍCH LỤC TIỂU SỬ PHẢ KÝ</h1>
        <div class="sub-title">Số hiệu: GPV-${escapeHtml(person.id.slice(0, 8).toUpperCase())} · Trích lục ngày: ${new Date().toLocaleDateString('vi-VN')}</div>
        ${settings.clanMotto ? `<div style="font-size: 10px; font-style: italic; color: ${accentColor}; margin-top: 3px;">"${escapeHtml(settings.clanMotto)}"</div>` : ''}
      </div>

      <div class="section-title">I. Thông Tin Cá Nhân & Danh Xưng</div>
      <div class="grid-2">
        <div>
          <div class="info-item"><span class="info-label">Họ và tên:</span> <span class="info-val" style="font-size: 13px; color: ${primaryColor};">${escapeHtml(person.fullName)}</span></div>
          <div class="info-item"><span class="info-label">Giới tính:</span> <span class="info-val">${person.gender === 'male' ? 'Nam' : person.gender === 'female' ? 'Nữ' : 'Chưa rõ'}</span></div>
          <div class="info-item"><span class="info-label">Thế hệ:</span> <span class="info-val">Đời thứ ${escapeHtml(person.generation ?? '—')}</span></div>
          <div class="info-item"><span class="info-label">Chi phái:</span> <span class="info-val">${escapeHtml(branch?.name || 'Chưa phân chi')}${person.subBranch ? ` (${escapeHtml(person.subBranch)})` : ''}</span></div>
          <div class="info-item"><span class="info-label">Vai vế dòng tộc:</span> <span class="info-val">${escapeHtml(person.clanRole || 'Thành viên')}</span></div>
        </div>
        <div>
          <div class="info-item"><span class="info-label">Tên húy (Tế tự):</span> <span class="info-val" style="color: #8C2A1E;">${escapeHtml(person.tabooName || '—')}</span></div>
          <div class="info-item"><span class="info-label">Tên tự / Tên hiệu:</span> <span class="info-val">${escapeHtml(person.courtesyName || '—')}</span></div>
          <div class="info-item"><span class="info-label">Tên thường gọi:</span> <span class="info-val">${escapeHtml(person.commonName || '—')}</span></div>
          <div class="info-item"><span class="info-label">Trạng thái:</span> <span class="info-val">${person.isLiving ? 'Còn sống' : 'Đã tạ thế'}</span></div>
          <div class="info-item"><span class="info-label">Thọ mệnh:</span> <span class="info-val">${escapeHtml(formatLifespan(person.birthDate, person.deathDate, person.isLiving))}</span></div>
        </div>
      </div>

      <div class="grid-2" style="margin-top: 6px; padding-top: 6px; border-top: 1px dashed #E7DFD4;">
        <div>
          <div class="info-item"><span class="info-label">Ngày sinh:</span> <span class="info-val">${escapeHtml(formatFlexibleDate(person.birthDate))}</span></div>
          <div class="info-item"><span class="info-label">Nơi sinh:</span> <span class="info-val">${escapeHtml(person.birthPlace || 'Chưa rõ')}</span></div>
          <div class="info-item"><span class="info-label">Nguyên quán:</span> <span class="info-val">${escapeHtml(person.ancestralHome || 'Chưa rõ')}</span></div>
        </div>
        <div>
          ${!person.isLiving ? `
          <div class="info-item"><span class="info-label">Ngày mất:</span> <span class="info-val">${escapeHtml(formatFlexibleDate(person.deathDate))}</span></div>
          <div class="info-item"><span class="info-label">Giỗ Âm lịch:</span> <span class="info-val" style="color: ${accentColor}; font-weight: bold;">${escapeHtml(formatLunarAnniversary(person.deathAnniversaryLunar) || 'Chưa ghi nhận')}</span></div>
          <div class="info-item"><span class="info-label">Nơi an táng:</span> <span class="info-val">${escapeHtml(person.burialPlace || 'Chưa ghi nhận')}</span></div>
          ` : `
          <div class="info-item"><span class="info-label">Nơi cư trú:</span> <span class="info-val">${escapeHtml(person.residence || 'Chưa rõ')}</span></div>
          <div class="info-item"><span class="info-label">Nghề nghiệp:</span> <span class="info-val">${escapeHtml(person.occupation || 'Chưa rõ')}</span></div>
          `}
        </div>
      </div>

      ${config.showMerits && person.merits ? `
      <div class="section-title">II. Công Đức & Đóng Góp Tông Tộc</div>
      <p style="font-size: 11px; color: #4A3F35; background: #FAF7F2; padding: 8px; border-left: 3px solid ${accentColor}; font-style: italic;">
        ${escapeHtml(person.merits)}
      </p>
      ` : ''}

      ${config.showBio && person.biography ? `
      <div class="section-title">III. Tiểu Sử Hành Trạng</div>
      <p style="font-size: 11px; color: #3A2E25; text-align: justify; line-height: 1.6; white-space: pre-line;">
        ${escapeHtml(person.biography)}
      </p>
      ` : ''}

      ${config.showParents ? `
      <div class="section-title">IV. Tiền Nhân / Thân Phụ - Thân Mẫu</div>
      <div class="grid-2">
        ${parents.length === 0 ? '<p style="font-size: 11px; color: #888; font-style: italic;">Chưa ghi nhận thông tin cha mẹ.</p>' : parents.map(({ relationship, parent }) => `
          <div style="background: #F9F6F0; padding: 6px 10px; border: 1px solid #E7DFD4; border-radius: 4px; font-size: 11px;">
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
              <th style="width: 35px;">STT</th>
              <th>Họ và tên</th>
              <th>Giới tính</th>
              <th>Năm sinh - mất</th>
              <th>Thế hệ</th>
            </tr>
          </thead>
          <tbody>
            ${children.map(({ child }, i) => `
              <tr>
                <td style="text-align: center;">${i + 1}</td>
                <td><strong>${escapeHtml(child.fullName)}</strong></td>
                <td>${child.gender === 'male' ? 'Nam' : 'Nữ'}</td>
                <td>${escapeHtml(formatLifespan(child.birthDate, child.deathDate, child.isLiving))}</td>
                <td>${child.generation ? `Đời ${escapeHtml(child.generation)}` : '—'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `}
      ` : ''}

      ${config.showSignatures ? `
      <div class="footer-signs">
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
 * Directly exports a Person's profile report as a PDF file using jsPDF.
 * Creates an off-screen DOM element from the printable HTML template,
 * renders it using html2canvas & jsPDF, and triggers direct download.
 * Also includes a resilient pure-jsPDF fallback if canvas capture is blocked.
 */
export async function exportPersonReportToPdfDirect(
  data: PersonReportData,
  config: ReportConfig = DEFAULT_REPORT_CONFIG
): Promise<'layout' | 'text'> {
  const cleanFileName = `Ho_So_Gia_Pha_${data.person.fullName.replace(/\s+/g, '_')}`;

  if (typeof document === 'undefined') {
    // Node environment fallback for testing
    const doc = new jsPDF('p', 'mm', config.paperSize);
    doc.text(`TRICH LUC TIEU SU PHA KY - ${data.person.fullName}`, 20, 20);
    doc.save(`${cleanFileName}.pdf`);
    return 'text';
  }

  // Create temporary off-screen container
  const tempDiv = document.createElement('div');
  tempDiv.id = `temp-pdf-export-${Date.now()}`;
  tempDiv.style.position = 'fixed';
  tempDiv.style.left = '-9999px';
  tempDiv.style.top = '0';
  tempDiv.style.width = config.paperSize === 'letter' ? '816px' : '794px';
  tempDiv.style.zIndex = '-1000';
  tempDiv.style.background = '#FAF7F2';
  tempDiv.style.padding = '20px';
  tempDiv.style.boxSizing = 'border-box';
  tempDiv.style.opacity = '1';

  // Extract body inner content from standalone printable HTML
  const fullHtml = generateStandalonePrintableHtml(data, config);
  const bodyMatch = fullHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyContent = bodyMatch ? bodyMatch[1] : fullHtml;

  // Extract style tag
  const styleMatch = fullHtml.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
  const styles = styleMatch ? `<style>${styleMatch[1]}</style>` : '';

  tempDiv.innerHTML = `${styles}<div class="pdf-wrapper" style="background:#FAF7F2; padding: 10px;">${bodyContent}</div>`;
  document.body.appendChild(tempDiv);

  try {
    // Wait for fonts/layout calculation
    if (document.fonts) {
      await document.fonts.ready;
    }
    await new Promise((res) => setTimeout(res, 120));

    await exportElementToPdf(tempDiv, cleanFileName, config.paperSize);
    return 'layout';
  } catch (err) {
    console.warn('Canvas export failed, falling back to direct jsPDF text document:', err);
    // Direct jsPDF text fallback
    const doc = new jsPDF('p', 'mm', config.paperSize);
    doc.setFont('helvetica', 'normal');
    const textSummary = buildTextDossierSummary(data);
    const splitText = doc.splitTextToSize(textSummary, 170);

    let cursorY = 20;
    doc.setFontSize(14);
    doc.setTextColor(27, 59, 43);
    doc.text(`TRICH LUC PHA KY: ${data.person.fullName.toUpperCase()}`, 20, cursorY);
    cursorY += 10;

    doc.setFontSize(10);
    doc.setTextColor(40, 40, 40);

    for (const line of splitText) {
      if (cursorY > 280) {
        doc.addPage();
        cursorY = 20;
      }
      doc.text(line, 20, cursorY);
      cursorY += 6;
    }

    doc.save(`${cleanFileName}.pdf`);
    return 'text';
  } finally {
    if (document.body.contains(tempDiv)) {
      document.body.removeChild(tempDiv);
    }
  }
}

