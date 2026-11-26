import { expect, it } from 'vitest';
import type { GenealogyDatabaseSnapshot, Person, Relationship } from '../models/genealogy';
import { exportToGedcom551, parseAndPreviewGedcom } from '../services/gedcomService';
import { validateImportSnapshot } from '../services/importValidationService';

const time = '2026-01-01T00:00:00.000Z';
const timestamps = { createdAt: time, updatedAt: time };

function person(id: string, fullName: string, gender: Person['gender']): Person {
  return { id, fullName, gender, isLiving: true, ...timestamps };
}

function fixture(): GenealogyDatabaseSnapshot {
  return {
    app: 'Gia Phả Việt – Cội Nguồn',
    schemaVersion: 1,
    exportedAt: time,
    settings: {
      id: 'default', schemaVersion: 1, updatedAt: time, rootPersonId: 'parent',
      clanName: 'Dòng họ Mẫu', clanMotto: '', ancestralHallLocation: '',
    },
    people: [
      person('parent', 'Phạm Mẫu A', 'male'),
      person('biological', 'Đỗ Mẫu B', 'female'),
      person('step', 'Lê Mẫu C', 'female'),
      person('child', 'Phạm Mẫu D', 'unknown'),
    ],
    branches: [],
    unions: [
      { id: 'first', partnerIds: ['parent', 'biological'], status: 'widowed', ...timestamps },
      { id: 'second', partnerIds: ['parent', 'step'], status: 'married', ...timestamps },
    ],
    relationships: [
      { id: 'r1', parentId: 'parent', childId: 'child', lineageType: 'biological', unionId: 'first', ...timestamps },
      { id: 'r2', parentId: 'biological', childId: 'child', lineageType: 'biological', unionId: 'first', ...timestamps },
      { id: 'r3', parentId: 'step', childId: 'child', lineageType: 'step', unionId: 'second', ...timestamps },
    ],
    lifeEvents: [{ id: 'e', title: 'Mốc mẫu', personId: 'child', type: 'other', ...timestamps }],
    media: [{
      id: 'm', title: 'Ảnh mẫu', personIds: ['parent'], category: 'historical_photo',
      mimeType: 'image/png', dataUrl: 'data:image/png;base64,AA==', ...timestamps,
    }],
    stories: [{ id: 's', title: 'Chuyện mẫu', content: 'Tư liệu tổng hợp', personIds: ['parent'], mediaIds: ['m'], ...timestamps }],
  };
}

function edgeKeys(snapshot: GenealogyDatabaseSnapshot): string[] {
  const people = new Map(snapshot.people.map((entry) => [entry.id, entry.fullName]));
  const unions = new Map(snapshot.unions.map((entry) => [
    entry.id, entry.partnerIds.map((id) => people.get(id)).sort().join('+'),
  ]));
  return snapshot.relationships.map((edge) => [
    people.get(edge.parentId), people.get(edge.childId), edge.lineageType,
    edge.unionId ? unions.get(edge.unionId) : '(unbound)',
  ].join('|')).sort();
}

it('round-trips explicit step-parent edges without assigning a second edge to the spouse (GP-DESK-005)', () => {
  const original = fixture();
  const gedcom = exportToGedcom551(original);
  const preview = parseAndPreviewGedcom(gedcom);

  expect(preview.errors).toEqual([]);
  expect(preview.snapshot.unions).toHaveLength(original.unions.length);
  expect(edgeKeys(preview.snapshot)).toEqual(edgeKeys(original));
  expect(validateImportSnapshot(preview.snapshot).errors).toEqual([]);
  expect(preview.snapshot.lifeEvents).toEqual([]);
  expect(preview.snapshot.media).toEqual([]);
  expect(preview.snapshot.stories).toEqual([]);
});

it('round-trips different per-parent lineage and an unbound relation without inventing unions', () => {
  const original = fixture();
  const [first, second, third] = original.relationships;
  original.relationships = [
    first,
    { ...second, lineageType: 'adoptive' },
    third,
    { ...third, id: 'r4', parentId: 'biological', unionId: undefined, lineageType: 'unknown' } satisfies Relationship,
  ];

  const preview = parseAndPreviewGedcom(exportToGedcom551(original));

  expect(preview.errors).toEqual([]);
  expect(preview.snapshot.unions).toHaveLength(original.unions.length);
  expect(edgeKeys(preview.snapshot)).toEqual(edgeKeys(original));
});

it('keeps explicit children and both named parents in a standard FAM without extensions', () => {
  const gedcom = [
    '0 HEAD', '1 CHAR UTF-8',
    '0 @I1@ INDI', '1 NAME A',
    '0 @I2@ INDI', '1 NAME B',
    '0 @I3@ INDI', '1 NAME C', '1 FAMC @F1@', '2 PEDI adopted',
    '0 @F1@ FAM', '1 HUSB @I1@', '1 WIFE @I2@', '1 CHIL @I3@',
    '0 TRLR',
  ].join('\n');

  const preview = parseAndPreviewGedcom(gedcom);

  expect(preview.errors).toEqual([]);
  expect(preview.snapshot.unions).toHaveLength(1);
  expect(edgeKeys(preview.snapshot)).toEqual(['A|C|adoptive|A+B', 'B|C|adoptive|A+B']);
});

it('rejects a single-parent projection that refers to a missing marriage record', () => {
  const gedcom = exportToGedcom551(fixture()).replace('1 _GP_UNION @F2@', '1 _GP_UNION @Missing@');

  const preview = parseAndPreviewGedcom(gedcom);

  expect(preview.valid).toBe(false);
  expect(preview.errors).toContainEqual(expect.stringContaining('_GP_UNION không trỏ đến'));
});
