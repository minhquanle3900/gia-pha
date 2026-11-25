import 'fake-indexeddb/auto';
import { describe, expect, it, vi } from 'vitest';
import {
  deletePersonSafely,
  getDatabase,
  loadFullSnapshot,
  mergePersonRecords,
  replaceEntireDatabase,
} from '../database/db';
import type { GenealogyDatabaseSnapshot, LifeEvent, Person, Relationship, Union } from '../models/genealogy';

const timestamps = {
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

function person(id: string, fields: Partial<Person> = {}): Person {
  return { id, fullName: 'Thành viên tổng hợp', gender: 'unknown', isLiving: false, ...timestamps, ...fields };
}

function snapshot(fields: Partial<GenealogyDatabaseSnapshot> = {}): GenealogyDatabaseSnapshot {
  return {
    app: 'Gia Phả Việt – Cội Nguồn',
    schemaVersion: 1,
    exportedAt: timestamps.createdAt,
    settings: {
      id: 'default', clanName: 'Dữ liệu kiểm thử', clanMotto: '', ancestralHallLocation: '',
      schemaVersion: 1, updatedAt: timestamps.updatedAt,
    },
    people: [person('target'), person('source')],
    branches: [],
    unions: [],
    relationships: [],
    lifeEvents: [],
    media: [],
    stories: [],
    ...fields,
  };
}

function lifeEvent(id: string, personId: string): LifeEvent {
  return { id, personId, type: 'other', title: `Cột mốc tổng hợp ${id}`, ...timestamps };
}

function relationship(id: string, parentId: string, childId: string, fields: Partial<Relationship> = {}): Relationship {
  return { id, parentId, childId, lineageType: 'biological', ...timestamps, ...fields };
}

function union(id: string, partnerIds: string[], fields: Partial<Union> = {}): Union {
  return { id, partnerIds, status: 'married', ...timestamps, ...fields };
}

function linkedSnapshot(): GenealogyDatabaseSnapshot {
  const initial = snapshot();
  return {
    ...initial,
    settings: { ...initial.settings, rootPersonId: 'source' },
    people: [
      person('target', { branchId: 'branch-target', secondaryBranchIds: ['branch-shared'] }),
      person('source', {
        branchId: 'branch-source',
        secondaryBranchIds: ['branch-shared'],
        portraitMediaId: 'portrait',
        portraitUrl: 'data:image/png;base64,AA==',
      }),
      person('grandparent'),
      person('parent'),
      person('child'),
      person('stepchild'),
      person('partner-a'),
      person('partner-b'),
    ],
    branches: [
      { id: 'branch-target', name: 'Chi mẫu A', code: 'A', subBranches: [], ...timestamps },
      { id: 'branch-source', name: 'Chi mẫu B', code: 'B', subBranches: [], founderId: 'source', ...timestamps },
      { id: 'branch-shared', name: 'Chi mẫu C', code: 'C', subBranches: [], founderId: 'source', ...timestamps },
    ],
    unions: [
      union('marriage-1', ['partner-a', 'source'], { marriageOrder: 1, notes: 'Hôn phối mẫu thứ nhất' }),
      union('marriage-2', ['source', 'partner-b'], { marriageOrder: 2, status: 'widowed' }),
      union('one-partner', ['source'], { status: 'unknown' }),
    ],
    relationships: [
      relationship('ancestor', 'grandparent', 'parent'),
      relationship('from-parent', 'parent', 'source'),
      relationship('a-source-edge', 'source', 'child', { unionId: 'marriage-1', birthOrder: 1, notes: 'Nguồn' }),
      relationship('z-target-edge', 'target', 'child', { lineageType: 'unknown', notes: 'Đích' }),
      relationship('other-parent', 'partner-a', 'child', { unionId: 'marriage-1' }),
      relationship('from-step-parent', 'source', 'stepchild', { lineageType: 'step', unionId: 'marriage-2' }),
    ],
    lifeEvents: [lifeEvent('event', 'source')],
    media: [
      { id: 'portrait', title: 'Ảnh thử', category: 'portrait', mimeType: 'image/png',
        dataUrl: 'data:image/png;base64,AA==', personIds: [], ...timestamps },
      { id: 'keepsake', title: 'Kỷ vật thử', category: 'document', mimeType: 'application/pdf',
        dataUrl: 'data:application/pdf;base64,AA==', personIds: ['source', 'target', 'child'], ...timestamps },
    ],
    stories: [{
      id: 'story', title: 'Nhật ký thử', content: 'Nội dung tổng hợp', personIds: ['source', 'target', 'child'],
      mediaIds: ['keepsake'], recordedBy: 'Người ghi mẫu', ...timestamps,
    }],
  };
}

async function businessData() {
  const { exportedAt, ...stored } = await loadFullSnapshot();
  return stored;
}

describe('Atomic person merge in IndexedDB', () => {
  it('keeps all LifeEvents and reassigns source events to the surviving person (GP-CLOUD-001)', async () => {
    const events = [lifeEvent('event-a', 'source'), lifeEvent('event-b', 'source'), lifeEvent('event-c', 'target')];
    await replaceEntireDatabase(snapshot({ lifeEvents: events }));

    await mergePersonRecords('target', 'source');

    const stored = await loadFullSnapshot();
    expect(stored.people.map((entry) => entry.id)).toEqual(['target']);
    expect(stored.lifeEvents).toMatchObject(
      events.map(({ updatedAt, ...event }) => ({ ...event, personId: 'target' }))
    );
  });

  it('keeps the target ID and fills missing profile fields from the source', async () => {
    await replaceEntireDatabase(snapshot({
      people: [person('target', { alias: 'Đích' }), person('source', { alias: 'Nguồn', occupation: 'Nghề mẫu' })],
    }));

    await mergePersonRecords('target', 'source');

    expect((await businessData()).people).toMatchObject([{ id: 'target', alias: 'Đích', occupation: 'Nghề mẫu' }]);
  });

  it('preserves portrait, keepsake, story, root, founder and additional branch membership', async () => {
    const initial = linkedSnapshot();
    await replaceEntireDatabase(initial);

    await mergePersonRecords('target', 'source');

    const stored = await businessData();
    const target = stored.people.find((entry) => entry.id === 'target');
    expect(target).toMatchObject({
      portraitMediaId: 'portrait', portraitUrl: initial.media[0].dataUrl, branchId: 'branch-target',
      secondaryBranchIds: ['branch-shared', 'branch-source'],
    });
    expect(stored.media).toMatchObject([
      { ...initial.media[1], personIds: ['target', 'child'], updatedAt: expect.any(String) },
      { ...initial.media[0], personIds: ['target'], updatedAt: expect.any(String) },
    ]);
    expect(stored.stories).toMatchObject([
      { ...initial.stories[0], personIds: ['target', 'child'], updatedAt: expect.any(String) },
    ]);
    expect(stored.settings.rootPersonId).toBe('target');
    expect(stored.branches.filter((branch) => branch.founderId === 'target').map((branch) => branch.id))
      .toEqual(['branch-shared', 'branch-source']);
  });

  it('keeps both media links when the target already has a different portrait', async () => {
    const initial = linkedSnapshot();
    const portrait = {
      ...initial.media[0], id: 'target-portrait', dataUrl: 'data:image/png;base64,AQ==', personIds: ['target'],
    };
    const currentTarget = initial.people.find((entry) => entry.id === 'target')!;
    currentTarget.portraitMediaId = portrait.id;
    currentTarget.portraitUrl = portrait.dataUrl;
    initial.media.push(portrait);
    await replaceEntireDatabase(initial);

    await mergePersonRecords('target', 'source');

    const stored = await businessData();
    expect(stored.people.find((entry) => entry.id === 'target'))
      .toMatchObject({ portraitMediaId: portrait.id, portraitUrl: portrait.dataUrl });
    expect(stored.media.find((item) => item.id === 'portrait')).toMatchObject({ personIds: ['target'] });
  });

  it('keeps multiple unions, parent/child links and metadata when equivalent edges coalesce', async () => {
    await replaceEntireDatabase(linkedSnapshot());

    await mergePersonRecords('target', 'source');

    const stored = await businessData();
    expect(stored.unions).toMatchObject([
      { id: 'marriage-1', partnerIds: ['partner-a', 'target'], marriageOrder: 1, notes: 'Hôn phối mẫu thứ nhất' },
      { id: 'marriage-2', partnerIds: ['target', 'partner-b'], marriageOrder: 2, status: 'widowed' },
      { id: 'one-partner', partnerIds: ['target'], status: 'unknown' },
    ]);
    expect(stored.relationships).toMatchObject([
      { id: 'ancestor', parentId: 'grandparent', childId: 'parent' },
      { id: 'from-parent', parentId: 'parent', childId: 'target' },
      { id: 'from-step-parent', parentId: 'target', childId: 'stepchild', lineageType: 'step', unionId: 'marriage-2' },
      { id: 'other-parent', parentId: 'partner-a', childId: 'child', unionId: 'marriage-1' },
      {
        id: 'z-target-edge', parentId: 'target', childId: 'child', lineageType: 'biological',
        unionId: 'marriage-1', birthOrder: 1, notes: 'Đích\n\nNguồn',
      },
    ]);
  });

  it.each([
    ['an indirect ancestry cycle', [relationship('a', 'target', 'middle'), relationship('b', 'middle', 'source')]],
    ['an indirect ancestry cycle in reverse', [relationship('a', 'source', 'middle'), relationship('b', 'middle', 'target')]],
    ['a direct self-relationship', [relationship('a', 'source', 'target')]],
    ['a legacy cycle involving the source', [relationship('a', 'source', 'middle'), relationship('b', 'middle', 'source')]],
    ['conflicting lineage metadata', [
      relationship('a', 'target', 'middle'),
      relationship('b', 'source', 'middle', { lineageType: 'adoptive' }),
    ]],
  ])('rejects %s and leaves all records intact', async (scenario, relationships) => {
    await replaceEntireDatabase(snapshot({
      people: [person('target'), person('source'), person('middle')],
      lifeEvents: [lifeEvent('event', 'source')],
      relationships,
    }));
    const before = await businessData();

    const message = scenario === 'conflicting lineage metadata' ? /mâu thuẫn/ : /vòng lặp|chính mình/;
    await expect(mergePersonRecords('target', 'source')).rejects.toThrow(message);

    expect(await businessData()).toEqual(before);
  });

  it('rejects a self-union and preserves its history', async () => {
    await replaceEntireDatabase(snapshot({ unions: [union('same', ['target', 'source'], { notes: 'Lịch sử mẫu' })] }));
    const before = await businessData();

    await expect(mergePersonRecords('target', 'source')).rejects.toThrow(/hôn phối/);

    expect(await businessData()).toEqual(before);
  });

  it('rejects a missing source or target and rejects the same ID twice', async () => {
    await replaceEntireDatabase(snapshot());
    const before = await businessData();

    await expect(mergePersonRecords('target', 'missing')).rejects.toThrow(/không còn tồn tại/);
    await expect(mergePersonRecords('missing', 'source')).rejects.toThrow(/không còn tồn tại/);
    await expect(mergePersonRecords('target', 'target')).rejects.toThrow(/hai hồ sơ khác nhau/);

    expect(await businessData()).toEqual(before);
  });

  it('does not copy a missing portrait link to the retained record', async () => {
    await replaceEntireDatabase(snapshot({
      people: [person('target'), person('source', { portraitMediaId: 'missing-media' })],
    }));
    const before = await businessData();

    await expect(mergePersonRecords('target', 'source')).rejects.toThrow(/ảnh chân dung/);

    expect(await businessData()).toEqual(before);
  });

  it('does not copy a missing branch link to the retained record', async () => {
    await replaceEntireDatabase(snapshot({
      people: [person('target'), person('source', { secondaryBranchIds: ['missing-branch'] })],
    }));
    const before = await businessData();

    await expect(mergePersonRecords('target', 'source')).rejects.toThrow(/chi họ/);

    expect(await businessData()).toEqual(before);
  });

  it('does not copy a missing union link to a retained duplicate edge', async () => {
    await replaceEntireDatabase(snapshot({
      people: [person('target'), person('source'), person('child')],
      relationships: [
        relationship('target-child', 'target', 'child'),
        relationship('source-child', 'source', 'child', { unionId: 'missing-union' }),
      ],
    }));
    const before = await businessData();

    await expect(mergePersonRecords('target', 'source')).rejects.toThrow(/hôn phối không tồn tại/);

    expect(await businessData()).toEqual(before);
  });

  it('preserves unrelated legacy links without subjecting them to merge deduplication', async () => {
    const relationships = [
      relationship('old-link', 'unrelated', 'missing'),
      relationship('old-duplicate', 'unrelated', 'missing', { lineageType: 'adoptive' }),
    ];
    await replaceEntireDatabase(snapshot({ relationships }));
    const before = await businessData();

    await mergePersonRecords('target', 'source');

    expect((await businessData()).relationships).toEqual(before.relationships);
  });

  it('reads current records and newly added links when a competing write was queued first', async () => {
    await replaceEntireDatabase(snapshot({ people: [person('target', { occupation: 'Cũ' }), person('source')] }));
    const displayed = await businessData();
    const db = await getDatabase();
    const edit = db.transaction(['people', 'lifeEvents'], 'readwrite');
    const writes = Promise.all([
      edit.objectStore('people').put(person('target', { occupation: 'Mới' })),
      edit.objectStore('people').put(person('source', { residence: 'Nơi ở mới' })),
      edit.objectStore('lifeEvents').put(lifeEvent('new', 'source')),
      edit.done,
    ]);

    await Promise.all([writes, mergePersonRecords('target', 'source')]);

    expect(displayed.people.find((entry) => entry.id === 'target')?.occupation).toBe('Cũ');
    const stored = await businessData();
    expect(stored.people).toMatchObject([{ id: 'target', occupation: 'Mới', residence: 'Nơi ở mới' }]);
    expect(stored.lifeEvents).toMatchObject([{ id: 'new', personId: 'target' }]);
  });

  it('serializes two concurrent merges of the same source without reintroducing deleted data', async () => {
    await replaceEntireDatabase(snapshot({
      people: [person('target'), person('source'), person('other')],
      lifeEvents: [lifeEvent('event', 'source')],
    }));

    const outcomes = await Promise.allSettled([
      mergePersonRecords('target', 'source'), mergePersonRecords('other', 'source'),
    ]);

    expect(outcomes.map((outcome) => outcome.status)).toEqual(['fulfilled', 'rejected']);
    const stored = await businessData();
    expect(stored.people.map((entry) => entry.id)).toEqual(['other', 'target']);
    expect(stored.lifeEvents).toMatchObject([{ id: 'event', personId: 'target' }]);
  });

  it.each(['people', 'lifeEvents', 'settings'])('rolls back a failed request in %s, then allows retry', async (storeName) => {
    await replaceEntireDatabase(linkedSnapshot());
    const before = await businessData();
    const put = IDBObjectStore.prototype.put;
    const fault = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value, key) {
      // Adding an existing primary key produces a real asynchronous IndexedDB request error.
      return this.name === storeName ? this.add(value, key) : put.call(this, value, key);
    });
    try {
      await expect(mergePersonRecords('target', 'source')).rejects.toMatchObject({ name: 'ConstraintError' });
    } finally {
      fault.mockRestore();
    }

    expect(await businessData()).toEqual(before);
    await mergePersonRecords('target', 'source');
    const stored = await businessData();
    expect(stored.people.some((entry) => entry.id === 'source')).toBe(false);
    expect(stored.lifeEvents).toMatchObject([{ id: 'event', personId: 'target' }]);
  });

  it('rolls back prior writes if source deletion throws synchronously', async () => {
    await replaceEntireDatabase(linkedSnapshot());
    const before = await businessData();
    const remove = IDBObjectStore.prototype.delete;
    const fault = vi.spyOn(IDBObjectStore.prototype, 'delete').mockImplementation(function (this: IDBObjectStore, key) {
      if (this.name === 'people' && key === 'source') throw new Error('Injected delete failure');
      return remove.call(this, key);
    });
    try {
      await expect(mergePersonRecords('target', 'source')).rejects.toThrow('Injected delete failure');
    } finally {
      fault.mockRestore();
    }

    expect(await businessData()).toEqual(before);
  });

  it('restores the source when the transaction aborts after the delete request succeeds', async () => {
    await replaceEntireDatabase(linkedSnapshot());
    const before = await businessData();
    const remove = IDBObjectStore.prototype.delete;
    const fault = vi.spyOn(IDBObjectStore.prototype, 'delete').mockImplementation(function (this: IDBObjectStore, key) {
      const request = remove.call(this, key);
      if (this.name === 'people' && key === 'source') {
        request.addEventListener('success', () => this.transaction.abort());
      }
      return request;
    });
    try {
      await expect(mergePersonRecords('target', 'source')).rejects.toMatchObject({ name: 'AbortError' });
    } finally {
      fault.mockRestore();
    }

    expect(await businessData()).toEqual(before);
  });

  it('keeps the normal delete cascade behavior independent from merge', async () => {
    await replaceEntireDatabase(linkedSnapshot());

    await deletePersonSafely('source');

    const stored = await businessData();
    expect(stored.lifeEvents).toEqual([]);
    expect(stored.people.some((entry) => entry.id === 'source')).toBe(false);
    expect(stored.relationships.map((entry) => entry.id)).toEqual(['ancestor', 'other-parent', 'z-target-edge']);
    expect(stored.unions).toMatchObject([
      { id: 'marriage-1', partnerIds: ['partner-a'] },
      { id: 'marriage-2', partnerIds: ['partner-b'] },
    ]);
    expect(stored.media.find((item) => item.id === 'keepsake')?.personIds).toEqual(['target', 'child']);
    expect(stored.stories[0].personIds).toEqual(['target', 'child']);
    expect(stored.settings.rootPersonId).toBeUndefined();
    expect(stored.branches.every((branch) => branch.founderId !== 'source')).toBe(true);
  });
});
