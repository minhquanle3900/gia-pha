import 'fake-indexeddb/auto';
import { expect, it, vi } from 'vitest';
import {
  getDatabase,
  loadFullSnapshot,
  mergeDatabaseSnapshot,
  replaceEntireDatabase,
  restoreDatabaseSnapshot,
} from '../database/db';
import type { GenealogyDatabaseSnapshot, Person, Relationship } from '../models/genealogy';
import { parseCsvRows, processCsvImport } from '../services/csvImportService';
import { parseAndPreviewGedcom } from '../services/gedcomService';
import {
  parseAndValidateJsonBackup,
  serializeDatabaseBackup,
  validateAndPreviewJsonBackup,
} from '../services/jsonBackupService';

const timestamp = '2026-01-01T00:00:00.000Z';
const timestamps = { createdAt: timestamp, updatedAt: timestamp };

function person(id: string): Person {
  return { id, fullName: `Hồ sơ mẫu ${id}`, gender: 'unknown', isLiving: true, ...timestamps };
}

function relationship(id: string, parentId: string, childId: string): Relationship {
  return { id, parentId, childId, lineageType: 'unknown', ...timestamps };
}

function snapshot(fields: Partial<GenealogyDatabaseSnapshot> = {}): GenealogyDatabaseSnapshot {
  return {
    app: 'Gia Phả Việt – Cội Nguồn', schemaVersion: 1, exportedAt: timestamp,
    settings: {
      id: 'default', clanName: 'Dữ liệu tổng hợp', clanMotto: '', ancestralHallLocation: '',
      schemaVersion: 1, updatedAt: timestamp,
    },
    people: [], branches: [], unions: [], relationships: [], lifeEvents: [], media: [], stories: [],
    ...fields,
  };
}

async function storedData() {
  const { exportedAt, ...data } = await loadFullSnapshot();
  return data;
}

it('rejects a cycle formed only by combining the backup with IndexedDB (GP-CLOUD-003)', async () => {
  const people = ['a', 'b', 'c'].map(person);
  await replaceEntireDatabase(snapshot({
    people,
    relationships: [relationship('ab', 'a', 'b'), relationship('bc', 'b', 'c')],
  }));
  const before = await storedData();

  await expect(mergeDatabaseSnapshot(snapshot({
    people: [...people, person('new')],
    relationships: [relationship('ca', 'c', 'a')],
  }))).rejects.toThrow(/vòng lặp/i);

  expect(await storedData()).toEqual(before);
});

function linkedSnapshot(): GenealogyDatabaseSnapshot {
  const base = snapshot();
  const image = 'data:image/png;base64,AA==';
  return {
    ...base,
    settings: { ...base.settings, rootPersonId: 'parent' },
    branches: [{ id: 'b', name: 'Chi mẫu', code: 'B', founderId: 'parent', subBranches: [], ...timestamps }],
    people: [
      { ...person('parent'), branchId: 'b', portraitMediaId: 'm', portraitUrl: image },
      person('child'),
    ],
    unions: [{ id: 'u', partnerIds: ['parent'], status: 'unknown', ...timestamps }],
    relationships: [{ ...relationship('r', 'parent', 'child'), unionId: 'u' }],
    lifeEvents: [{ id: 'e', personId: 'child', title: 'Mốc tổng hợp', type: 'other', ...timestamps }],
    media: [{
      id: 'm', title: 'Ảnh tổng hợp', category: 'portrait', mimeType: 'image/png',
      dataUrl: image, personIds: ['parent'], branchId: 'b', ...timestamps,
    }],
    stories: [{
      id: 's', title: 'Chuyện mẫu', content: 'Nội dung tổng hợp', personIds: ['child'],
      mediaIds: ['m'], branchId: 'b', ...timestamps,
    }],
  };
}

