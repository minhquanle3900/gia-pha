import 'fake-indexeddb/auto';
import { describe, expect, it } from 'vitest';
import { loadFullSnapshot, restoreDatabaseSnapshot } from '../database/db';
import type { FlexibleDate, GenealogyDatabaseSnapshot, Person } from '../models/genealogy';
import { parseAndPreviewGedcom } from '../services/gedcomService';
import { validateImportSnapshot } from '../services/importValidationService';
import { parseAndValidateJsonBackup, serializeDatabaseBackup } from '../services/jsonBackupService';

const timestamp = '2026-01-01T00:00:00.000Z';
const timestamps = { createdAt: timestamp, updatedAt: timestamp };
const person: Person = {
  id: 'p',
  fullName: 'Hồ sơ tổng hợp',
  isLiving: false,
  gender: 'unknown',
  ...timestamps,
};

function snapshot(fields: Partial<GenealogyDatabaseSnapshot> = {}): GenealogyDatabaseSnapshot {
  return {
    app: 'Gia Phả Việt – Cội Nguồn',
    schemaVersion: 1,
    exportedAt: timestamp,
    settings: {
      id: 'default', clanName: 'Dữ liệu kiểm thử', clanMotto: '', ancestralHallLocation: '',
      schemaVersion: 1, updatedAt: timestamp,
    },
    branches: [], people: [person], unions: [], relationships: [], lifeEvents: [], media: [], stories: [],
    ...fields,
  };
}

describe('GP-REV-006 FlexibleDate precision and legacy chronology', () => {
  it('warns on mismatched precision across person, union and life event dates without changing the backup', async () => {
    const candidate = snapshot({
      people: [{
        ...person,
        birthDate: { precision: 'exact', month: 2, day: 29 },
        deathDate: { precision: 'year', year: 1950, month: 3, day: 10 },
      }],
      unions: [{
        id: 'u', status: 'unknown', partnerIds: [person.id], ...timestamps,
        marriageDate: { precision: 'month', year: 1930, displayText: 'Mùa đông' },
      }],
      lifeEvents: [{
        id: 'e', personId: person.id, type: 'other', title: 'Mốc tổng hợp', ...timestamps,
        date: { precision: 'unknown', year: 1940, displayText: 'Hồi nhỏ' },
      }],
    });

    const preview = parseAndValidateJsonBackup(JSON.stringify(candidate));

    expect(preview.valid).toBe(true);
    expect(preview.errors).toEqual([]);
    expect(preview.warnings).toEqual(expect.arrayContaining([
      expect.stringMatching(/people\[p\]\.birthDate.*precision/),
      expect.stringMatching(/people\[p\]\.deathDate.*precision/),
      expect.stringMatching(/unions\[u\]\.marriageDate.*precision/),
      expect.stringMatching(/lifeEvents\[e\]\.date.*precision/),
    ]));
    expect(preview.snapshot).toEqual(candidate);

    await restoreDatabaseSnapshot(preview.snapshot!);
    const restored = await loadFullSnapshot();
    expect(restored.people).toEqual(candidate.people);
    expect(restored.unions).toEqual(candidate.unions);
    expect(restored.lifeEvents).toEqual(candidate.lifeEvents);
    const exported = parseAndValidateJsonBackup(await serializeDatabaseBackup(restored));
    expect(exported.valid).toBe(true);
    expect(exported.snapshot?.people).toEqual(candidate.people);
    expect(exported.snapshot?.unions).toEqual(candidate.unions);
    expect(exported.snapshot?.lifeEvents).toEqual(candidate.lifeEvents);
  });

  it('keeps an empty declared legacy date with an explicit compatibility warning', () => {
    const birthDate: FlexibleDate = { precision: 'exact', displayText: '   ' };
    const preview = parseAndValidateJsonBackup(JSON.stringify(snapshot({ people: [{ ...person, birthDate }] })));

    expect(preview.valid).toBe(true);
    expect(preview.warnings).toEqual([expect.stringMatching(/birthDate.*precision.*thiếu/)]);
    expect(preview.snapshot?.people[0].birthDate).toEqual(birthDate);
  });

  it.each([
    { precision: 'unknown' },
    { precision: 'unknown', displayText: 'Cuối đời Lê' },
    { precision: 'approx', displayText: 'Khoảng giữa thế kỷ XIX' },
    { precision: 'before', displayText: 'Trước năm mở trường làng' },
    { precision: 'after', displayText: 'Sau lần dời làng' },
    { precision: 'exact', year: 2000, month: 2, day: 29 },
    { precision: 'exact', year: 2000, month: 2, day: 30, calendar: 'lunar' },
    { precision: 'month', year: 1900, month: 2 },
    { precision: 'year', year: 1900 },
  ] satisfies FlexibleDate[])('accepts legitimate %j dates', (birthDate) => {
    const result = validateImportSnapshot(snapshot({ people: [{ ...person, birthDate }] }));
    expect(result).toEqual({ errors: [], warnings: [] });
  });

  it.each([
    { precision: 'exact', year: 1900, month: 2, day: 29 },
    { precision: 'exact', year: 1900, month: 4, day: 31 },
    { precision: 'exact', year: 1900, month: 1, day: 31, calendar: 'lunar' },
  ] satisfies FlexibleDate[])('blocks impossible dates despite the declared %j precision', (birthDate) => {
    const result = validateImportSnapshot(snapshot({ people: [{ ...person, birthDate }] }));
    expect(result.errors.join(' ')).toContain('birthDate');
  });

  it('preserves GEDCOM month, approximate date, and unresolved date text', () => {
    const preview = parseAndPreviewGedcom([
      '0 HEAD',
      '0 @I1@ INDI', '1 NAME Hồ sơ /Mẫu A/', '1 _GEN 1', '1 BIRT', '2 DATE FEB 1900',
      '0 @I2@ INDI', '1 NAME Hồ sơ /Mẫu B/', '1 _GEN 1', '1 BIRT', '2 DATE ABT 9 DEC 1840',
      '0 @I3@ INDI', '1 NAME Hồ sơ /Mẫu C/', '1 _GEN 1', '1 BIRT', '2 DATE BET 1930 AND 1933',
      '0 TRLR',
    ].join('\n'));

    expect(preview.valid).toBe(true);
    expect(preview.snapshot.people.map((member) => member.birthDate)).toEqual([
      { precision: 'month', year: 1900, month: 2, day: undefined, displayText: 'FEB 1900' },
      { precision: 'approx', year: 1840, month: 12, day: 9, displayText: 'ABT 9 DEC 1840' },
      { precision: 'unknown', displayText: 'BET 1930 AND 1933' },
    ]);
    const result = validateImportSnapshot(preview.snapshot);
    expect(result.errors).toEqual([]);
    expect(result.warnings.filter((message) => message.includes('precision'))).toEqual([]);
  });
});
