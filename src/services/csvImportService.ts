import { generateId, normalizeVietnameseText } from '../utils/dateUtils';
import {
  FamilyBranch,
  Gender,
  Person,
  Relationship,
  Union,
} from '../models/genealogy';

export interface CsvImportRow {
  rowNumber: number;
  fullName: string;
  gender: Gender;
  generation?: number;
  branchName?: string;
  birthYear?: number;
  birthDateText?: string;
  deathYear?: number;
  deathDateText?: string;
  isLiving: boolean;
  commonName?: string;
  tabooName?: string;
  courtesyName?: string;
  clanRole?: string;
  fatherName?: string;
  motherName?: string;
  spouseName?: string;
  burialPlace?: string;
  lunarDeathDay?: number;
  lunarDeathMonth?: number;
  ancestralHome?: string;
  residence?: string;
  occupation?: string;
  merits?: string;
  biography?: string;
  // Validation status
  isValid: boolean;
  errors: string[];
}

export interface CsvImportResult {
  totalRows: number;
  validRows: number;
  rows: CsvImportRow[];
  parsedPeople: Person[];
  parsedRelationships: Relationship[];
  parsedUnions: Union[];
  parsedBranches: FamilyBranch[];
  errors: string[];
  warnings: string[];
  newBranchesCreated: string[];
}

export const CSV_TEMPLATE_HEADER = [
  'Họ và tên',
  'Giới tính (Nam/Nữ)',
  'Đời thứ',
  'Chi họ',
  'Năm sinh',
  'Năm mất',
  'Còn sống (Có/Không)',
  'Tên húy (Tế tự)',
  'Tên tự / Tên hiệu',
  'Tên thường gọi',
  'Vai vế',
  'Họ tên Cha',
  'Họ tên Mẹ',
  'Họ tên Vợ/Chồng',
  'Ngày giỗ ÂL (Ngày)',
  'Tháng giỗ ÂL (Tháng)',
  'Nơi an táng / Mộ phần',
  'Nguyên quán',
  'Nơi cư trú',
  'Nghề nghiệp',
  'Công đức dòng họ',
  'Tiểu sử tóm tắt',
];

export const CSV_SAMPLE_ROWS = [
  [
    'Thành viên Mẫu A',
    'Nam',
    '2',
    'Chi Giáp',
    '1928',
    '2005',
    'Không',
    'Đức Thành',
    'Bá Thông',
    'Bác Cả',
    'Trưởng Chi Giáp',
    '',
    '',
    'Thành viên Mẫu B',
    '19',
    '10',
    'Nghĩa trang Dòng họ Trần, Đông Ngạc',
    'Đông Ngạc, Hà Nội',
    'Hà Nội',
    'Nhà giáo',
    'Phục dựng từ đường năm 1995',
    'Sinh thời mẫu mực đức độ, một lòng vì gia tộc.',
  ],
  [
    'Thành viên Mẫu B',
    'Nữ',
    '2',
    'Chi Giáp',
    '1932',
    '2010',
    'Không',
    '',
    '',
    'Bà Cả',
    'Dâu trưởng',
    '',
    '',
    'Thành viên Mẫu A',
    '15',
    '4',
    'Nghĩa trang Dòng họ Trần',
    'Bắc Ninh',
    'Hà Nội',
    'Nội trợ',
    '',
    'Hiền thục tần tảo, nuôi dạy các con thành tài.',
  ],
  [
    'Thành viên Mẫu C',
    'Nam',
    '3',
    'Chi Giáp',
    '1954',
    '',
    'Có',
    '',
    '',
    'Anh Tuấn',
    'Trưởng tộc đương nhiệm',
    'Thành viên Mẫu A',
    'Thành viên Mẫu B',
    '',
    '',
    '',
    '',
    'Đông Ngạc, Hà Nội',
    'Bắc Từ Liêm, Hà Nội',
    'Bác sĩ',
    'Chủ trì số hóa gia phả dòng họ',
    'Tận tâm kết nối con cháu trong và ngoài nước.',
  ],
];

/**
 * Generates downloadable CSV template content with UTF-8 BOM for Excel compatibility.
 */
