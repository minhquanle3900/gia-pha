import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  AppSettings,
  FamilyBranch,
  FamilyStory,
  Person,
  Relationship,
  Union,
} from '../models/genealogy';
import { formatFlexibleDate, formatLifespan, formatLunarAnniversary } from '../utils/dateUtils';
import { escapeHtml } from '../utils/htmlUtils';

export interface FamilyBookExportData {
  settings: AppSettings;
  people: Person[];
  branches: FamilyBranch[];
  stories: FamilyStory[];
  relationships: Relationship[];
  unions: Union[];
}

export interface FamilyBookPrintConfig {
  paperSize: 'a4' | 'letter';
  includeCover: boolean;
  includePreface: boolean;
  includeBranches: boolean;
  includeGenerations: boolean;
  includeRelationships: boolean;
  includeTabooIndex: boolean;
}

export const DEFAULT_FAMILY_BOOK_CONFIG: FamilyBookPrintConfig = {
  paperSize: 'a4',
  includeCover: true,
  includePreface: true,
  includeBranches: true,
  includeGenerations: true,
  includeRelationships: true,
  includeTabooIndex: true,
};

function getPeopleByGeneration(people: Person[]): { generation: number; members: Person[] }[] {
  const map = new Map<number, Person[]>();
  for (const p of people) {
    const gen = p.generation ?? 1;
    const list = map.get(gen) ?? [];
    list.push(p);
    map.set(gen, list);
  }
  return Array.from(map.keys())
    .sort((a, b) => a - b)
    .map((gen) => ({
      generation: gen,
      members: map.get(gen)!.sort((a, b) => {
        const yA = a.birthDate?.year ?? 9999;
        const yB = b.birthDate?.year ?? 9999;
        if (yA !== yB) return yA - yB;
        return a.fullName.localeCompare(b.fullName, 'vi');
      }),
    }));
}

interface RelationLookup {
  personMap: Map<string, Person>;
  branchMap: Map<string, FamilyBranch>;
  parentsByChild: Map<string, Person[]>;
  childrenByParent: Map<string, Person[]>;
  spousesByPerson: Map<string, Person[]>;
}

function buildRelationLookup(data: FamilyBookExportData): RelationLookup {
  const personMap = new Map<string, Person>(data.people.map((p) => [p.id, p]));
  const branchMap = new Map<string, FamilyBranch>(data.branches.map((b) => [b.id, b]));
  const parentsByChild = new Map<string, Person[]>();
  const childrenByParent = new Map<string, Person[]>();
  const spousesByPerson = new Map<string, Person[]>();

  for (const rel of data.relationships) {
    const parent = personMap.get(rel.parentId);
    const child = personMap.get(rel.childId);
    if (parent && child) {
      const pList = parentsByChild.get(child.id) ?? [];
      if (!pList.some((x) => x.id === parent.id)) pList.push(parent);
      parentsByChild.set(child.id, pList);

      const cList = childrenByParent.get(parent.id) ?? [];
      if (!cList.some((x) => x.id === child.id)) cList.push(child);
      childrenByParent.set(parent.id, cList);
    }
  }

  for (const union of data.unions) {
    if (union.partnerIds.length < 2) continue;
    const [idA, idB] = union.partnerIds;
    const pA = personMap.get(idA);
    const pB = personMap.get(idB);
    if (pA && pB) {
      const sA = spousesByPerson.get(idA) ?? [];
      if (!sA.some((x) => x.id === pB.id)) sA.push(pB);
      spousesByPerson.set(idA, sA);

      const sB = spousesByPerson.get(idB) ?? [];
      if (!sB.some((x) => x.id === pA.id)) sB.push(pA);
      spousesByPerson.set(idB, sB);
    }
  }

  return { personMap, branchMap, parentsByChild, childrenByParent, spousesByPerson };
}

