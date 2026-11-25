import { describe, expect, it } from 'vitest';
import type { FamilyBranch, GenealogyDatabaseSnapshot, Person } from '../models/genealogy';
import { generateCsvTemplate, parseCsvRows, processCsvImport } from '../services/csvImportService';
import { exportGedcom551, parseAndPreviewGedcom, parseGedcom551 } from '../services/gedcomService';
import { validateImportSnapshot } from '../services/importValidationService';

const timestamps = { createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' };
const branch: FamilyBranch = { id: 'chi-1', name: 'Chi Ví Dụ', code: 'VD', subBranches: [], ...timestamps };
const parent: Person = { id: 'person-1', fullName: 'Cha Mẫu', gender: 'male', isLiving: true, branchId: branch.id, ...timestamps };
const snapshot: GenealogyDatabaseSnapshot = {
  app: 'Gia Phả Việt – Cội Nguồn',
  schemaVersion: 1,
  exportedAt: timestamps.updatedAt,
  settings: {
    id: 'default', clanName: 'Gia phả mẫu', clanMotto: '', ancestralHallLocation: '', schemaVersion: 1,
    rootPersonId: parent.id, updatedAt: timestamps.updatedAt,
  },
  branches: [branch],
  people: [parent],
  unions: [],
  relationships: [],
  lifeEvents: [],
  media: [],
  stories: [],
};

describe('CSV import diagnostics', () => {
  it('preserves quoted multiline content and creates a branch when referenced by name', () => {
    const rows = parseCsvRows(
      'Họ và tên;Giới tính;Chi họ;Tiểu sử tóm tắt\r\n' +
      'Người Mẫu;Nữ;Chi Tân;"Dòng thứ nhất, ghi chú\r\nDòng thứ hai: ""Tư liệu"""'
    );
    const result = processCsvImport(rows, []);

    expect(result.errors).toEqual([]);
    expect(result.parsedBranches).toEqual([expect.objectContaining({ name: 'Chi Tân' })]);
    expect(result.parsedPeople[0]).toMatchObject({
      biography: 'Dòng thứ nhất, ghi chú\nDòng thứ hai: "Tư liệu"',
      branchId: result.parsedBranches[0].id,
    });
  });

  it('resolves recognized column names and links to a unique existing person and branch', () => {
    const result = processCsvImport(
      parseCsvRows('Họ và tên,Họ tên Cha,Chi họ\nCon Mẫu,Cha Mẫu,Chi Ví Dụ'),
      [branch], [parent]
    );

    expect(result.errors).toEqual([]);
    expect(result.parsedBranches).toEqual([]);
    expect(result.parsedPeople[0].branchId).toBe(branch.id);
    expect(result.parsedRelationships).toEqual([
      expect.objectContaining({ parentId: parent.id, childId: result.parsedPeople[0].id }),
    ]);
  });

  it('recognizes legacy name headers without importing a header row', () => {
    for (const source of ['Họ tên,Giới tính\nNgười Mẫu,Nam', 'FullName,Gender\nNgười Mẫu,M']) {
      const result = processCsvImport(parseCsvRows(source), []);

      expect(result.errors).toEqual([]);
      expect(result.parsedPeople).toEqual([expect.objectContaining({ fullName: 'Người Mẫu', gender: 'male' })]);
    }
  });

  it('blocks an entire preview when rows are nameless, ambiguous or have invalid enum and date values', () => {
    const result = processCsvImport(
      parseCsvRows(
        'Họ và tên,Giới tính,Năm sinh,Họ tên Cha\n' +
        ',Nam,1980,\n' +
        'Người Mẫu,giá trị lạ,1980abc,Cha Mẫu\n' +
        'Cha Mẫu,Nam,1950,'
      ),
      [branch], [parent]
    );

    expect(result.totalRows).toBe(3);
    expect(result.validRows).toBe(1);
    expect(result.errors).toEqual([
      expect.stringMatching(/Dòng 2: Thiếu họ/),
      expect.stringMatching(/Dòng 3: Giới tính/),
      expect.stringMatching(/Dòng 3: Năm sinh/),
      expect.stringMatching(/Dòng 3: Cha.*không xác định duy nhất/),
    ]);
  });

  it('reports missing relationships and preserves a partial lunar anniversary with a warning', () => {
    const result = processCsvImport(
      parseCsvRows('Họ và tên,Họ tên Vợ/Chồng,Ngày giỗ ÂL (Ngày)\nNgười Mẫu,Người Không Tồn Tại,18'),
      []
    );

    expect(result.errors[0]).toMatch(/Vợ\/chồng.*không tìm thấy/);
    expect(result.warnings[0]).toMatch(/ngày giỗ âm lịch/);
    expect(result.parsedPeople[0].deathAnniversaryLunar?.day).toBe(18);
  });

  it('reports malformed quotes instead of importing truncated fields', () => {
    expect(() => parseCsvRows('Họ và tên,Tiểu sử tóm tắt\nNgười Mẫu,"Dòng thiếu dấu')).toThrow(/ngoặc kép/);
  });

  it('keeps the downloadable CSV template self-contained', () => {
    const result = processCsvImport(parseCsvRows(generateCsvTemplate()), []);

    expect(result.errors).toEqual([]);
    expect(result.validRows).toBe(3);
    expect(result.parsedUnions).toHaveLength(1);
    expect(result.parsedRelationships).toHaveLength(2);
  });
});

describe('GEDCOM import diagnostics', () => {
  const individual = '0 @I1@ INDI\n1 NAME Người /Mẫu/\n1 SEX U';
  const wrap = (records: string) => ['0 HEAD', records, '0 TRLR'].join('\n');

  it('rejects broken syntax, misnested records and missing trailer', () => {
    for (const text of [
      wrap(individual + '\nnot a GEDCOM line'),
      wrap(individual + '\n3 NOTE skipped level'),
      '0 HEAD\n' + individual,
    ]) {
      const preview = parseAndPreviewGedcom(text);
      expect(preview.valid).toBe(false);
      expect(preview.errors.length).toBeGreaterThan(0);
      expect(() => parseGedcom551(text)).toThrow();
    }
  });

  it('rejects duplicate xrefs and missing individual IDs rather than remapping or skipping', () => {
    expect(parseAndPreviewGedcom(wrap([individual, individual].join('\n'))).errors[0]).toMatch(/bị trùng/);
    expect(parseAndPreviewGedcom(wrap('0 INDI\n1 NAME Người Mẫu')).errors[0]).toMatch(/thiếu mã định danh/);
  });

  it('reports dangling family and individual references at their source lines', () => {
    const text = wrap(individual + '\n1 FAMC @FAKE@\n0 @F1@ FAM\n1 HUSB @I1@\n1 CHIL @FAKE@');
    const preview = parseAndPreviewGedcom(text);

    expect(preview.valid).toBe(false);
    expect(preview.errors).toEqual([
      expect.stringMatching(/không tìm thấy gia đình @FAKE@/),
      expect.stringMatching(/CHIL không tìm thấy cá nhân "@FAKE@"/),
    ]);
  });

  it('surfaces unsupported tags and keeps unstructured dates instead of guessing a date', () => {
    const text = wrap(individual + '\n1 BIRT\n2 DATE BET 1930 AND 1933\n2 NOTE chú thích chưa hỗ trợ\n1 OBJE @O1@');
    const preview = parseAndPreviewGedcom(text);

    expect(preview.valid).toBe(true);
    expect(preview.warnings).toEqual(expect.arrayContaining([
      expect.stringMatching(/giữ nguyên văn bản ngày/),
      expect.stringMatching(/INDI.BIRT.NOTE.*INDI.OBJE/),
    ]));
    expect(preview.snapshot.people[0].birthDate).toEqual({ precision: 'unknown', displayText: 'BET 1930 AND 1933' });
  });

  it('surfaces repeated recognized fields when only the first value can be stored', () => {
    const preview = parseAndPreviewGedcom(wrap(
      individual + '\n1 BIRT\n2 DATE 1930\n2 DATE 1931\n2 PLAC Nơi sinh A\n2 PLAC Nơi sinh B'
    ));

    expect(preview.valid).toBe(true);
    expect(preview.warnings).toEqual(expect.arrayContaining([
      expect.stringMatching(/BIRT có nhiều thẻ DATE/),
      expect.stringMatching(/BIRT có nhiều thẻ PLAC/),
    ]));
    expect(preview.snapshot.people[0]).toMatchObject({ birthDate: { year: 1930 }, birthPlace: 'Nơi sinh A' });
  });

  it('passes recognized invalid calendar dates to the runtime validator', () => {
    const preview = parseAndPreviewGedcom(wrap(individual + '\n1 BIRT\n2 DATE 31 FEB 1930'));

    expect(validateImportSnapshot(preview.snapshot).errors.join(' ')).toContain('birthDate');
  });

  it('restores branch and root references without borrowing IDs from the current snapshot', () => {
    const preview = parseAndPreviewGedcom(exportGedcom551(snapshot), snapshot);
    const [importedBranch] = preview.snapshot.branches;

    expect(preview.valid).toBe(true);
    expect(preview.duplicatePeople).toHaveLength(1);
    expect(preview.snapshot.people[0].branchId).toBe(importedBranch.id);
    expect(preview.snapshot.settings.rootPersonId).toBe(preview.snapshot.people[0].id);
    expect(validateImportSnapshot(preview.snapshot).errors).toEqual([]);
  });

  it('accepts an intentionally empty export without inheriting an old root reference', () => {
    const preview = parseAndPreviewGedcom(wrap(''), snapshot);

    expect(preview.valid).toBe(true);
    expect(preview.snapshot.people).toEqual([]);
    expect(preview.snapshot.settings.rootPersonId).toBeUndefined();
    expect(validateImportSnapshot(preview.snapshot).errors).toEqual([]);
  });
});