it('round-trips a self-contained v1 backup with links in every store', async () => {
  const original = linkedSnapshot();
  const parsed = parseAndValidateJsonBackup(await serializeDatabaseBackup(original));

  expect(parsed.errors).toEqual([]);
  expect(parsed.warnings).toEqual([]);
  expect(parsed.snapshot).toMatchObject({ ...original, exportedAt: expect.any(String) });
  await restoreDatabaseSnapshot(parsed.snapshot!);
  const persisted = await storedData();
  const exported = await serializeDatabaseBackup(await loadFullSnapshot());

  expect(parseAndValidateJsonBackup(exported).snapshot).toMatchObject({
    ...persisted, settings: { ...persisted.settings, lastBackupAt: expect.any(String) },
  });
  expect(persisted.people).toHaveLength(2);
});

it('accepts a deliberately empty v1 restore', async () => {
  await replaceEntireDatabase(linkedSnapshot());
  const preview = validateAndPreviewJsonBackup(JSON.stringify(snapshot()), await loadFullSnapshot());

  expect(preview.valid).toBe(true);
  await restoreDatabaseSnapshot(preview.snapshot!);
  expect((await storedData()).people).toEqual([]);
  expect((await storedData()).stories).toEqual([]);
});

it('accepts the minimal legacy v1 shape with explicit default warnings', () => {
  const preview = parseAndValidateJsonBackup(JSON.stringify({
    schemaVersion: 1,
    people: [{ ...person('legacy'), createdAt: '', updatedAt: '', birthDate: { precision: 'unknown' } }],
    unions: [],
    relationships: [],
  }));

  expect(preview.valid).toBe(true);
  expect(preview.snapshot?.people[0].birthDate).toEqual({ precision: 'unknown' });
  expect(preview.warnings).toEqual(expect.arrayContaining([expect.stringContaining('thiếu settings'),
    expect.stringContaining('lifeEvents')]));
  expect(preview.snapshot?.lifeEvents).toEqual([]);
});

it.each([
  ['duplicate IDs', { people: [person('same'), person('same')] }, /people.*trùng/],
  ['missing required fields', { people: [{ id: 'missing-name' }] }, /fullName/],
  ['invalid nested object', { lifeEvents: [null] }, /lifeEvents/],
  ['explicit malformed collection', { media: {} }, /media/],
  ['explicit malformed settings', { settings: [] }, /settings/],
  ['invalid enum', { people: [{ ...person('p'), gender: 'invalid' }] }, /gender/],
  ['invalid nested date', { people: [{ ...person('p'), birthDate: { precision: 'exact', year: 2023, month: 2, day: 29 } }] }, /birthDate/],
  ['invalid nested list', { stories: [{ ...linkedSnapshot().stories[0], mediaIds: [42] }] }, /mediaIds/],
  ['referencing missing media', { people: [{ ...person('p'), portraitMediaId: 'missing' }] }, /portraitMediaId/],
  ['referencing missing person', { lifeEvents: [{ ...linkedSnapshot().lifeEvents[0], personId: 'missing' }] }, /personId/],
  ['self-reference', { people: [person('a')], relationships: [relationship('same', 'a', 'a')] }, /chính mình/],
  ['ancestry cycle', { people: ['a', 'b'].map(person), relationships: [relationship('ab', 'a', 'b'), relationship('ba', 'b', 'a')] }, /vòng lặp/],
  ['branch cycle', { branches: [
    { ...linkedSnapshot().branches[0], founderId: undefined, parentBranchId: 'next' },
    { ...linkedSnapshot().branches[0], id: 'next', founderId: undefined, parentBranchId: 'b' },
  ] }, /vòng lặp chi họ/],
])('blocks %s during JSON preview', (_description, fields, error) => {
  const result = parseAndValidateJsonBackup(JSON.stringify({ ...snapshot(), ...fields }));
  expect(result.valid).toBe(false);
  expect(result.snapshot).toBeUndefined();
  expect(result.errors.join(' ')).toMatch(error);
});

it('reports business chronology as a warning and leaves the original dates intact', () => {
  const unusual = {
    ...person('p'),
    isLiving: false,
    birthDate: { precision: 'year', year: 2000 },
    deathDate: { precision: 'year', year: 1990 },
  };
  const result = parseAndValidateJsonBackup(JSON.stringify({ ...snapshot(), people: [unusual] }));

  expect(result.valid).toBe(true);
  expect(result.warnings.length).toBeGreaterThan(0);
  expect(result.snapshot?.people[0]).toEqual(unusual);
});