const BOOK_STYLES = `
  .fb-root {
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #231C16;
    background: #FFFFFF;
    line-height: 1.5;
  }
  .fb-cover {
    text-align: center;
    padding: 56px 36px;
    border: 6px double #1B3B2B;
    border-radius: 16px;
    background: #FAF7F2;
    position: relative;
  }
  .fb-cover-corner {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 11px;
    font-weight: 700;
    color: #8C6D32;
    letter-spacing: 2px;
    margin-bottom: 24px;
  }
  .fb-seal {
    width: 64px;
    height: 64px;
    border-radius: 14px;
    background: #1B3B2B;
    color: #DBC599;
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 30px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 24px auto;
  }
  .fb-subtitle {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 3px;
    font-weight: 700;
    color: #8C6D32;
    margin-bottom: 10px;
  }
  .fb-cover-title {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 38px;
    font-weight: 700;
    color: #1B3B2B;
    margin: 0 0 14px 0;
  }
  .fb-motto {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 17px;
    font-style: italic;
    color: #54483C;
    max-width: 500px;
    margin: 0 auto 28px auto;
  }
  .fb-cover-meta {
    border-top: 1px solid #D5CABE;
    padding-top: 18px;
    max-width: 420px;
    margin: 0 auto;
    font-size: 11px;
    color: #5C4F42;
    line-height: 1.7;
  }
  .fb-section-heading {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 20px;
    font-weight: 700;
    color: #1B3B2B;
    text-align: center;
    border-bottom: 2px solid #1B3B2B;
    padding-bottom: 6px;
    margin: 0 0 14px 0;
    letter-spacing: 0.5px;
  }
  .fb-preface-text {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 14px;
    color: #332A22;
    line-height: 1.7;
    text-align: justify;
  }
  .fb-preface-text p {
    margin: 0 0 10px 0;
    text-indent: 24px;
  }
  .fb-story-box {
    margin-top: 12px;
    padding: 12px 14px;
    border-radius: 10px;
    background: #FAF8F5;
    border: 1px solid #E7DFD4;
    font-size: 11px;
    color: #4A3F35;
  }
  .fb-story-title {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 14px;
    font-weight: 700;
    color: #8C6D32;
    margin-bottom: 4px;
  }
  .fb-grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }
  .fb-branch-card {
    padding: 12px;
    border-radius: 10px;
    border: 1px solid #D5CABE;
    background: #FAF8F5;
    font-size: 11px;
  }
  .fb-branch-name {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 14px;
    font-weight: 700;
    color: #1F1913;
    margin-bottom: 4px;
  }
  .fb-gen-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 2px solid #1B3B2B;
    padding-bottom: 6px;
    margin-bottom: 12px;
  }
  .fb-gen-badge {
    display: inline-block;
    padding: 4px 10px;
    border-radius: 6px;
    background: #1B3B2B;
    color: #FFFFFF;
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.5px;
  }
  .fb-gen-count {
    font-size: 11px;
    color: #655A4E;
  }
  .fb-person-card {
    padding: 12px;
    border-radius: 10px;
    border: 1px solid #E7DFD4;
    background: #FFFDF9;
    font-size: 11px;
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  .fb-avatar {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    background: #EEF4F0;
    border: 1px solid #D5CABE;
    color: #1B3B2B;
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-weight: 700;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    overflow: hidden;
  }
  .fb-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .fb-person-body {
    flex: 1;
    min-width: 0;
  }
  .fb-person-top {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 6px;
  }
  .fb-person-name {
    font-family: 'Cormorant Garamond', Georgia, serif;
    font-size: 15px;
    font-weight: 700;
    color: #1F1913;
  }
  .fb-person-role {
    font-size: 10px;
    font-weight: 700;
    color: #8C6D32;
  }
  .fb-meta-line {
    font-size: 10.5px;
    color: #5C4F42;
    margin-top: 2px;
  }
  .fb-rel-line {
    font-size: 10px;
    color: #4A3B2C;
    margin-top: 3px;
    padding-top: 3px;
    border-top: 1px dashed #EAE2D6;
  }
  .fb-merit {
    font-size: 10px;
    color: #4A3B2C;
    font-style: italic;
    margin-top: 4px;
  }
  .fb-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 11px;
  }
  .fb-table th, .fb-table td {
    border: 1px solid #E7DFD4;
    padding: 6px 8px;
    text-align: left;
  }
  .fb-table th {
    background: #FAF7F2;
    color: #1B3B2B;
    font-weight: 700;
  }
  .fb-colophon {
    margin-top: 18px;
    padding-top: 14px;
    border-top: 2px double #D5CABE;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 10.5px;
    color: #655A4E;
  }
`;

