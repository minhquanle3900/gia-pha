import 'fake-indexeddb/auto';
import { expect, it, vi } from 'vitest';
import {
  deleteMediaRecord,
  loadFullSnapshot,
  mergeDatabaseSnapshot,
  mergePersonRecords,
  replaceEntireDatabase,
  restoreDatabaseSnapshot,
  savePersonRecord,
} from '../database/db';
import type { GenealogyDatabaseSnapshot, Media, Person } from '../models/genealogy';
import { parseAndValidateJsonBackup, serializeDatabaseBackup, validateAndPreviewJsonBackup } from '../services/jsonBackupService';

const timestamp = '2026-01-01T00:00:00.000Z';
const timestamps = { createdAt: timestamp, updatedAt: timestamp };
const image = 'data:image/png;base64,AA==';

function person(id: string, fields: Partial<Person> = {}): Person {
  return { id, fullName: `Thành viên mẫu ${id}`, gender: 'unknown', isLiving: true, ...timestamps, ...fields };
}

function portrait(id: string): Media {
  return {
    id, title: 'Ảnh tổng hợp', category: 'portrait', mimeType: 'image/png',
    dataUrl: image, personIds: ['a'], ...timestamps,
  };
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

it('protects a portrait shared by a profile and a family story (GP-CLOUD-007)', async () => {
  await replaceEntireDatabase(snapshot({
    people: [person('a', { portraitMediaId: 'photo' })],
    media: [portrait('photo')],
    stories: [{
      id: 'story', title: 'Nhật ký mẫu', content: '', personIds: [], mediaIds: ['photo'], ...timestamps,
    }],
  }));
  const before = await storedData();

  await expect(deleteMediaRecord('photo')).rejects.toThrow(/đang được sử dụng/);
  expect(await storedData()).toEqual(before);
});

it('merges an app backup of its own ID-only v1 portrait without conflict (GP-REV-004)', async () => {
  await replaceEntireDatabase(snapshot({
    people: [person('a', { portraitMediaId: 'photo' })],
    media: [portrait('photo')],
  }));
  const stored = await loadFullSnapshot();
  const backup = await serializeDatabaseBackup(stored);

  const preview = validateAndPreviewJsonBackup(backup, stored, 'merge');

  expect(preview.errors).toEqual([]);
  expect(preview.snapshot?.people[0]).toEqual(stored.people[0]);
});

it('saves a new person and the chosen image together, then round-trips replacement and remove', async () => {
  await replaceEntireDatabase(snapshot());
  const beforeSave = await storedData();
  const chosen = { dataUrl: image, mimeType: 'image/png' };
  expect(await storedData()).toEqual(beforeSave);

  const saved = await savePersonRecord(person('a'), chosen);
  const first = (await storedData()).media[0];
  expect(saved.portraitMediaId).toBe(first.id);
  expect(saved.portraitUrl).toBe(first.dataUrl);
  expect(first.personIds).toEqual(['a']);

  const nextImage = 'data:image/png;base64,AQ==';
  const changed = await savePersonRecord(saved, { ...chosen, dataUrl: nextImage });
  expect(changed.portraitMediaId).not.toBe(first.id);
  expect(changed.portraitUrl).toBe(nextImage);
  expect((await storedData()).media).toContainEqual(first);

  const database = await loadFullSnapshot();
  const preview = validateAndPreviewJsonBackup(await serializeDatabaseBackup(database), database, 'merge');
  expect(preview.errors).toEqual([]);
  await expect(mergeDatabaseSnapshot(preview.snapshot!)).resolves.toMatchObject({ addedPeople: 0, addedMedia: 0 });
  await restoreDatabaseSnapshot(preview.snapshot!);
  expect((await storedData()).people[0]).toEqual(changed);

  const removed = await savePersonRecord(changed, null);
  expect(removed.portraitMediaId).toBeUndefined();
  expect(removed.portraitUrl).toBeUndefined();
  expect((await storedData()).media).toHaveLength(2);
});

it('preserves a legacy ID-only portrait through unrelated edits and local backup', async () => {
  const idOnly = person('a', { portraitMediaId: 'photo' });
  await replaceEntireDatabase(snapshot({ people: [idOnly], media: [portrait('photo')] }));

  const edited = await savePersonRecord({ ...idOnly, fullName: 'Mẫu đã đổi', portraitUrl: image });
  expect(edited.portraitMediaId).toBe('photo');
  expect(edited.portraitUrl).toBeUndefined();

  const current = await loadFullSnapshot();
  const preview = validateAndPreviewJsonBackup(await serializeDatabaseBackup(current), current, 'merge');
  expect(preview.errors).toEqual([]);
  await expect(mergeDatabaseSnapshot(preview.snapshot!)).resolves.toMatchObject({ addedPeople: 0 });
});

it('preserves remote v1 fields and does not fetch remote content during backup', async () => {
  const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('No network in fixture'));
  const remote = 'https://example.invalid/synthetic.png';
  const current = snapshot({
    people: [person('a', { portraitUrl: remote, portraitMediaId: 'photo' })],
    media: [{ ...portrait('photo'), dataUrl: remote }],
  });
  try {
    const raw = await serializeDatabaseBackup(current);
    const preview = validateAndPreviewJsonBackup(raw, current, 'merge');
    expect(preview.errors).toEqual([]);
    expect(preview.warnings.join(' ')).toContain('nguồn ảnh ngoài');
    expect(preview.snapshot?.people[0].portraitUrl).toBe(remote);
    expect(preview.snapshot?.media[0].dataUrl).toBe(remote);
    expect(fetchSpy).not.toHaveBeenCalled();
  } finally {
    fetchSpy.mockRestore();
  }
});