export function generateCsvTemplate(): string {
  const lines: string[] = [];
  lines.push(CSV_TEMPLATE_HEADER.map((col) => `"${col.replace(/"/g, '""')}"`).join(','));
  for (const row of CSV_SAMPLE_ROWS) {
    lines.push(row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','));
  }
  return '\uFEFF' + lines.join('\r\n');
}

/**
 * Parses CSV/TSV records, including quoted delimiters and multiline values.
 */
export function parseCsvRows(text: string): string[][] {
  const normalized = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const delimiters = [',', ';', '\t'];
  const counts = new Map(delimiters.map((delimiter) => [delimiter, 0]));
  let insideQuotes = false;
  let hasContent = false;
  for (const char of normalized) {
    if (char === '"') insideQuotes = !insideQuotes;
    if (!insideQuotes && char === '\n' && hasContent) break;
    if (!insideQuotes && counts.has(char)) counts.set(char, counts.get(char)! + 1);
    if (char.trim()) hasContent = true;
  }
  const delimiter = delimiters.reduce((best, candidate) => counts.get(candidate)! > counts.get(best)! ? candidate : best);

  const rows: string[][] = [];
  let cells: string[] = [];
  let cell = '';
  let closedQuote = false;
  function finishCell() {
    cells.push(cell.trim());
    cell = '';
    closedQuote = false;
  }
  function finishRow() {
    finishCell();
    if (cells.some(Boolean)) rows.push(cells);
    cells = [];
  }

  insideQuotes = false;
  for (let index = 0; index < normalized.length; index++) {
    const char = normalized[index];
    if (insideQuotes) {
      if (char === '"' && normalized[index + 1] === '"') {
        cell += '"';
        index++;
      } else if (char === '"') {
        insideQuotes = false;
        closedQuote = true;
      } else {
        cell += char;
      }
    } else if (char === delimiter) {
      finishCell();
    } else if (char === '\n') {
      finishRow();
    } else if (char === '"' && !closedQuote && !cell.trim()) {
      cell = '';
      insideQuotes = true;
    } else if (char === '"' || (closedQuote && char.trim())) {
      throw new Error(`Dòng CSV ${rows.length + 1}: dấu ngoặc kép không hợp lệ.`);
    } else {
      cell += char;
    }
  }
  if (insideQuotes) throw new Error(`Dòng CSV ${rows.length + 1}: thiếu dấu ngoặc kép đóng.`);
  finishRow();
  return rows;
}

const normalizeHeader = (value: string) =>
  normalizeVietnameseText(value.replace(/\s+\([^)]*\)/g, '')).replace(/[\s_-]+/g, '');
const headerIndices = new Map(CSV_TEMPLATE_HEADER.map((name, index) => [normalizeHeader(name), index]));
const fieldNames = [
  'fullName', 'gender', 'generation', 'branchName', 'birthYear', 'deathYear', 'isLiving',
  'tabooName', 'courtesyName', 'commonName', 'clanRole', 'fatherName', 'motherName', 'spouseName',
  'lunarDeathDay', 'lunarDeathMonth', 'burialPlace', 'ancestralHome', 'residence',
  'occupation', 'merits', 'biography',
];
fieldNames.forEach((name, index) => headerIndices.set(normalizeHeader(name), index));
for (const alias of ['Họ tên', 'Name']) headerIndices.set(normalizeHeader(alias), 0);

function parseInteger(
  value: string | undefined,
  label: string,
  max: number,
  errors: string[]
): number | undefined {
  if (!value) return undefined;
  const number = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number < 1 || number > max) {
    errors.push(`${label} phải là số nguyên từ 1 đến ${max}.`);
    return undefined;
  }
  return number;
}

/**
 * Converts CSV into an append-only import candidate. Any row error blocks the
 * whole candidate. Names in relationship columns must resolve unambiguously.
 */