function renderCoverHtml(data: FamilyBookExportData, genCount: number): string {
  const { settings, people, branches } = data;
  const exportDate = new Date().toLocaleDateString('vi-VN');
  return `
    <section class="fb-cover">
      <div class="fb-cover-corner">✦ QUỐC ÂM PHẢ KÝ ✦</div>
      <div class="fb-seal">源</div>
      <div class="fb-subtitle">Gia Phả Dòng Tộc Việt Nam</div>
      <h1 class="fb-cover-title">${escapeHtml(settings.clanName || 'Gia Phả Dòng Họ')}</h1>
      ${settings.clanMotto ? `<p class="fb-motto">"${escapeHtml(settings.clanMotto)}"</p>` : ''}
      <div class="fb-cover-meta">
        <div>Nhà thờ tổ: ${escapeHtml(settings.ancestralHallLocation || 'Việt Nam')}</div>
        <div>Quy mô phả lục: ${genCount} thế hệ · ${people.length} thành viên · ${branches.length} chi họ</div>
        <div>Biên tập & Kết xuất: Ngày ${escapeHtml(exportDate)}</div>
        <div>Lưu truyền vạn đại hậu thế tử tôn</div>
      </div>
    </section>
  `;
}

function renderPrefaceHtml(data: FamilyBookExportData): string {
  const firstStory = data.stories[0];
  return `
    <section>
      <h2 class="fb-section-heading">LỜI TỰA PHẢ KÝ (TIỀN NGÔN)</h2>
      <div class="fb-preface-text">
        <p>Cổ nhân có câu: "Mộc hữu bản, thủy hữu nguyên; nhân hữu tổ". Cây có gốc mới trổ nhánh đơm hoa kết trái, nước có nguồn mới chảy xiết thành sông lớn; con người có tổ tiên mới sinh sôi nảy nở đời đời nối tiếp.</p>
        <p>Phả ký dòng họ chính là linh hồn và cột mốc lịch sử thiêng liêng để con cháu đời sau nhìn vào, thấu suốt nguồn cội phát tích, tri ân đức dầy của các bậc Tiên tổ, hiểu rõ vai vế thứ bậc trên dưới, giữ trọn chữ Hiếu, chữ Đễ và đạo lý Uống nước nhớ nguồn.</p>
      </div>
      ${
        firstStory
          ? `<div class="fb-story-box">
              <div class="fb-story-title">${escapeHtml(firstStory.title)}</div>
              <div>${escapeHtml(firstStory.content)}</div>
            </div>`
          : ''
      }
    </section>
  `;
}

function renderBranchesHtml(branches: FamilyBranch[]): string {
  if (branches.length === 0) return '';
  return `
    <section>
      <h2 class="fb-section-heading">DANH SÁCH CÁC CHI PHÁI TRỰC THUỘC</h2>
      <div class="fb-grid-2">
        ${branches
          .map(
            (b) => `
          <div class="fb-branch-card">
            <div class="fb-branch-name">✦ ${escapeHtml(b.name)}${b.code ? ` (${escapeHtml(b.code)})` : ''}</div>
            ${b.description ? `<div style="color:#4A3F35;margin-bottom:4px;">${escapeHtml(b.description)}</div>` : ''}
            ${b.originPlace ? `<div style="color:#655A4E;">Địa bàn phát tích: ${escapeHtml(b.originPlace)}</div>` : ''}
            ${b.establishedPeriod ? `<div style="color:#655A4E;">Niên đại khởi chi: ${escapeHtml(b.establishedPeriod)}</div>` : ''}
            ${b.subBranches.length > 0 ? `<div style="color:#8C6D32;margin-top:2px;">Phái: ${escapeHtml(b.subBranches.join(', '))}</div>` : ''}
          </div>
        `
          )
          .join('')}
      </div>
    </section>
  `;
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  return parts[parts.length - 1].charAt(0).toUpperCase();
}