it('blocks invalid restore at the write boundary without touching the current snapshot', async () => {
  await replaceEntireDatabase(linkedSnapshot());
  const before = await storedData();
  const invalid = snapshot({
    people: [person('new')],
    lifeEvents: [{ ...linkedSnapshot().lifeEvents[0], personId: 'missing' }],
  });

  await expect(restoreDatabaseSnapshot(invalid)).rejects.toThrow(/lifeEvents/);
  expect(await storedData()).toEqual(before);
});

it('adds records whose references resolve in the live database and keeps identical IDs once', async () => {
  const current = linkedSnapshot();
  await replaceEntireDatabase(current);
  const incoming = snapshot({
    people: [{ ...person('child'), notes: undefined }, person('new')],
    relationships: [relationship('rel-new', 'parent', 'new')],
    settings: { ...snapshot().settings, clanName: 'Tên khác' },
  });
  const parsed = validateAndPreviewJsonBackup(JSON.stringify(incoming), await loadFullSnapshot(), 'merge');
  expect(parsed.valid).toBe(true);
  expect(parsed.warnings.join(' ')).toMatch(/giữ nguyên thiết lập/);

  await expect(mergeDatabaseSnapshot(parsed.snapshot!)).resolves.toEqual({
    addedPeople: 1, addedRelationships: 1, addedMedia: 0,
  });
  expect(await mergeDatabaseSnapshot(parsed.snapshot!)).toEqual({
    addedPeople: 0, addedRelationships: 0, addedMedia: 0,
  });
  const stored = await storedData();
  expect(stored.settings).toEqual(current.settings);
  expect(stored.people.map(({ id }) => id)).toEqual(['child', 'new', 'parent']);
});

it('rechecks a same-ID conflict created after preview without overwriting anything', async () => {
  const current = snapshot({ people: [person('existing')] });
  await replaceEntireDatabase(current);
  const incoming = snapshot({
    people: [person('collision'), person('otherwise-valid')],
    relationships: [relationship('new-edge', 'existing', 'collision')],
  });
  const preview = validateAndPreviewJsonBackup(JSON.stringify(incoming), await loadFullSnapshot(), 'merge');
  expect(preview.valid).toBe(true);

  const db = await getDatabase();
  await db.add('people', { ...person('collision'), fullName: 'Thay đổi sau khi xem trước' });
  const before = await storedData();
  const refreshed = validateAndPreviewJsonBackup(JSON.stringify(incoming), await loadFullSnapshot(), 'merge');

  expect(refreshed.valid).toBe(false);
  await expect(mergeDatabaseSnapshot(preview.snapshot!)).rejects.toThrow(/people\[collision\].*trùng ID/);
  expect(await storedData()).toEqual(before);
});

it('checks the incoming root reference during merge even though it keeps local settings', async () => {
  await replaceEntireDatabase(linkedSnapshot());
  const before = await storedData();
  const incoming = snapshot({
    people: [person('valid')],
    settings: { ...snapshot().settings, rootPersonId: 'absent' },
  });

  await expect(mergeDatabaseSnapshot(incoming)).rejects.toThrow(/settings.rootPersonId/);

  expect(await storedData()).toEqual(before);
});

it('does not replace an existing link with the same ID but different endpoints', async () => {
  const original = linkedSnapshot();
  await replaceEntireDatabase(original);
  const before = await storedData();

  await expect(mergeDatabaseSnapshot(snapshot({
    relationships: [relationship('r', 'child', 'parent')],
  }))).rejects.toThrow(/relationships\[r\].*trùng ID/);
  expect(await storedData()).toEqual(before);
});

