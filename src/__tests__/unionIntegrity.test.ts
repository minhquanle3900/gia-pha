import 'fake-indexeddb/auto';
import { expect, it, vi } from 'vitest';
import {
  loadFullSnapshot,
  mergePersonRecords,
  replaceEntireDatabase,
  saveUnionRecord,
} from '../database/db';
import type { GenealogyDatabaseSnapshot, Person, Relationship, Union } from '../models/genealogy';
import { parseAndValidateJsonBackup, serializeDatabaseBackup } from '../services/jsonBackupService';

const date = '2026-01-01T00:00:00.000Z';
const timestamps = { createdAt: date, updatedAt: date };

function person(id: string): Person {
  return { id, fullName: `Thành viên mẫu ${id}`, gender: 'unknown', isLiving: true, ...timestamps };
}

function union(id: string, partnerIds: string[], fields: Partial<Union> = {}): Union {
  return { id, partnerIds, status: 'married', ...timestamps, ...fields };
}

function childLink(id: string, parentId: string, childId: string, unionId: string): Relationship {
  return { id, parentId, childId, unionId, lineageType: 'biological', ...timestamps };
}

function snapshot(fields: Partial<GenealogyDatabaseSnapshot> = {}): GenealogyDatabaseSnapshot {
  return {
    app: 'Gia Phả Việt – Cội Nguồn',
    schemaVersion: 1,
    exportedAt: date,
    settings: {
      id: 'default', clanName: 'Dữ liệu mẫu', clanMotto: '', ancestralHallLocation: '',
      schemaVersion: 1, updatedAt: date,
    },
    people: ['target', 'source', 'partner', 'child-a', 'child-b'].map(person),
    branches: [],
    unions: [],
    relationships: [],
    lifeEvents: [],
    media: [],
    stories: [],
    ...fields,
  };
}

async function businessData() {
  const { exportedAt, ...result } = await loadFullSnapshot();
  return result;
}

it('rejects a second undated union for the same pair regardless of partner order (GP-CLOUD-004)', async () => {
  await replaceEntireDatabase(snapshot());
  await saveUnionRecord(union('first', ['target', 'partner'], { marriageOrder: 1 }));
  const before = await businessData();

  await expect(
    saveUnionRecord(union('duplicate', ['partner', 'target'], { marriageOrder: 2, status: 'divorced' }))
  ).rejects.toThrow(/hôn phối/);
  expect(await businessData()).toEqual(before);
});

it('aborts person merge when rewritten unions collide and preserves child union IDs (GP-REV-001)', async () => {
  await replaceEntireDatabase(snapshot({
    unions: [
      union('retained-union', ['target', 'partner']),
      union('source-union', ['partner', 'source']),
    ],
    relationships: [
      childLink('first-child', 'target', 'child-a', 'retained-union'),
      childLink('second-child', 'source', 'child-b', 'source-union'),
    ],
  }));
  const before = await businessData();

  await expect(mergePersonRecords('target', 'source')).rejects.toThrow(/hôn phối/);
  expect(await businessData()).toEqual(before);
});

it('allows distinct partners, an incomplete legacy union and non-overlapping dates for one pair', async () => {
  await replaceEntireDatabase(snapshot());
  await saveUnionRecord(union('first', ['target', 'partner'], {
    marriageDate: { precision: 'month', year: 1999, month: 2 }, status: 'divorced',
  }));
  await saveUnionRecord(union('remarriage', ['partner', 'target'], {
    marriageDate: { precision: 'exact', year: 1999, month: 5, day: 10 },
  }));
  await saveUnionRecord(union('other-partner', ['target', 'source']));
  await saveUnionRecord(union('unknown-partner', ['target'], { status: 'unknown' }));

  expect((await businessData()).unions.map(({ id }) => id)).toEqual([
    'first', 'other-partner', 'remarriage', 'unknown-partner',
  ]);
});

it('rejects overlapping or uncertain date evidence for the same pair', async () => {
  await replaceEntireDatabase(snapshot({
    unions: [
      union('first', ['target', 'partner'], { marriageDate: { precision: 'year', year: 1999 } }),
    ],
  }));
  const before = await businessData();

  for (const marriageDate of [
    { precision: 'exact', year: 1999, month: 8, day: 20 },
    { precision: 'approx', year: 2003 },
    { precision: 'year', year: 2003, calendar: 'lunar' },
  ] as const) {
    await expect(saveUnionRecord(union('ambiguous', ['target', 'partner'], { marriageDate })))
      .rejects.toThrow(/hôn phối/i);
  }
  expect(await businessData()).toEqual(before);
});