function renderPersonCardHtml(
  p: Person,
  lookup: RelationLookup,
  includeRelationships: boolean
): string {
  const branchName = p.branchId ? lookup.branchMap.get(p.branchId)?.name : undefined;
  const parents = lookup.parentsByChild.get(p.id) ?? [];
  const spouses = lookup.spousesByPerson.get(p.id) ?? [];
  const children = lookup.childrenByParent.get(p.id) ?? [];

  const namesParts: string[] = [];
  if (p.commonName) namesParts.push(`Thường gọi: ${escapeHtml(p.commonName)}`);
  if (p.tabooName) namesParts.push(`Húy: ${escapeHtml(p.tabooName)}`);
  if (p.courtesyName) namesParts.push(`Tự: ${escapeHtml(p.courtesyName)}`);

  const relParts: string[] = [];
  if (includeRelationships) {
    if (parents.length > 0) {
      relParts.push(`Phụ mẫu: ${parents.map((x) => escapeHtml(x.fullName)).join(', ')}`);
    }
    if (spouses.length > 0) {
      relParts.push(`Phối ngẫu: ${spouses.map((x) => escapeHtml(x.fullName)).join(', ')}`);
    }
    if (children.length > 0) {
      relParts.push(`Hậu duệ (${children.length}): ${children.map((x) => escapeHtml(x.fullName)).join(', ')}`);
    }
  }

  const avatarContent = p.portraitUrl
    ? `<img src="${escapeHtml(p.portraitUrl)}" alt="${escapeHtml(p.fullName)}" crossorigin="anonymous" />`
    : escapeHtml(getInitials(p.fullName));

  const deathAnniv =
    !p.isLiving && p.deathAnniversaryLunar?.day
      ? formatLunarAnniversary(p.deathAnniversaryLunar)
      : '';

  return `
    <div class="fb-person-card">
      <div class="fb-avatar">${avatarContent}</div>
      <div class="fb-person-body">
        <div class="fb-person-top">
          <span class="fb-person-name">${escapeHtml(p.fullName)}</span>
          ${p.clanRole ? `<span class="fb-person-role">${escapeHtml(p.clanRole)}</span>` : ''}
        </div>
        <div class="fb-meta-line">
          ${escapeHtml(p.gender === 'male' ? 'Nam' : p.gender === 'female' ? 'Nữ' : 'Chưa rõ')} · ${escapeHtml(
            formatLifespan(p.birthDate, p.deathDate, p.isLiving)
          )}${branchName ? ` · ${escapeHtml(branchName)}` : ''}
        </div>
        ${namesParts.length > 0 ? `<div class="fb-meta-line" style="color:#6E5F4F;">${namesParts.join(' · ')}</div>` : ''}
        ${
          p.birthDate?.precision && p.birthDate.precision !== 'unknown'
            ? `<div class="fb-meta-line">Sinh: ${escapeHtml(formatFlexibleDate(p.birthDate))}${
                p.birthPlace ? ` tại ${escapeHtml(p.birthPlace)}` : ''
              }</div>`
            : ''
        }
        ${
          deathAnniv || p.burialPlace
            ? `<div class="fb-meta-line" style="color:#8C6D32;">${
                deathAnniv ? `Giỗ: ${escapeHtml(deathAnniv)}` : ''
              }${deathAnniv && p.burialPlace ? ' · ' : ''}${
                p.burialPlace ? `Mộ: ${escapeHtml(p.burialPlace)}` : ''
              }</div>`
            : ''
        }
        ${relParts.length > 0 ? `<div class="fb-rel-line">${relParts.join(' | ')}</div>` : ''}
        ${p.merits ? `<div class="fb-merit">Công đức: ${escapeHtml(p.merits)}</div>` : ''}
      </div>
    </div>
  `;
}