it('rolls back a synchronous restore failure after the stores were cleared and writing began', async () => {
  await replaceEntireDatabase(linkedSnapshot());
  const before = await storedData();
  const next = linkedSnapshot();
  next.settings.clanName = 'Thay thế tổng hợp';

  const put = IDBObjectStore.prototype.put;
  const spy = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value, key) {
    if (this.name === 'relationships') throw new Error('Injected synchronous restore failure');
    return put.call(this, value, key);
  });
  try {
    await expect(restoreDatabaseSnapshot(next)).rejects.toThrow('Injected synchronous restore failure');
  } finally {
    spy.mockRestore();
  }
  expect(await storedData()).toEqual(before);

  await restoreDatabaseSnapshot(next);
  expect((await storedData()).settings.clanName).toBe(next.settings.clanName);
});

it('rolls back an asynchronous merge request error after a new person was added', async () => {
  const current = linkedSnapshot();
  await replaceEntireDatabase(current);
  const before = await storedData();
  const incoming = snapshot({
    people: [person('new')],
    relationships: [relationship('new-link', 'parent', 'new')],
  });

  const add = IDBObjectStore.prototype.add;
  const spy = vi.spyOn(IDBObjectStore.prototype, 'add').mockImplementation(function (this: IDBObjectStore, value, key) {
    // Use an existing primary key to make this real request fail asynchronously.
    return add.call(this, this.name === 'relationships' ? current.relationships[0] : value, key);
  });
  try {
    await expect(mergeDatabaseSnapshot(incoming)).rejects.toMatchObject({ name: 'ConstraintError' });
  } finally {
    spy.mockRestore();
  }
  expect(await storedData()).toEqual(before);

  await expect(mergeDatabaseSnapshot(incoming)).resolves.toMatchObject({ addedPeople: 1, addedRelationships: 1 });
});

it('appends a CSV candidate with a new branch and an existing parent through the same merge boundary', async () => {
  const current = snapshot({ people: [person('parent')] });
  await replaceEntireDatabase(current);
  const csv = [
    'Họ và tên,Giới tính,Chi họ,Họ tên Cha',
    'Thành viên nhập,Nữ,Chi mới,Hồ sơ mẫu parent',
  ].join('\n');
  const parsed = processCsvImport(parseCsvRows(csv), current.branches, current.people);
  expect(parsed.errors).toEqual([]);

  await mergeDatabaseSnapshot(snapshot({
    people: parsed.parsedPeople,
    branches: parsed.parsedBranches,
    relationships: parsed.parsedRelationships,
    unions: parsed.parsedUnions,
  }));

  const stored = await storedData();
  expect(stored.branches).toMatchObject([{ name: 'Chi mới' }]);
  expect(stored.relationships).toMatchObject([{ parentId: 'parent', childId: parsed.parsedPeople[0].id }]);
  expect(stored.people).toContainEqual(current.people[0]);
});

it('restores a GEDCOM candidate with a branch and family without referencing the current snapshot', async () => {
  await replaceEntireDatabase(linkedSnapshot());
  const gedcom = [
    '0 HEAD',
    '1 GEDC',
    '2 VERS 5.5.1',
    '1 CHAR UTF-8',
    '0 @I1@ INDI',
    '1 NAME Cha /Mẫu/',
    '1 _BRAN Chi thử',
    '0 @I2@ INDI',
    '1 NAME Con /Mẫu/',
    '0 @F1@ FAM',
    '1 HUSB @I1@',
    '1 CHIL @I2@',
    '0 TRLR',
  ].join('\n');
  const parsed = parseAndPreviewGedcom(gedcom);
  expect(parsed.errors).toEqual([]);
  expect(parsed.valid).toBe(true);

  await restoreDatabaseSnapshot(parsed.snapshot);

  const stored = await storedData();
  expect(stored.people).toHaveLength(2);
  expect(stored.branches).toMatchObject([{ name: 'Chi thử' }]);
  expect(stored.relationships).toMatchObject([{
    parentId: parsed.snapshot.people[0].id, childId: parsed.snapshot.people[1].id,
  }]);
  expect(stored.settings.rootPersonId).toBe(parsed.snapshot.people[0].id);
  expect(stored.media).toEqual([]);
});
