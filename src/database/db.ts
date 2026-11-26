import { DBSchema, IDBPDatabase, IDBPTransaction, openDB, StoreNames } from 'idb';
import {
  AppSettings,
  FamilyBranch,
  FamilyStory,
  GenealogyDatabaseSnapshot,
  LifeEvent,
  Media,
  Person,
  PortraitDraft,
  Relationship,
  Union,
} from '../models/genealogy';
import { executeMergeRecords } from '../services/duplicateMergeService';
import { isValidFlexibleDate, validateImportSnapshot } from '../services/importValidationService';
import { planSnapshotMerge, SNAPSHOT_DATA_STORES } from '../services/snapshotMergeService';
import { validateSpouseUnion } from '../services/validationService';
import { generateId } from '../utils/dateUtils';
import { createSeedSnapshot } from './seedData';

export const DB_NAME = 'gia-pha-viet-coi-nguon-db';
export const DB_VERSION = 1;
export const SCHEMA_VERSION = 1;

interface GenealogyDBSchema extends DBSchema {
  settings: {
    key: string;
    value: AppSettings;
  };
  branches: {
    key: string;
    value: FamilyBranch;
  };
  people: {
    key: string;
    value: Person;
    indexes: {
      'by-branch': string;
      'by-generation': number;
    };
  };
  unions: {
    key: string;
    value: Union;
  };
  relationships: {
    key: string;
    value: Relationship;
    indexes: {
      'by-parent': string;
      'by-child': string;
      'by-union': string;
    };
  };
  lifeEvents: {
    key: string;
    value: LifeEvent;
    indexes: {
      'by-person': string;
    };
  };
  media: {
    key: string;
    value: Media;
  };
  stories: {
    key: string;
    value: FamilyStory;
  };
}

let dbPromise: Promise<IDBPDatabase<GenealogyDBSchema>> | null = null;