function renderTabooIndexChunkHtml(
  entries: Person[],
  showHeading: boolean
): string {
  return `
    <section>
      ${
        showHeading
          ? `<h2 class="fb-section-heading">MỤC LỤC TRA CỨU TÊN HÚY &amp; TÊN TỰ TIỀN NHÂN</h2>
             <p style="font-size:11px;color:#5C4F42;text-align:center;margin:0 0 12px 0;">Theo phong tục Việt Nam, con cháu khi tế tự xướng danh theo Tên Húy để tỏ lòng cung kính.</p>`
          : ''
      }
      <table class="fb-table">
        <thead>
          <tr>
            <th>Họ và tên</th>
            <th>Đời thứ</th>
            <th>Tên Húy (Tế tự)</th>
            <th>Tên Tự / Hiệu</th>
            <th>Tên thường gọi</th>
          </tr>
        </thead>
        <tbody>
          ${entries
            .map(
              (p) => `
            <tr>
              <td style="font-family:'Cormorant Garamond',Georgia,serif;font-weight:700;color:#1F1913;">${escapeHtml(p.fullName)}</td>
              <td style="font-weight:600;color:#1B3B2B;">${p.generation ? `Đời ${escapeHtml(p.generation)}` : '—'}</td>
              <td style="font-weight:600;color:#8C3A27;">${escapeHtml(p.tabooName) || '—'}</td>
              <td style="color:#1B3B2B;">${escapeHtml(p.courtesyName) || '—'}</td>
              <td style="color:#5C4F42;">${escapeHtml(p.commonName) || '—'}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </section>
  `;
}

/**
 * Builds ordered HTML block fragments that can be packed cleanly onto PDF pages
 * without splitting member cards or headings mid-line across page breaks.
 */
export function buildFamilyBookBlocks(
  data: FamilyBookExportData,
  config: FamilyBookPrintConfig = DEFAULT_FAMILY_BOOK_CONFIG
): string[] {
  const blocks: string[] = [];
  const generations = getPeopleByGeneration(data.people);
  const lookup = buildRelationLookup(data);

  if (config.includeCover) {
    blocks.push(renderCoverHtml(data, generations.length));
  }

  if (config.includePreface) {
    blocks.push(renderPrefaceHtml(data));
  }

  if (config.includeBranches && data.branches.length > 0) {
    blocks.push(renderBranchesHtml(data.branches));
  }

  if (config.includeGenerations && generations.length > 0) {
    blocks.push('<h2 class="fb-section-heading">PHẢ LỤC CHI TIẾT CÁC THẾ HỆ</h2>');

    for (const { generation, members } of generations) {
      // Chunk pairs of members (2-column rows) with the generation header on the first chunk
      for (let i = 0; i < members.length; i += 2) {
        const pair = members.slice(i, i + 2);
        const headerHtml =
          i === 0
            ? `<div class="fb-gen-header">
                <span class="fb-gen-badge">ĐỜI THỨ ${escapeHtml(generation)}</span>
                <span class="fb-gen-count">${members.length} vị thành viên</span>
              </div>`
            : '';
        const cardsHtml = pair
          .map((p) => renderPersonCardHtml(p, lookup, config.includeRelationships))
          .join('');
        blocks.push(`${headerHtml}<div class="fb-grid-2">${cardsHtml}</div>`);
      }
    }
  }

  if (config.includeTabooIndex) {
    const tabooEntries = data.people
      .filter((p) => p.tabooName || p.courtesyName || p.commonName)
      .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi'));

    if (tabooEntries.length > 0) {
      const chunkSize = 14;
      for (let i = 0; i < tabooEntries.length; i += chunkSize) {
        blocks.push(renderTabooIndexChunkHtml(tabooEntries.slice(i, i + chunkSize), i === 0));
      }
    }
  }

  blocks.push(`
    <div class="fb-colophon">
      <div><strong>${escapeHtml(data.settings.clanName || 'Gia Phả Việt')}</strong> · Gia Phả Dòng Tộc</div>
      <div>Kết xuất ngày ${escapeHtml(new Date().toLocaleDateString('vi-VN'))} · Bản lưu truyền nội bộ</div>
    </div>
  `);

  return blocks;
}

/**
 * Generates a complete, standalone printable HTML document for the Family Book.
 */
export function generateFamilyBookPrintableHtml(
  data: FamilyBookExportData,
  config: FamilyBookPrintConfig = DEFAULT_FAMILY_BOOK_CONFIG
): string {
  const blocks = buildFamilyBookBlocks(data, config);
  const paper = config.paperSize === 'letter' ? 'letter' : 'A4';

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>Sách Phả Ký – ${escapeHtml(data.settings.clanName)}</title>
  <style>
    @page { size: ${paper} portrait; margin: 12mm 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; background: #FAF7F2; }
    .fb-sheet { max-width: 820px; margin: 0 auto; background: #FFFFFF; padding: 32px; border: 1px solid #E7DFD4; }
    .fb-block { margin-bottom: 18px; break-inside: avoid; page-break-inside: avoid; }
    ${BOOK_STYLES}
    @media print {
      body { padding: 0; background: #FFFFFF; }
      .fb-sheet { border: none; padding: 0; max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="fb-sheet fb-root">
    ${blocks.map((b) => `<div class="fb-block">${b}</div>`).join('\n')}
  </div>
</body>
</html>`;
}