it('still rejects a genuinely changed portrait field under the same record ID', async () => {
  const current = snapshot({
    people: [person('a', { portraitMediaId: 'photo', portraitUrl: image })],
    media: [portrait('photo')],
  });
  const incoming = { ...current, people: [{ ...current.people[0], portraitUrl: 'data:image/png;base64,AQ==' }] };
  await replaceEntireDatabase(current);
  const before = await storedData();

  await expect(mergeDatabaseSnapshot(incoming)).rejects.toThrow(/trùng ID/);
  expect(await storedData()).toEqual(before);
});

it('guards references from a second person and legacy URL-only profiles without discarding the previous image', async () => {
  await replaceEntireDatabase(snapshot({
    people: [
      person('a', { portraitMediaId: 'photo', portraitUrl: image }),
      person('b', { portraitUrl: image }),
    ],
    media: [portrait('photo')],
  }));

  const saved = await savePersonRecord(person('a'), { dataUrl: 'data:image/png;base64,AQ==', mimeType: 'image/png' });
  const afterSave = await storedData();
  expect(saved.portraitMediaId).not.toBe('photo');
  expect(afterSave.people.find(({ id }) => id === 'b')?.portraitUrl).toBe(image);
  await expect(deleteMediaRecord('photo')).rejects.toThrow(/đang được sử dụng/);
  expect(await storedData()).toEqual(afterSave);

  await savePersonRecord(person('b'), null);
  await deleteMediaRecord('photo');
  expect((await storedData()).media.map(({ id }) => id)).toEqual([saved.portraitMediaId]);
});

it('rolls back an image inserted earlier in the save when writing the person fails, then retries', async () => {
  const original = person('a', { portraitMediaId: 'photo', portraitUrl: image });
  await replaceEntireDatabase(snapshot({ people: [original], media: [portrait('photo')] }));
  const before = await storedData();
  const nextImage = { dataUrl: 'data:image/png;base64,AQ==', mimeType: 'image/png' };

  const put = IDBObjectStore.prototype.put;
  const failure = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function (this: IDBObjectStore, value, key) {
    if (this.name === 'people') throw new Error('Synthetic profile write failure');
    return put.call(this, value, key);
  });
  try {
    await expect(savePersonRecord(original, nextImage)).rejects.toThrow('Synthetic profile write failure');
  } finally {
    failure.mockRestore();
  }

  expect(await storedData()).toEqual(before);
  const saved = await savePersonRecord(original, nextImage);
  expect((await storedData()).people[0].portraitMediaId).toBe(saved.portraitMediaId);
  expect((await storedData()).media).toHaveLength(2);
});

it('round-trips the backup after merging a profile with a portrait, story and event', async () => {
  await replaceEntireDatabase(snapshot({
    people: [person('a'), person('b')],
    lifeEvents: [{ id: 'event', personId: 'a', title: 'Mốc tổng hợp', type: 'other', ...timestamps }],
    stories: [{ id: 'story', title: 'Nhật ký tổng hợp', content: '', personIds: ['a'], mediaIds: [], ...timestamps }],
  }));
  const source = await savePersonRecord(person('a'), { dataUrl: image, mimeType: 'image/png' });
  await mergePersonRecords('b', 'a');
  const persisted = await loadFullSnapshot();
  const backup = await serializeDatabaseBackup(persisted);
  const preview = validateAndPreviewJsonBackup(backup, persisted, 'merge');
  expect(preview.errors).toEqual([]);
  await expect(mergeDatabaseSnapshot(preview.snapshot!)).resolves.toEqual({
    addedPeople: 0, addedRelationships: 0, addedMedia: 0,
  });

  const restored = parseAndValidateJsonBackup(backup);
  expect(restored.errors).toEqual([]);
  await restoreDatabaseSnapshot(restored.snapshot!);
  const stored = await storedData();
  expect(stored.people).toEqual(persisted.people);
  expect(stored.people[0]).toMatchObject({ id: 'b', portraitMediaId: source.portraitMediaId });
  expect(stored.media).toEqual(persisted.media);
  expect(stored.media[0].personIds).toEqual(['b']);
  expect(stored.lifeEvents[0].personId).toBe('b');
  expect(stored.stories[0].personIds).toEqual(['b']);
});