export function getDatabase(): Promise<IDBPDatabase<GenealogyDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<GenealogyDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('branches')) {
          db.createObjectStore('branches', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('people')) {
          const peopleStore = db.createObjectStore('people', { keyPath: 'id' });
          peopleStore.createIndex('by-branch', 'branchId');
          peopleStore.createIndex('by-generation', 'generation');
        }
        if (!db.objectStoreNames.contains('unions')) {
          db.createObjectStore('unions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('relationships')) {
          const relStore = db.createObjectStore('relationships', { keyPath: 'id' });
          relStore.createIndex('by-parent', 'parentId');
          relStore.createIndex('by-child', 'childId');
          relStore.createIndex('by-union', 'unionId');
        }
        if (!db.objectStoreNames.contains('lifeEvents')) {
          const eventStore = db.createObjectStore('lifeEvents', { keyPath: 'id' });
          eventStore.createIndex('by-person', 'personId');
        }
        if (!db.objectStoreNames.contains('media')) {
          db.createObjectStore('media', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('stories')) {
          db.createObjectStore('stories', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

export function resetDbConnectionForTesting(): void {
  dbPromise = null;
}

export async function initializeDatabaseIfEmpty(): Promise<GenealogyDatabaseSnapshot> {
  const db = await getDatabase();
  const existingSettings = await db.get('settings', 'default');
  const existingPeopleCount = await db.count('people');

  if (!existingSettings && existingPeopleCount === 0) {
    const seed = createSeedSnapshot();
    await replaceEntireDatabase(seed);
    return seed;
  }

  return loadFullSnapshot();
}

const SNAPSHOT_STORES = ['settings', ...SNAPSHOT_DATA_STORES] as const;
type SnapshotTransaction<Mode extends 'readonly' | 'readwrite'> =
  IDBPTransaction<GenealogyDBSchema, typeof SNAPSHOT_STORES, Mode>;

async function readSnapshot<Mode extends 'readonly' | 'readwrite'>(
  tx: SnapshotTransaction<Mode>
): Promise<GenealogyDatabaseSnapshot> {
  const [settings, branches, people, unions, relationships, lifeEvents, media, stories] =
    await Promise.all([
      tx.objectStore('settings').get('default'),
      tx.objectStore('branches').getAll(),
      tx.objectStore('people').getAll(),
      tx.objectStore('unions').getAll(),
      tx.objectStore('relationships').getAll(),
      tx.objectStore('lifeEvents').getAll(),
      tx.objectStore('media').getAll(),
      tx.objectStore('stories').getAll(),
    ]);

  const fallbackSettings: AppSettings = settings ?? {
    id: 'default',
    clanName: 'Gia Phả Gia Đình Việt',
    clanMotto: 'Uống nước nhớ nguồn',
    ancestralHallLocation: 'Việt Nam',
    schemaVersion: SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  };

  return {
    app: 'Gia Phả Việt – Cội Nguồn',
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    settings: fallbackSettings,
    branches,
    people,
    unions,
    relationships,
    lifeEvents,
    media,
    stories,
  };
}

export async function loadFullSnapshot(): Promise<GenealogyDatabaseSnapshot> {
  const db = await getDatabase();
  const tx = db.transaction(SNAPSHOT_STORES, 'readonly');
  const [snapshot] = await Promise.all([readSnapshot(tx), tx.done]);
  return snapshot;
}

async function writeDatabaseTransaction<Stores extends readonly StoreNames<GenealogyDBSchema>[], T>(
  stores: Stores,
  write: (tx: IDBPTransaction<GenealogyDBSchema, Stores, 'readwrite'>) => Promise<T>
): Promise<T> {
  const db = await getDatabase();
  const tx = db.transaction(stores, 'readwrite');
  const done = tx.done;
  void done.catch(() => {});

  try {
    const result = await write(tx);
    await done;
    return result;
  } catch (error) {
    try {
      tx.abort();
    } catch {
      // A failed request may have already aborted the transaction.
    }
    await done.catch(() => {});
    throw error;
  }
}

// Low-level replacement for trusted demo data and test setup.
export async function replaceEntireDatabase(snapshot: GenealogyDatabaseSnapshot): Promise<void> {
  await writeDatabaseTransaction(SNAPSHOT_STORES, async (tx) => {
    for (const store of SNAPSHOT_STORES) await tx.objectStore(store).clear();

    await tx.objectStore('settings').put({
      ...snapshot.settings,
      id: 'default',
      schemaVersion: SCHEMA_VERSION,
    });
    for (const store of SNAPSHOT_DATA_STORES) {
      for (const record of snapshot[store]) await tx.objectStore(store).put(record);
    }
  });
}

export async function restoreDatabaseSnapshot(snapshot: GenealogyDatabaseSnapshot): Promise<void> {
  const candidate = structuredClone(snapshot);
  const { errors } = validateImportSnapshot(candidate);
  if (errors.length > 0) throw new Error(errors.join(' · '));
  await replaceEntireDatabase(candidate);
}

export interface SnapshotMergeStats {
  addedPeople: number;
  addedRelationships: number;
  addedMedia: number;
}

export async function mergeDatabaseSnapshot(snapshot: GenealogyDatabaseSnapshot): Promise<SnapshotMergeStats> {
  const incoming = structuredClone(snapshot);
  return writeDatabaseTransaction(SNAPSHOT_STORES, async (tx) => {
    const existing = await readSnapshot(tx);
    const plan = planSnapshotMerge(existing, incoming);
    if (!plan.additions) throw new Error(plan.errors.join(' · '));

    const { additions } = plan;
    for (const store of SNAPSHOT_DATA_STORES) {
      for (const record of additions[store]) await tx.objectStore(store).add(record);
    }

    return {
      addedPeople: additions.people.length,
      addedRelationships: additions.relationships.length,
      addedMedia: additions.media.length,
    };
  });
}

export async function resetToDemoDataset(): Promise<GenealogyDatabaseSnapshot> {
  const seed = createSeedSnapshot();
  await replaceEntireDatabase(seed);
  return seed;
}

export async function savePersonRecord(person: Person, portrait?: PortraitDraft | null): Promise<Person> {
  return writeDatabaseTransaction(['people', 'media'] as const, async (tx) => {
    const people = tx.objectStore('people');
    const media = tx.objectStore('media');
    const current = await people.get(person.id);
    const updatedAt = new Date().toISOString();
    const saved = {
      ...person,
      portraitUrl: current ? current.portraitUrl : person.portraitUrl,
      portraitMediaId: current ? current.portraitMediaId : person.portraitMediaId,
      updatedAt,
    };

    if (portrait === null) {
      // Keep the previous image as an artifact and leave other references intact.
      saved.portraitUrl = undefined;
      saved.portraitMediaId = undefined;
    } else if (portrait) {
      if (!/^image\//i.test(portrait.mimeType) || !/^data:image\/[^;,]+(?:;[^,]*)?,.+/is.test(portrait.dataUrl)) {
        throw new Error('Ảnh chân dung chưa được xử lý thành công.');
      }
      const id = generateId('media');
      await media.add({
        id,
        title: `Chân dung - ${person.fullName}`,
        category: 'portrait',
        dataUrl: portrait.dataUrl,
        mimeType: portrait.mimeType,
        personIds: [person.id],
        createdAt: updatedAt,
        updatedAt,
      });
      saved.portraitMediaId = id;
      saved.portraitUrl = portrait.dataUrl;
    } else if (!current && saved.portraitMediaId && !await media.get(saved.portraitMediaId)) {
      throw new Error('Không tìm thấy ảnh chân dung được tham chiếu.');
    }

    await people.put(saved);
    return saved;
  });
}

export async function mergePersonRecords(targetId: string, sourceId: string): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(
    ['people', 'unions', 'relationships', 'lifeEvents', 'media', 'stories', 'branches', 'settings'],
    'readwrite'
  );

  const done = tx.done;
  // A failed request can reject both its own promise and the transaction.
  void done.catch(() => {});

  try {
    const peopleStore = tx.objectStore('people');
    const [targetPerson, sourcePerson] = await Promise.all([peopleStore.get(targetId), peopleStore.get(sourceId)]);
    if (!targetPerson || !sourcePerson) {
      throw new Error('Một hồ sơ đã thay đổi hoặc không còn tồn tại. Hãy tải lại danh sách rồi thử lại.');
    }

    const [relationships, unions, lifeEvents, media, stories, branches, settings] = await Promise.all([
      tx.objectStore('relationships').getAll(),
      tx.objectStore('unions').getAll(),
      tx.objectStore('lifeEvents').index('by-person').getAll(sourceId),
      tx.objectStore('media').getAll(),
      tx.objectStore('stories').getAll(),
      tx.objectStore('branches').getAll(),
      tx.objectStore('settings').getAll(),
    ]);
    const plan = executeMergeRecords({ targetPerson, sourcePerson, relationships, unions, lifeEvents, media });
    const { mergedPerson } = plan;

    // Unrelated legacy references are outside the merge. Check the references
    // this plan would newly attach to retained records.
    const currentBranchIds = new Set([targetPerson.branchId, ...(targetPerson.secondaryBranchIds ?? [])]);
    const branchIds = new Set(branches.map((branch) => branch.id));
    for (const id of [mergedPerson.branchId, ...(mergedPerson.secondaryBranchIds ?? [])]) {
      if (id && !currentBranchIds.has(id) && !branchIds.has(id)) {
        throw new Error('Không thể sáp nhập vì hồ sơ nguồn tham chiếu đến chi họ không tồn tại.');
      }
    }
    if (
      mergedPerson.portraitMediaId && mergedPerson.portraitMediaId !== targetPerson.portraitMediaId &&
      !media.some((item) => item.id === mergedPerson.portraitMediaId)
    ) {
      throw new Error('Không thể sáp nhập vì ảnh chân dung được tham chiếu không tồn tại.');
    }
    const originalRelationships = new Map(relationships.map((rel) => [rel.id, rel]));
    const unionIds = new Set(unions.map((union) => union.id));
    for (const rel of plan.updatedRelationships) {
      if (rel.unionId && rel.unionId !== originalRelationships.get(rel.id)?.unionId && !unionIds.has(rel.unionId)) {
        throw new Error('Không thể sáp nhập vì liên kết cha mẹ/con cái tham chiếu đến hôn phối không tồn tại.');
      }
    }

    await peopleStore.put(mergedPerson);
    for (const rel of plan.updatedRelationships) await tx.objectStore('relationships').put(rel);
    for (const id of plan.deletedRelationshipIds) await tx.objectStore('relationships').delete(id);
    for (const union of plan.updatedUnions) await tx.objectStore('unions').put(union);
    for (const event of plan.updatedLifeEvents) await tx.objectStore('lifeEvents').put(event);
    for (const item of plan.updatedMedia) await tx.objectStore('media').put(item);

    const { updatedAt } = mergedPerson;
    for (const story of stories) {
      if (!story.personIds.includes(sourceId)) continue;
      await tx.objectStore('stories').put({
        ...story,
        personIds: [...new Set(story.personIds.map((id) => id === sourceId ? targetId : id))],
        updatedAt,
      });
    }
    for (const branch of branches) {
      if (branch.founderId !== sourceId) continue;
      await tx.objectStore('branches').put({ ...branch, founderId: targetId, updatedAt });
    }
    for (const setting of settings) {
      if (setting.rootPersonId !== sourceId) continue;
      await tx.objectStore('settings').put({ ...setting, rootPersonId: targetId, updatedAt });
    }
    await peopleStore.delete(plan.deletedPersonId);
    await done;
  } catch (error) {
    // Synchronous exceptions do not abort IndexedDB automatically.
    try {
      tx.abort();
    } catch {
      // An asynchronous request failure may have already aborted it.
    }
    await done.catch(() => {});
    throw error;
  }
}

export async function deletePersonSafely(personId: string): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(
    ['people', 'unions', 'relationships', 'lifeEvents', 'media', 'stories', 'branches', 'settings'],
    'readwrite'
  );

  await tx.objectStore('people').delete(personId);

  const allRels = await tx.objectStore('relationships').getAll();
  for (const rel of allRels) {
    if (rel.parentId === personId || rel.childId === personId) {
      await tx.objectStore('relationships').delete(rel.id);
    }
  }

  const allUnions = await tx.objectStore('unions').getAll();
  const remainingRels = allRels.filter((r) => r.parentId !== personId && r.childId !== personId);
  for (const union of allUnions) {
    if (union.partnerIds.includes(personId)) {
      const nextPartners = union.partnerIds.filter((id) => id !== personId);
      const hasLinkedChildren = remainingRels.some((r) => r.unionId === union.id);
      if (nextPartners.length === 0 && !hasLinkedChildren) {
        await tx.objectStore('unions').delete(union.id);
      } else {
        await tx.objectStore('unions').put({
          ...union,
          partnerIds: nextPartners,
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  const events = await tx.objectStore('lifeEvents').index('by-person').getAll(personId);
  for (const ev of events) {
    await tx.objectStore('lifeEvents').delete(ev.id);
  }

  const allMedia = await tx.objectStore('media').getAll();
  for (const m of allMedia) {
    if (m.personIds.includes(personId)) {
      await tx.objectStore('media').put({
        ...m,
        personIds: m.personIds.filter((id) => id !== personId),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  const allStories = await tx.objectStore('stories').getAll();
  for (const s of allStories) {
    if (s.personIds.includes(personId)) {
      await tx.objectStore('stories').put({
        ...s,
        personIds: s.personIds.filter((id) => id !== personId),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  const allBranches = await tx.objectStore('branches').getAll();
  for (const b of allBranches) {
    if (b.founderId === personId) {
      await tx.objectStore('branches').put({
        ...b,
        founderId: undefined,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  const settings = await tx.objectStore('settings').get('default');
  if (settings && settings.rootPersonId === personId) {
    await tx.objectStore('settings').put({
      ...settings,
      rootPersonId: undefined,
      updatedAt: new Date().toISOString(),
    });
  }

  await tx.done;
}

export async function saveUnionRecord(union: Union): Promise<void> {
  const candidate = structuredClone(union);
  await writeDatabaseTransaction(['people', 'unions', 'relationships'] as const, async (tx) => {
    const [first, second] = candidate.partnerIds;
    if (!candidate.id.trim() || candidate.partnerIds.length < 1 || candidate.partnerIds.length > 2) {
      throw new Error('Bản ghi hôn phối phải có mã định danh và một hoặc hai thành viên.');
    }
    if (candidate.marriageDate !== undefined && !isValidFlexibleDate(candidate.marriageDate)) {
      throw new Error('Niên đại hôn phối không hợp lệ. Hãy kiểm tra ngày, tháng và năm.');
    }

    const peopleStore = tx.objectStore('people');
    const unionStore = tx.objectStore('unions');
    const relationshipStore = tx.objectStore('relationships');
    const [unions, partners, relationships] = await Promise.all([
      unionStore.getAll(),
      Promise.all(candidate.partnerIds.map((id) => peopleStore.get(id))),
      relationshipStore.getAll(),
    ]);

    if (partners.some((partner) => !partner)) {
      throw new Error('Không tìm thấy hồ sơ thành viên của hôn phối.');
    }
    if (candidate.partnerIds.length === 2) {
      const validation = validateSpouseUnion({
        personAId: first,
        personBId: second,
        people: partners.filter((partner): partner is Person => partner !== undefined),
        unions,
        relationships,
        editingUnionId: candidate.id,
        marriageDate: candidate.marriageDate,
      });
      if (!validation.valid) throw new Error(validation.errors.join(' '));
    }

    const previous = unions.find((record) => record.id === candidate.id);
    if (previous && relationships.some((link) =>
      link.unionId === candidate.id &&
      previous.partnerIds.includes(link.parentId) &&
      !candidate.partnerIds.includes(link.parentId)
    )) {
      throw new Error('Không thể bỏ thành viên khỏi hôn phối khi còn liên kết cha/mẹ – con trong hôn phối này.');
    }

    await unionStore.put({ ...candidate, updatedAt: new Date().toISOString() });
  });
}

export async function deleteUnionRecord(unionId: string): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(['unions', 'relationships'], 'readwrite');
  await tx.objectStore('unions').delete(unionId);
  const rels = await tx.objectStore('relationships').index('by-union').getAll(unionId);
  for (const r of rels) {
    await tx.objectStore('relationships').put({
      ...r,
      unionId: undefined,
      updatedAt: new Date().toISOString(),
    });
  }
  await tx.done;
}

export async function saveRelationshipRecord(rel: Relationship): Promise<void> {
  const db = await getDatabase();
  await db.put('relationships', { ...rel, updatedAt: new Date().toISOString() });
}

export async function deleteRelationshipRecord(relId: string): Promise<void> {
  const db = await getDatabase();
  await db.delete('relationships', relId);
}

export async function saveLifeEventRecord(event: LifeEvent): Promise<void> {
  const db = await getDatabase();
  await db.put('lifeEvents', { ...event, updatedAt: new Date().toISOString() });
}

export async function deleteLifeEventRecord(eventId: string): Promise<void> {
  const db = await getDatabase();
  await db.delete('lifeEvents', eventId);
}

export async function saveMediaRecord(mediaItem: Media): Promise<void> {
  const db = await getDatabase();
  await db.put('media', { ...mediaItem, updatedAt: new Date().toISOString() });
}

export async function deleteMediaRecord(mediaId: string): Promise<void> {
  await writeDatabaseTransaction(['media', 'people', 'stories'] as const, async (tx) => {
    const media = tx.objectStore('media');
    const item = await media.get(mediaId);
    if (!item) return;

    const [people, stories] = await Promise.all([
      tx.objectStore('people').getAll(),
      tx.objectStore('stories').getAll(),
    ]);
    const usedAsPortrait = people.some((person) =>
      person.portraitMediaId === mediaId || (person.portraitUrl && person.portraitUrl === item.dataUrl)
    );
    if (usedAsPortrait || stories.some((story) => story.mediaIds.includes(mediaId))) {
      throw new Error('Ảnh hoặc kỷ vật đang được sử dụng trong hồ sơ hoặc nhật ký. Hãy gỡ liên kết trước khi xóa.');
    }

    await media.delete(mediaId);
  });
}

export async function saveStoryRecord(story: FamilyStory): Promise<void> {
  const db = await getDatabase();
  await db.put('stories', { ...story, updatedAt: new Date().toISOString() });
}

export async function deleteStoryRecord(storyId: string): Promise<void> {
  const db = await getDatabase();
  await db.delete('stories', storyId);
}

export async function saveBranchRecord(branch: FamilyBranch): Promise<void> {
  const db = await getDatabase();
  await db.put('branches', { ...branch, updatedAt: new Date().toISOString() });
}

export async function deleteBranchRecord(branchId: string): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(['branches', 'people', 'media', 'stories'], 'readwrite');
  const done = tx.done;
  void done.catch(() => {});

  try {
    const branchStore = tx.objectStore('branches');
    const peopleStore = tx.objectStore('people');
    const mediaStore = tx.objectStore('media');
    const storyStore = tx.objectStore('stories');
    const [branches, people, media, stories] = await Promise.all([
      branchStore.getAll(),
      peopleStore.getAll(),
      mediaStore.getAll(),
      storyStore.getAll(),
    ]);
    const updatedAt = new Date().toISOString();

    for (const person of people) {
      if (person.branchId !== branchId && !person.secondaryBranchIds?.includes(branchId)) continue;
      await peopleStore.put({
        ...person,
        branchId: person.branchId === branchId ? undefined : person.branchId,
        secondaryBranchIds: person.secondaryBranchIds?.filter((id) => id !== branchId),
        updatedAt,
      });
    }
    for (const branch of branches) {
      if (branch.id !== branchId && branch.parentBranchId === branchId) {
        await branchStore.put({ ...branch, parentBranchId: undefined, updatedAt });
      }
    }
    for (const item of media) {
      if (item.branchId === branchId) await mediaStore.put({ ...item, branchId: undefined, updatedAt });
    }
    for (const story of stories) {
      if (story.branchId === branchId) await storyStore.put({ ...story, branchId: undefined, updatedAt });
    }

    await branchStore.delete(branchId);
    await done;
  } catch (error) {
    try {
      tx.abort();
    } catch {
      // A failed request may have already aborted the transaction.
    }
    await done.catch(() => {});
    throw error;
  }
}

export async function saveSettingsRecord(settings: AppSettings): Promise<void> {
  const db = await getDatabase();
  await db.put('settings', {
    ...settings,
    id: 'default',
    updatedAt: new Date().toISOString(),
  });
}