/**
 * Builds a plain-text fallback for environments without canvas rendering (e.g., Node tests).
 */
export function buildFamilyBookTextFallback(data: FamilyBookExportData): string {
  const generations = getPeopleByGeneration(data.people);
  const lines: string[] = [
    `GIA PHA DONG TOC: ${data.settings.clanName}`,
    data.settings.clanMotto ? `"${data.settings.clanMotto}"` : '',
    `Nha tho to: ${data.settings.ancestralHallLocation || 'Viet Nam'}`,
    `Tong so: ${generations.length} the he, ${data.people.length} thanh vien`,
    '',
  ];
  for (const { generation, members } of generations) {
    lines.push(`--- DOI THU ${generation} (${members.length} thanh vien) ---`);
    for (const m of members) {
      lines.push(`- ${m.fullName} (${formatLifespan(m.birthDate, m.deathDate, m.isLiving)})`);
    }
    lines.push('');
  }
  return lines.filter((l) => l !== undefined).join('\n');
}

/**
 * Generates and downloads a multi-page printable PDF of the entire Family Book
 * by packing logical content blocks onto A4/Letter pages cleanly without slicing cards.
 */
export async function exportFamilyBookToPdf(
  data: FamilyBookExportData,
  config: FamilyBookPrintConfig = DEFAULT_FAMILY_BOOK_CONFIG,
  onProgress?: (percent: number) => void
): Promise<void> {
  const safeClanName = (data.settings.clanName || 'Gia_Pha')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_\-\u00C0-\u1EF9]/g, '');
  const fileName = `Sach_Pha_Ky_${safeClanName || 'Gia_Pha'}.pdf`;

  if (typeof document === 'undefined') {
    const doc = new jsPDF('p', 'mm', config.paperSize);
    doc.text(buildFamilyBookTextFallback(data), 15, 20);
    doc.save(fileName);
    onProgress?.(100);
    return;
  }

  const isLetter = config.paperSize === 'letter';
  const pageWidthMm = isLetter ? 215.9 : 210;
  const pageHeightMm = isLetter ? 279.4 : 297;
  const marginXMm = 12;
  const marginTopMm = 12;
  const marginBottomMm = 14;
  const contentWidthMm = pageWidthMm - marginXMm * 2;
  const usableHeightMm = pageHeightMm - marginTopMm - marginBottomMm;
  const renderWidthPx = isLetter ? 790 : 760;

  const blocks = buildFamilyBookBlocks(data, config);
  const host = document.createElement('div');
  host.style.position = 'fixed';
  host.style.left = '-99999px';
  host.style.top = '0';
  host.style.width = `${renderWidthPx}px`;
  host.style.background = '#FFFFFF';
  host.style.padding = '0';
  host.style.zIndex = '-1000';
  host.innerHTML = `<style>${BOOK_STYLES}</style><div class="fb-root" style="width:${renderWidthPx}px;background:#FFFFFF;"></div>`;
  document.body.appendChild(host);

  const rootEl = host.querySelector('.fb-root') as HTMLElement;

  try {
    if (document.fonts) {
      await document.fonts.ready;
    }

    const pdf = new jsPDF('p', 'mm', config.paperSize);
    let cursorYMm = marginTopMm;
    let currentPageHasContent = false;
    const total = blocks.length;

    for (let idx = 0; idx < total; idx++) {
      onProgress?.(Math.round(((idx + 0.2) / total) * 90));
      rootEl.innerHTML = `<div class="fb-block-capture" style="padding:4px 2px;background:#FFFFFF;">${blocks[idx]}</div>`;
      const target = rootEl.firstElementChild as HTMLElement;

      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#FFFFFF',
        windowWidth: renderWidthPx,
      });

      const blockWidthMm = contentWidthMm;
      const blockHeightMm = (canvas.height * blockWidthMm) / canvas.width;
      const imgData = canvas.toDataURL('image/jpeg', 0.94);

      const isCoverBlock = config.includeCover && idx === 0;

      if (blockHeightMm > usableHeightMm) {
        if (currentPageHasContent) {
          pdf.addPage();
          cursorYMm = marginTopMm;
        }
        const fitScale = usableHeightMm / blockHeightMm;
        const scaledWidth = blockWidthMm * fitScale;
        const xOffset = marginXMm + (blockWidthMm - scaledWidth) / 2;
        pdf.addImage(imgData, 'JPEG', xOffset, cursorYMm, scaledWidth, usableHeightMm);
        cursorYMm = marginTopMm + usableHeightMm;
        currentPageHasContent = true;
      } else {
        if (currentPageHasContent && cursorYMm + blockHeightMm > pageHeightMm - marginBottomMm) {
          pdf.addPage();
          cursorYMm = marginTopMm;
          currentPageHasContent = false;
        }

        pdf.addImage(imgData, 'JPEG', marginXMm, cursorYMm, blockWidthMm, blockHeightMm);
        cursorYMm += blockHeightMm + 3.5;
        currentPageHasContent = true;

        // Place cover cleanly on its own opening page when followed by preface/content
        if (isCoverBlock && total > 1) {
          pdf.addPage();
          cursorYMm = marginTopMm;
          currentPageHasContent = false;
        }
      }
    }

    // Add clean page numbers in the bottom margin
    const pageCount = pdf.getNumberOfPages();
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(120, 110, 98);
    for (let p = 1; p <= pageCount; p++) {
      pdf.setPage(p);
      pdf.text(`${p} / ${pageCount}`, pageWidthMm - marginXMm, pageHeightMm - 6, {
        align: 'right',
      });
    }

    onProgress?.(100);
    pdf.save(fileName);
  } catch (err) {
    console.warn('FamilyBook canvas export fallback to direct jsPDF:', err);
    const pdf = new jsPDF('p', 'mm', config.paperSize);
    const text = buildFamilyBookTextFallback(data);
    const lines = pdf.splitTextToSize(text, 180);
    let y = 20;
    pdf.setFontSize(10);
    for (const line of lines) {
      if (y > 278) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(line, 15, y);
      y += 5.5;
    }
    pdf.save(fileName);
    onProgress?.(100);
  } finally {
    if (document.body.contains(host)) {
      document.body.removeChild(host);
    }
  }
}

