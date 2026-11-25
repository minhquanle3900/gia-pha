import { generateId } from '../utils/dateUtils';
import {
  FamilyBranch,
  Gender,
  GenealogyDatabaseSnapshot,
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
    'Trần Văn Khang',
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
    'Trần Văn Khởi',
    'Nguyễn Thị Nhuận',
    'Lê Thị Mùi',
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
    'Lê Thị Mùi',
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
    'Trần Văn Khang',
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
    'Trần Quốc Tuấn',
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
    'Trần Văn Khang',
    'Lê Thị Mùi',
    'Ngô Thị Phương Thảo',
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
 * Parses raw CSV / TSV text into structured rows with robust delimiter and quote handling.
 */
export function parseCsvRows(text: string): string[][] {
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  const result: string[][] = [];

  for (let line of lines) {
    line = line.trim();
    if (!line) continue;

    // Detect delimiter (tab, comma, semicolon)
    let delimiter = ',';
    if (line.includes('\t')) delimiter = '\t';
    else if (line.includes(';') && !line.includes(',')) delimiter = ';';

    const cells: string[] = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          currentCell += '"';
          i++; // skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === delimiter && !insideQuotes) {
        cells.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    cells.push(currentCell.trim());
    result.push(cells);
  }

  return result;
}

/**
 * Validates and converts parsed CSV rows into Person, Relationship, and Union records.
 */
export function processCsvImport(
  rawLines: string[][],
  existingBranches: FamilyBranch[]
): CsvImportResult {
  if (rawLines.length === 0) {
    return {
      totalRows: 0,
      validRows: 0,
      rows: [],
      parsedPeople: [],
      parsedRelationships: [],
      parsedUnions: [],
      newBranchesCreated: [],
    };
  }

  // Skip header if it matches keywords
  let startIndex = 0;
  const firstLineStr = rawLines[0].join(' ').toLowerCase();
  if (
    firstLineStr.includes('họ và tên') ||
    firstLineStr.includes('name') ||
    firstLineStr.includes('giới tính')
  ) {
    startIndex = 1;
  }

  const rows: CsvImportRow[] = [];
  const parsedPeople: Person[] = [];
  const personByName = new Map<string, Person>();
  const branchMap = new Map<string, string>(); // Name -> ID
  const newBranchesCreated: string[] = [];

  // Register existing branches
  for (const b of existingBranches) {
    branchMap.set(b.name.toLowerCase().trim(), b.id);
  }

  const nowIso = new Date().toISOString();

  // 1. First Pass: Create People
  for (let idx = startIndex; idx < rawLines.length; idx++) {
    const cols = rawLines[idx];
    const rowNum = idx + 1;
    const errors: string[] = [];

    const fullName = cols[0]?.trim() || '';
    if (!fullName) {
      continue; // Skip empty rows
    }

    const genderRaw = cols[1]?.trim().toLowerCase() || '';
    const gender: Gender =
      genderRaw === 'nam' || genderRaw === 'male' || genderRaw === 'm'
        ? 'male'
        : genderRaw === 'nữ' || genderRaw === 'nu' || genderRaw === 'female' || genderRaw === 'f'
        ? 'female'
        : 'unknown';

    const genNum = parseInt(cols[2]?.trim() || '', 10);
    const generation = isNaN(genNum) ? undefined : genNum;

    const branchName = cols[3]?.trim();
    let branchId: string | undefined = undefined;
    if (branchName) {
      const lowerB = branchName.toLowerCase();
      if (!branchMap.has(lowerB)) {
        const newBId = generateId('branch');
        branchMap.set(lowerB, newBId);
        newBranchesCreated.push(branchName);
      }
      branchId = branchMap.get(lowerB);
    }

    const birthYearRaw = parseInt(cols[4]?.trim() || '', 10);
    const birthYear = isNaN(birthYearRaw) ? undefined : birthYearRaw;

    const deathYearRaw = parseInt(cols[5]?.trim() || '', 10);
    const deathYear = isNaN(deathYearRaw) ? undefined : deathYearRaw;

    const isLivingRaw = cols[6]?.trim().toLowerCase() || '';
    let isLiving = true;
    if (
      isLivingRaw === 'không' ||
      isLivingRaw === 'khong' ||
      isLivingRaw === 'false' ||
      isLivingRaw === 'no' ||
      deathYear !== undefined
    ) {
      isLiving = false;
    }

    const tabooName = cols[7]?.trim() || undefined;
    const courtesyName = cols[8]?.trim() || undefined;
    const commonName = cols[9]?.trim() || undefined;
    const clanRole = cols[10]?.trim() || undefined;

    const fatherName = cols[11]?.trim() || undefined;
    const motherName = cols[12]?.trim() || undefined;
    const spouseName = cols[13]?.trim() || undefined;

    const lunarDay = parseInt(cols[14]?.trim() || '', 10);
    const lunarMonth = parseInt(cols[15]?.trim() || '', 10);
    const deathAnniversaryLunar =
      !isNaN(lunarDay) && !isNaN(lunarMonth)
        ? { day: lunarDay, month: lunarMonth }
        : undefined;

    const burialPlace = cols[16]?.trim() || undefined;
    const ancestralHome = cols[17]?.trim() || undefined;
    const residence = cols[18]?.trim() || undefined;
    const occupation = cols[19]?.trim() || undefined;
    const merits = cols[20]?.trim() || undefined;
    const biography = cols[21]?.trim() || undefined;

    const personId = generateId('person');
    const newPerson: Person = {
      id: personId,
      fullName,
      gender,
      generation,
      branchId,
      isLiving,
      birthDate: birthYear ? { precision: 'year', year: birthYear } : undefined,
      deathDate: deathYear ? { precision: 'year', year: deathYear } : undefined,
      deathAnniversaryLunar,
      tabooName,
      courtesyName,
      commonName,
      clanRole,
      burialPlace,
      ancestralHome,
      residence,
      occupation,
      merits,
      biography,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    personByName.set(fullName.toLowerCase().trim(), newPerson);
    parsedPeople.push(newPerson);

    rows.push({
      rowNumber: rowNum,
      fullName,
      gender,
      generation,
      branchName,
      birthYear,
      deathYear,
      isLiving,
      commonName,
      tabooName,
      courtesyName,
      clanRole,
      fatherName,
      motherName,
      spouseName,
      burialPlace,
      lunarDeathDay: isNaN(lunarDay) ? undefined : lunarDay,
      lunarDeathMonth: isNaN(lunarMonth) ? undefined : lunarMonth,
      ancestralHome,
      residence,
      occupation,
      merits,
      biography,
      isValid: errors.length === 0,
      errors,
    });
  }

  // 2. Second Pass: Link Relationships (Parents & Unions)
  const parsedRelationships: Relationship[] = [];
  const parsedUnions: Union[] = [];
  const unionMap = new Map<string, string>(); // pair key -> unionId

  for (const row of rows) {
    const childPerson = personByName.get(row.fullName.toLowerCase().trim());
    if (!childPerson) continue;

    // Link Father
    if (row.fatherName) {
      const father = personByName.get(row.fatherName.toLowerCase().trim());
      if (father) {
        parsedRelationships.push({
          id: generateId('rel'),
          parentId: father.id,
          childId: childPerson.id,
          lineageType: 'biological',
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    }

    // Link Mother
    if (row.motherName) {
      const mother = personByName.get(row.motherName.toLowerCase().trim());
      if (mother) {
        parsedRelationships.push({
          id: generateId('rel'),
          parentId: mother.id,
          childId: childPerson.id,
          lineageType: 'biological',
          createdAt: nowIso,
          updatedAt: nowIso,
        });
      }
    }

    // Link Spouse
    if (row.spouseName) {
      const spouse = personByName.get(row.spouseName.toLowerCase().trim());
      if (spouse) {
        const pairKey = [childPerson.id, spouse.id].sort().join('_');
        if (!unionMap.has(pairKey)) {
          const uId = generateId('union');
          unionMap.set(pairKey, uId);
          parsedUnions.push({
            id: uId,
            partnerIds: [childPerson.id, spouse.id],
            status: 'married',
            marriageOrder: 1,
            createdAt: nowIso,
            updatedAt: nowIso,
          });
        }
      }
    }
  }

  return {
    totalRows: rows.length,
    validRows: rows.filter((r) => r.isValid).length,
    rows,
    parsedPeople,
    parsedRelationships,
    parsedUnions,
    newBranchesCreated: Array.from(new Set(newBranchesCreated)),
  };
}
