import 'fake-indexeddb/auto';
import { expect, it } from 'vitest';
import { loadFullSnapshot, mergeDatabaseSnapshot, replaceEntireDatabase } from '../database/db';
import type { GenealogyDatabaseSnapshot, Person } from '../models/genealogy';
import { parseCsvRows, processCsvImport } from '../services/csvImportService';
import { findPotentialDuplicates } from '../services/duplicateMergeService';

const now = '2026-11-25T00:00:00.000Z';

const original: Person = {
  id: 'original',
  fullName: 'Thành viên Mẫu A',
  gender: 'male',
  isLiving: true,
  birthDate: { precision: 'exact', year: 1954, month: 5, day: 19 },
  generation: 4,
  createdAt: now,
  updatedAt: now,
};

const initial: GenealogyDatabaseSnapshot = {
  app: 'Gia Phả Việt – Cội Nguồn',
  schemaVersion: 1,
  exportedAt: now,
  settings: {
    id: 'default',
    clanName: 'Gia đình mẫu',
    clanMotto: '',
    ancestralHallLocation: '',
    schemaVersion: 1,
    updatedAt: now,
  },
  people: [original],
  branches: [],
  unions: [],
  relationships: [],
  lifeEvents: [],
  media: [],
  stories: [],
};

it('flags same name and birth year after CSV append despite a generation mismatch (GP-DESK-006)', async () => {
  await replaceEntireDatabase(initial);
  const csv = [
    'Họ và tên,Giới tính,Đời thứ,Năm sinh',
    'Thành viên Mẫu A,Nam,3,1954',
  ].join('\n');
  const parsed = processCsvImport(parseCsvRows(csv), initial.branches, initial.people);
  expect(parsed.errors).toEqual([]);
  expect(parsed.parsedPeople).toHaveLength(1);
  await mergeDatabaseSnapshot({ ...initial, people: parsed.parsedPeople });

  const stored = await loadFullSnapshot();
  const candidates = findPotentialDuplicates(stored.people, stored.relationships, stored.unions);

  expect(candidates).toHaveLength(1);
  expect([candidates[0].personA.id, candidates[0].personB.id]).toEqual([
    original.id, parsed.parsedPeople[0].id,
  ]);
  expect(candidates[0].reasons).toEqual(expect.arrayContaining([
    expect.stringContaining('Cùng năm sinh'),
    expect.stringContaining('Khác đời'),
  ]));
  expect((await loadFullSnapshot()).people).toEqual(stored.people);
});

it('keeps the generation penalty when only the names match', () => {
  const another: Person = { ...original, id: 'other', generation: 3, birthDate: undefined };

  expect(findPotentialDuplicates([original, another], [], [])).toEqual([]);
});

it('keeps the known-gender mismatch guard for exact name and year', () => {
  const another: Person = { ...original, id: 'other', gender: 'female' };

  expect(findPotentialDuplicates([original, another], [], [])).toEqual([]);
});