export function processCsvImport(
  rawLines: string[][],
  existingBranches: FamilyBranch[],
  existingPeople: Person[] = []
): CsvImportResult {
  const rows: CsvImportRow[] = [];
  const parsedPeople: Person[] = [];
  const parsedRelationships: Relationship[] = [];
  const parsedUnions: Union[] = [];
  const parsedBranches: FamilyBranch[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  const peopleByName = new Map<string, Person[]>();
  const branchesByName = new Map<string, FamilyBranch[]>();
  const nowIso = new Date().toISOString();

  function registerPerson(person: Person) {
    const key = person.fullName.trim().toLowerCase();
    const matching = peopleByName.get(key) ?? [];
    matching.push(person);
    peopleByName.set(key, matching);
  }
  for (const person of existingPeople) registerPerson(person);
  for (const branch of existingBranches) {
    const key = branch.name.trim().toLowerCase();
    const matching = branchesByName.get(key) ?? [];
    matching.push(branch);
    branchesByName.set(key, matching);
  }

  const firstRow = rawLines[0] ?? [];
  const hasHeader = firstRow.some((cell) => headerIndices.get(normalizeHeader(cell)) === 0);
  const columns = hasHeader
    ? firstRow.map((cell) => headerIndices.get(normalizeHeader(cell)))
    : CSV_TEMPLATE_HEADER.map((_, index) => index);
  if (hasHeader) {
    columns.forEach((column, index) => {
      if (column === undefined) {
        errors.push(`Không nhận diện được tiêu đề cột CSV ${index + 1}: "${firstRow[index]}".`);
      } else if (columns.indexOf(column) !== index) {
        errors.push(`Tiêu đề cột CSV "${firstRow[index]}" bị trùng.`);
      }
    });
  }

  for (let index = hasHeader ? 1 : 0; index < rawLines.length; index++) {
    const rawCells = rawLines[index].map((cell) => cell.trim());
    if (!rawCells.some(Boolean)) continue;
    const rowErrors: string[] = [];
    const rowNumber = index + 1;
    const cols = new Array<string>(CSV_TEMPLATE_HEADER.length).fill('');
    rawCells.forEach((cell, columnIndex) => {
      const mappedColumn = columns[columnIndex];
      if (mappedColumn !== undefined) cols[mappedColumn] = cell;
      else if (cell) rowErrors.push(`Dữ liệu ở cột ${columnIndex + 1} không thể nhập.`);
    });

    const fullName = cols[0];
    if (!fullName) rowErrors.push('Thiếu họ và tên.');

    const genderRaw = normalizeVietnameseText(cols[1]);
    let gender: Gender = 'unknown';
    if (['nam', 'male', 'm'].includes(genderRaw)) gender = 'male';
    else if (['nu', 'female', 'f'].includes(genderRaw)) gender = 'female';
    else if (genderRaw && !['unknown', 'u', 'khong ro', 'chua ro'].includes(genderRaw)) {
      rowErrors.push('Giới tính không hợp lệ.');
    }

    const generation = parseInteger(cols[2], 'Đời thứ', Number.MAX_SAFE_INTEGER, rowErrors);
    const branchName = cols[3] || undefined;
    let branchId: string | undefined;
    if (branchName) {
      const key = branchName.toLowerCase();
      const matches = branchesByName.get(key) ?? [];
      if (matches.length > 1) {
        rowErrors.push(`Có nhiều chi họ mang tên "${branchName}".`);
      } else if (matches.length === 1) {
        branchId = matches[0].id;
      } else {
        const branch: FamilyBranch = {
          id: generateId('branch'),
          name: branchName,
          code: branchName,
          subBranches: [],
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        parsedBranches.push(branch);
        branchesByName.set(key, [branch]);
        branchId = branch.id;
      }
    }

    const birthYear = parseInteger(cols[4], 'Năm sinh', 9999, rowErrors);
    const deathYear = parseInteger(cols[5], 'Năm mất', 9999, rowErrors);
    const living = normalizeVietnameseText(cols[6]);
    let isLiving = deathYear === undefined;
    if (['co', 'true', 'yes', '1'].includes(living)) {
      isLiving = true;
      if (deathYear !== undefined) rowErrors.push('Trạng thái còn sống mâu thuẫn với năm mất.');
    } else if (['khong', 'false', 'no', '0'].includes(living)) {
      isLiving = false;
    } else if (living) {
      rowErrors.push('Trạng thái còn sống không hợp lệ.');
    }

    const lunarDay = parseInteger(cols[14], 'Ngày giỗ âm lịch', 30, rowErrors);
    const lunarMonth = parseInteger(cols[15], 'Tháng giỗ âm lịch', 12, rowErrors);
    if ((lunarDay === undefined) !== (lunarMonth === undefined)) {
      warnings.push(`Dòng ${rowNumber}: ngày giỗ âm lịch chỉ có ngày hoặc tháng.`);
    }

    const person: Person = {
      id: generateId('person'),
      fullName,
      gender,
      generation,
      branchId,
      isLiving,
      birthDate: birthYear === undefined ? undefined : { precision: 'year', year: birthYear },
      deathDate: deathYear === undefined ? undefined : { precision: 'year', year: deathYear },
      deathAnniversaryLunar: lunarDay !== undefined || lunarMonth !== undefined
        ? { day: lunarDay, month: lunarMonth }
        : undefined,
      tabooName: cols[7] || undefined,
      courtesyName: cols[8] || undefined,
      commonName: cols[9] || undefined,
      clanRole: cols[10] || undefined,
      burialPlace: cols[16] || undefined,
      ancestralHome: cols[17] || undefined,
      residence: cols[18] || undefined,
      occupation: cols[19] || undefined,
      merits: cols[20] || undefined,
      biography: cols[21] || undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    parsedPeople.push(person);
    if (fullName) registerPerson(person);
    rows.push({
      rowNumber, fullName, gender, generation, branchName, birthYear, deathYear, isLiving,
      commonName: person.commonName,
      tabooName: person.tabooName,
      courtesyName: person.courtesyName,
      clanRole: person.clanRole,
      fatherName: cols[11] || undefined,
      motherName: cols[12] || undefined,
      spouseName: cols[13] || undefined,
      burialPlace: person.burialPlace,
      lunarDeathDay: lunarDay,
      lunarDeathMonth: lunarMonth,
      ancestralHome: person.ancestralHome,
      residence: person.residence,
      occupation: person.occupation,
      merits: person.merits,
      biography: person.biography,
      isValid: rowErrors.length === 0,
      errors: rowErrors,
    });
  }

  const unionPairs = new Set<string>();
  rows.forEach((row, index) => {
    const person = parsedPeople[index];
    function resolveName(name: string, label: string): Person | undefined {
      const matches = peopleByName.get(name.toLowerCase()) ?? [];
      if (matches.length !== 1) {
        row.errors.push(matches.length
          ? `${label}: tên "${name}" không xác định duy nhất.`
          : `${label}: không tìm thấy "${name}".`);
        return undefined;
      }
      if (matches[0].id === person.id) {
        row.errors.push(`${label}: không thể tham chiếu chính mình.`);
        return undefined;
      }
      return matches[0];
    }

    const father = row.fatherName ? resolveName(row.fatherName, 'Cha') : undefined;
    const mother = row.motherName ? resolveName(row.motherName, 'Mẹ') : undefined;
    if (father && mother && father.id === mother.id) row.errors.push('Cha và mẹ trỏ tới cùng hồ sơ.');
    for (const parent of [father, mother]) {
      if (!parent) continue;
      parsedRelationships.push({
        id: generateId('rel'),
        parentId: parent.id,
        childId: person.id,
        lineageType: 'biological',
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }

    const spouse = row.spouseName ? resolveName(row.spouseName, 'Vợ/chồng') : undefined;
    if (spouse) {
      const key = JSON.stringify([person.id, spouse.id].sort());
      if (!unionPairs.has(key)) {
        unionPairs.add(key);
        parsedUnions.push({
          id: generateId('union'),
          partnerIds: [person.id, spouse.id],
          status: 'married',
          marriageOrder: 1,
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    }

    row.isValid = row.errors.length === 0;
    errors.push(...row.errors.map((error) => `Dòng ${row.rowNumber}: ${error}`));
  });

  return {
    totalRows: rows.length,
    validRows: rows.filter((row) => row.isValid).length,
    rows,
    parsedPeople,
    parsedRelationships,
    parsedUnions,
    parsedBranches,
    newBranchesCreated: parsedBranches.map((branch) => branch.name),
    errors,
    warnings,
  };
}
