import 'fake-indexeddb/auto';
import { expect, it, vi } from 'vitest';
import {
  deleteBranchRecord,
  getDatabase,
  loadFullSnapshot,
  restoreDatabaseSnapshot,
} from '../database/db';
import type { FamilyBranch, GenealogyDatabaseSnapshot, Person } from '../models/genealogy';
import { validateImportSnapshot } from '../services/importValidationService';
import { parseAndValidateJsonBackup, serializeDatabaseBackup } from '../services/jsonBackupService';

const timestamp = '2026-01-01T00:00:00.000Z';
const timestamps = { createdAt: timestamp, updatedAt: timestamp };

function branch(id: string, parentBranchId?: string): FamilyBranch {
  return { id, name: `Chi tổng hợp ${id}`, code: id, parentBranchId, subBranches: [], ...timestamps };
}

function person(id: string, branchId: string, secondaryBranchIds: string[]): Person {
  return {
    id, fullName: `Thành viên tổng hợp ${id}`, gender: 'unknown', isLiving: true,
    branchId, secondaryBranchIds, ...timestamps,
  };
}

function fixture(): GenealogyDatabaseSnapshot {
  return {
    app: 'Gia Phả Việt – Cội Nguồn', schemaVersion: 1, exportedAt: timestamp,
    settings: {
      id: 'default', clanName: 'Dữ liệu tổng hợp', clanMotto: '', ancestralHallLocation: '',
      rootPersonId: 'a', schemaVersion: 1, updatedAt: timestamp,
    },
    branches: [
      branch('a-delete'),
      branch('b-child', 'a-delete'),
      branch('c-grandchild', 'b-child'),
      branch('d-unrelated'),
    ],
    people: [
      { ...person('a', 'a-delete', ['d-unrelated']), subBranch: 'Phái mẫu', portraitMediaId: 'media-linked' },
      person('b', 'd-unrelated', ['a-delete', 'c-grandchild']),
      person('c', 'd-unrelated', ['b-child']),
    ],
    media: [
      {
        id: 'media-linked', title: 'Ảnh tổng hợp', dataUrl: 'data:image/png;base64,AA==', mimeType: 'image/png',
        category: 'portrait', branchId: 'a-delete', personIds: ['a', 'b'], ...timestamps,
      },
      {
        id: 'media-other', title: 'Kỷ vật khác', dataUrl: 'data:text/plain;base64,QQ==', mimeType: 'text/plain',
        category: 'document', branchId: 'd-unrelated', personIds: [], ...timestamps,
      },
    ],
    stories: [
      {
        id: 'story-linked', title: 'Nhật ký tổng hợp', content: 'Kỷ niệm', personIds: ['b'],
        mediaIds: ['media-linked'], branchId: 'a-delete', ...timestamps,
      },
      {
        id: 'story-other', title: 'Nhật ký khác', content: 'Tư liệu gốc', personIds: ['c'],
        mediaIds: ['media-other'], branchId: 'd-unrelated', ...timestamps,
      },
    ],
    relationships: [{
      id: 'parent-child', parentId: 'a', childId: 'b', lineageType: 'biological', ...timestamps,
    }],
    unions: [],
    lifeEvents: [{
      id: 'life-event', personId: 'b', title: 'Mốc tổng hợp', type: 'other', ...timestamps,
    }],
  };
}

async function storedData() {
  const { exportedAt, ...stored } = await loadFullSnapshot();
  return stored;
}

it('detaches every reference to the deleted branch and keeps the v1 backup valid (GP-REV-005)', async () => {
  const original = fixture();
  await restoreDatabaseSnapshot(original);

  await deleteBranchRecord('a-delete');

  const stored = await loadFullSnapshot();
  expect(validateImportSnapshot(stored).errors).toEqual([]);
  expect(stored.branches.map((entry) => entry.id)).toEqual(['b-child', 'c-grandchild', 'd-unrelated']);
  expect(stored.branches[0].parentBranchId).toBeUndefined();
  expect(stored.branches.slice(1)).toEqual(original.branches.slice(2));
  expect(stored.people[0]).toMatchObject({
    id: 'a', branchId: undefined, secondaryBranchIds: ['d-unrelated'],
    subBranch: 'Phái mẫu', portraitMediaId: 'media-linked',
  });
  expect(stored.people[1]).toMatchObject({ id: 'b', branchId: 'd-unrelated', secondaryBranchIds: ['c-grandchild'] });
  expect(stored.people[2]).toEqual(original.people[2]);
  expect(stored.media).toEqual([
    { ...original.media[0], branchId: undefined, updatedAt: expect.any(String) },
    original.media[1],
  ]);
  expect(stored.stories).toEqual([
    { ...original.stories[0], branchId: undefined, updatedAt: expect.any(String) },
    original.stories[1],
  ]);
  expect(stored.relationships).toEqual(original.relationships);
  expect(stored.lifeEvents).toEqual(original.lifeEvents);
  expect(stored.settings).toEqual(original.settings);

  const parsed = parseAndValidateJsonBackup(await serializeDatabaseBackup(stored));
  expect(parsed.errors).toEqual([]);
  expect(parsed.snapshot).toBeDefined();
  await restoreDatabaseSnapshot(parsed.snapshot!);

  const restored = await loadFullSnapshot();
  expect(restored.branches).toEqual(stored.branches);
  expect(restored.stories).toEqual(stored.stories);
  expect(restored.media).toEqual(stored.media);
});

it('detaches links added by a transaction queued before deletion', async () => {
  const original = fixture();
  await restoreDatabaseSnapshot(original);
  const db = await getDatabase();
  const queuedStory = db.add('stories', { ...original.stories[0], id: 'new-story' });

  await Promise.all([queuedStory, deleteBranchRecord('a-delete')]);

  const stored = await loadFullSnapshot();
  expect(stored.stories.find((story) => story.id === 'new-story')?.branchId).toBeUndefined();
  expect(stored.stories).toHaveLength(3);
  expect(validateImportSnapshot(stored).errors).toEqual([]);
});

it.each(['synchronous', 'request'] as const)('rolls back a %s failure during branch detachment', async (mode) => {
  await restoreDatabaseSnapshot(fixture());
  const before = await storedData();
  const put = IDBObjectStore.prototype.put;
  const spy = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value, key) {
    if (this.name !== 'stories') return put.call(this, value, key);
    if (mode === 'synchronous') throw new Error('Injected branch detach failure');
    return this.add(value, key);
  });
  try {
    const deletion = deleteBranchRecord('a-delete');
    if (mode === 'synchronous') {
      await expect(deletion).rejects.toThrow('Injected branch detach failure');
    } else {
      await expect(deletion).rejects.toMatchObject({ name: 'ConstraintError' });
    }
  } finally {
    spy.mockRestore();
  }

  expect(await storedData()).toEqual(before);
  await deleteBranchRecord('a-delete');
  expect(validateImportSnapshot(await loadFullSnapshot()).errors).toEqual([]);
});
