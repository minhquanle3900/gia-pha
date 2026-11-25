import { describe, expect, it } from 'vitest';
import {
  CSV_TEMPLATE_HEADER,
  generateCsvTemplate,
  parseCsvRows,
  processCsvImport,
} from '../services/csvImportService';
import {
  REGIONAL_RITE_GUIDES,
  TRADITIONAL_PRAYERS,
} from '../services/lunarCalendarService';

describe('1. Bulk CSV/Excel Import Service', () => {
  it('generates a UTF-8 BOM compliant CSV template with header fields', () => {
    const template = generateCsvTemplate();
    expect(template.charCodeAt(0)).toBe(0xfeff); // UTF-8 BOM
    expect(template).toContain('Họ và tên');
    expect(template).toContain('Giới tính');
    expect(template).toContain('Chi họ');
    expect(template).toContain('Họ tên Cha');
    expect(template).toContain('Họ tên Mẹ');
    expect(template).toContain('Họ tên Vợ/Chồng');
  });

  it('correctly parses comma and semicolon separated CSV rows', () => {
    const csvComma = `Họ và tên,Giới tính,Đời thứ,Họ tên Cha
Nguyễn Văn An,Nam,1,
Nguyễn Văn Bình,Nam,2,Nguyễn Văn An`;

    const rows = parseCsvRows(csvComma);
    expect(rows.length).toBe(3); // 1 header line + 2 data rows
    expect(rows[0][0]).toBe('Họ và tên');
    expect(rows[1][0]).toBe('Nguyễn Văn An');
    expect(rows[2][0]).toBe('Nguyễn Văn Bình');
  });

  it('processes import and establishes parent-child and marriage links', () => {
    const rawLines: string[][] = [
      CSV_TEMPLATE_HEADER,
      [
        'Trần Văn Tổ',
        'Nam',
        '1',
        'Chi Cả',
        '1900',
        '1980',
        'Không',
        '',
        '',
        '',
        'Thủy tổ chi',
        '',
        '',
        'Lê Thị Mẫu',
      ],
      [
        'Lê Thị Mẫu',
        'Nữ',
        '1',
        'Chi Cả',
        '1905',
        '1985',
        'Không',
        '',
        '',
        '',
        'Chính thất',
        '',
        '',
        'Trần Văn Tổ',
      ],
      [
        'Trần Văn Con',
        'Nam',
        '2',
        'Chi Cả',
        '1930',
        '2010',
        'Không',
        '',
        '',
        '',
        'Trưởng nam',
        'Trần Văn Tổ',
        'Lê Thị Mẫu',
        '',
      ],
    ];

    const result = processCsvImport(rawLines, []);

    expect(result.validRows).toBe(3);
    expect(result.parsedPeople.length).toBe(3);

    const to = result.parsedPeople.find((p) => p.fullName === 'Trần Văn Tổ');
    const mau = result.parsedPeople.find((p) => p.fullName === 'Lê Thị Mẫu');
    const con = result.parsedPeople.find((p) => p.fullName === 'Trần Văn Con');

    expect(to).toBeDefined();
    expect(mau).toBeDefined();
    expect(con).toBeDefined();

    // Check union created between To and Mau
    expect(result.parsedUnions.length).toBeGreaterThanOrEqual(1);

    // Check parent-child relationships for Con
    const parentRels = result.parsedRelationships.filter(
      (r) => r.childId === con!.id
    );
    expect(parentRels.length).toBe(2);
    expect(parentRels.some((r) => r.parentId === to!.id)).toBe(true);
    expect(parentRels.some((r) => r.parentId === mau!.id)).toBe(true);
  });
});

describe('2. Regional Rites (3 Miền Bắc - Trung - Nam)', () => {
  it('defines detailed traditional guides for all 3 regions', () => {
    expect(REGIONAL_RITE_GUIDES.north).toBeDefined();
    expect(REGIONAL_RITE_GUIDES.central).toBeDefined();
    expect(REGIONAL_RITE_GUIDES.south).toBeDefined();

    expect(REGIONAL_RITE_GUIDES.north.regionName).toContain('Miền Bắc');
    expect(REGIONAL_RITE_GUIDES.central.regionName).toContain('Miền Trung');
    expect(REGIONAL_RITE_GUIDES.south.regionName).toContain('Miền Nam');
  });

  it('contains distinct regional banquet dishes for each region', () => {
    const northDishes = REGIONAL_RITE_GUIDES.north.traditionalDishes.join(' ');
    const centralDishes = REGIONAL_RITE_GUIDES.central.traditionalDishes.join(' ');
    const southDishes = REGIONAL_RITE_GUIDES.south.traditionalDishes.join(' ');

    expect(northDishes).toMatch(/Gà trống hoa|Xôi gấc|Nem rán/);
    expect(centralDishes).toMatch(/Nem tré|tôm chua|Xứ Huế/);
    expect(southDishes).toMatch(/khổ qua|Thịt kho tàu|Bánh tét/);
  });

  it('contains regional prayers in the traditional prayers repository', () => {
    const centralPrayer = TRADITIONAL_PRAYERS.find((p) => p.id === 'prayer_mien_trung_tien_thuong');
    const southPrayer = TRADITIONAL_PRAYERS.find((p) => p.id === 'prayer_mien_nam_dam_gio');

    expect(centralPrayer).toBeDefined();
    expect(centralPrayer?.text).toContain('Tiên Thường');

    expect(southPrayer).toBeDefined();
    expect(southPrayer?.text).toContain('phương Nam');
  });
});