/**
 * Exports the large vector family scroll SVG (#family-scroll-svg) directly to a landscape PDF.
 */
export async function exportScrollSvgToPdf(
  svgElement: SVGSVGElement,
  clanName: string,
  format: 'A0' | 'A1' | 'A3' = 'A1'
): Promise<void> {
  const safeClanName = (clanName || 'Gia_Pha')
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_\-\u00C0-\u1EF9]/g, '');
  const fileName = `Pha_Do_${format}_${safeClanName || 'Gia_Pha'}.pdf`;

  const svgData = new XMLSerializer().serializeToString(svgElement);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (e) => reject(e);
      image.src = url;
    });

    const width = Math.max(svgElement.width.baseVal.value || img.width || 1200, 800);
    const height = Math.max(svgElement.height.baseVal.value || img.height || 800, 600);
    const scale = Math.min(2, 3200 / Math.max(width, height));

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    ctx.fillStyle = '#FFFDF9';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const jsPdfFormat = format.toLowerCase() as 'a0' | 'a1' | 'a3';
    const orientation = width >= height ? 'l' : 'p';
    const pdf = new jsPDF(orientation, 'mm', jsPdfFormat);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const availW = pdfWidth - margin * 2;
    const availH = pdfHeight - margin * 2;
    const ratio = Math.min(availW / width, availH / height);
    const drawW = width * ratio;
    const drawH = height * ratio;
    const offsetX = margin + (availW - drawW) / 2;
    const offsetY = margin + (availH - drawH) / 2;

    pdf.addImage(imgData, 'JPEG', offsetX, offsetY, drawW, drawH);
    pdf.save(fileName);
  } finally {
    URL.revokeObjectURL(url);
  }
}