it('uses a whole year for incomplete historical dates and rejects impossible new dates', async () => {
  await replaceEntireDatabase(snapshot({
    unions: [
      union('historic', ['target', 'partner'], {
        status: 'divorced', marriageDate: { precision: 'exact', year: 1899 },
      }),
    ],
  }));

  await saveUnionRecord(union('new', ['target', 'partner'], { marriageDate: { precision: 'year', year: 1901 } }));
  const before = await businessData();
  await expect(saveUnionRecord(union('impossible', ['target', 'source'], {
    marriageDate: { precision: 'exact', year: 1999, month: 2, day: 29 },
  }))).rejects.toThrow(/niên đại/i);
  expect(await businessData()).toEqual(before);
});

it('serializes concurrent writes so only one ambiguous union can be inserted', async () => {
  await replaceEntireDatabase(snapshot());

  const results = await Promise.allSettled([
    saveUnionRecord(union('first', ['target', 'partner'])),
    saveUnionRecord(union('second', ['partner', 'target'])),
  ]);

  expect(results.map(({ status }) => status)).toEqual(['fulfilled', 'rejected']);
  expect((await businessData()).unions.map(({ id }) => id)).toEqual(['first']);
});

it('updates the same union ID and rejects replacing a partner linked to a child', async () => {
  const original = union('first', ['target', 'partner']);
  const link = childLink('link', 'target', 'child-a', original.id);
  await replaceEntireDatabase(snapshot({ unions: [original], relationships: [link] }));
  await saveUnionRecord({ ...original, status: 'divorced' });
  const before = await businessData();

  expect(before.unions[0]).toMatchObject({ id: 'first', status: 'divorced' });
  await expect(saveUnionRecord({ ...original, partnerIds: ['source', 'partner'] })).rejects.toThrow(/cha\/mẹ/);
  expect(await businessData()).toEqual(before);
});

it('rejects saving unions with missing or repeated people', async () => {
  await replaceEntireDatabase(snapshot());
  const before = await businessData();

  await expect(saveUnionRecord(union('missing', ['target', 'absent']))).rejects.toThrow(/thành viên/);
  await expect(saveUnionRecord(union('self', ['target', 'target']))).rejects.toThrow(/chính mình/);
  expect(await businessData()).toEqual(before);
});

function datedRemarriageSnapshot(): GenealogyDatabaseSnapshot {
  return snapshot({
    unions: [
      union('retained-union', ['target', 'partner'], {
        status: 'divorced', marriageDate: { precision: 'year', year: 1995 },
      }),
      union('source-union', ['partner', 'source'], {
        marriageDate: { precision: 'year', year: 2005 },
      }),
    ],
    relationships: [
      childLink('first-child', 'target', 'child-a', 'retained-union'),
      childLink('second-child', 'source', 'child-b', 'source-union'),
    ],
  });
}

it('keeps both dated unions and the original child links after merge and JSON round-trip', async () => {
  await replaceEntireDatabase(datedRemarriageSnapshot());

  await mergePersonRecords('target', 'source');

  const after = await loadFullSnapshot();
  expect(after.unions).toMatchObject([
    { id: 'retained-union', partnerIds: ['target', 'partner'], status: 'divorced' },
    { id: 'source-union', partnerIds: ['partner', 'target'], status: 'married' },
  ]);
  expect(after.relationships).toMatchObject([
    { id: 'first-child', parentId: 'target', childId: 'child-a', unionId: 'retained-union' },
    { id: 'second-child', parentId: 'target', childId: 'child-b', unionId: 'source-union' },
  ]);
  const parsed = parseAndValidateJsonBackup(await serializeDatabaseBackup(after));
  expect(parsed.errors).toEqual([]);
  expect(parsed.snapshot?.unions).toEqual(after.unions);
  expect(parsed.snapshot?.relationships).toEqual(after.relationships);
});

it('allows unrelated legacy same-pair unions to survive merge unchanged', async () => {
  const unions = [
    union('historic-a', ['partner', 'child-a']),
    union('historic-b', ['child-a', 'partner']),
    union('moving', ['source', 'partner']),
  ];
  await replaceEntireDatabase(snapshot({ unions }));

  await mergePersonRecords('target', 'source');

  const after = await businessData();
  expect(after.unions.slice(0, 2)).toEqual(unions.slice(0, 2));
  expect(after.unions[2]).toMatchObject({ id: 'moving', partnerIds: ['target', 'partner'] });
});

it('rolls back people and child links when an accepted union write fails partway through merge', async () => {
  await replaceEntireDatabase(datedRemarriageSnapshot());
  const before = await businessData();
  const put = IDBObjectStore.prototype.put;
  const fault = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value, key) {
    if (this.name === 'unions') throw new Error('Injected union write failure');
    return put.call(this, value, key);
  });
  try {
    await expect(mergePersonRecords('target', 'source')).rejects.toThrow('Injected union write failure');
  } finally {
    fault.mockRestore();
  }
  expect(await businessData()).toEqual(before);
  await mergePersonRecords('target', 'source');
  expect((await businessData()).people.some(({ id }) => id === 'source')).toBe(false);
});
