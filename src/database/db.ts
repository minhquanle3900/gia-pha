import { DBSchema, IDBPDatabase, openDB } from 'idb';
import {
  AppSettings,
  FamilyBranch,
  FamilyStory,
  GenealogyDatabaseSnapshot,
  LifeEvent,
  Media,
  Person,
  Relationship,
  Union,
} from '../models/genealogy';
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

export async function loadFullSnapshot(): Promise<GenealogyDatabaseSnapshot> {
  const db = await getDatabase();
  const [settings, branches, people, unions, relationships, lifeEvents, media, stories] =
    await Promise.all([
      db.get('settings', 'default'),
      db.getAll('branches'),
      db.getAll('people'),
      db.getAll('unions'),
      db.getAll('relationships'),
      db.getAll('lifeEvents'),
      db.getAll('media'),
      db.getAll('stories'),
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

export async function replaceEntireDatabase(snapshot: GenealogyDatabaseSnapshot): Promise<void> {
  const db = await getDatabase();
  const tx = db.transaction(
    ['settings', 'branches', 'people', 'unions', 'relationships', 'lifeEvents', 'media', 'stories'],
    'readwrite'
  );

  await Promise.all([
    tx.objectStore('settings').clear(),
    tx.objectStore('branches').clear(),
    tx.objectStore('people').clear(),
    tx.objectStore('unions').clear(),
    tx.objectStore('relationships').clear(),
    tx.objectStore('lifeEvents').clear(),
    tx.objectStore('media').clear(),
    tx.objectStore('stories').clear(),
  ]);

  await tx.objectStore('settings').put({
    ...snapshot.settings,
    id: 'default',
    schemaVersion: SCHEMA_VERSION,
  });

  for (const b of snapshot.branches) await tx.objectStore('branches').put(b);
  for (const p of snapshot.people) await tx.objectStore('people').put(p);
  for (const u of snapshot.unions) await tx.objectStore('unions').put(u);
  for (const r of snapshot.relationships) await tx.objectStore('relationships').put(r);
  for (const e of snapshot.lifeEvents) await tx.objectStore('lifeEvents').put(e);
  for (const m of snapshot.media) await tx.objectStore('media').put(m);
  for (const s of snapshot.stories) await tx.objectStore('stories').put(s);

  await tx.done;
}

export async function mergeDatabaseSnapshot(snapshot: GenealogyDatabaseSnapshot): Promise<{
  addedPeople: number;
  updatedPeople: number;
  addedRelationships: number;
  addedMedia: number;
}> {
  const db = await getDatabase();
  const tx = db.transaction(
    ['settings', 'branches', 'people', 'unions', 'relationships', 'lifeEvents', 'media', 'stories'],
    'readwrite'
  );

  let addedPeople = 0;
  let updatedPeople = 0;
  let addedRelationships = 0;
  let addedMedia = 0;

  for (const b of snapshot.branches) {
    await tx.objectStore('branches').put(b);
  }

  for (const p of snapshot.people) {
    const existing = await tx.objectStore('people').get(p.id);
    if (existing) {
      updatedPeople++;
    } else {
      addedPeople++;
    }
    await tx.objectStore('people').put(p);
  }

  for (const u of snapshot.unions) {
    await tx.objectStore('unions').put(u);
  }

  const existingRels = await tx.objectStore('relationships').getAll();
  const relPairs = new Set(existingRels.map((r) => `${r.parentId}::${r.childId}`));
  for (const r of snapshot.relationships) {
    const key = `${r.parentId}::${r.childId}`;
    if (!relPairs.has(key)) {
      addedRelationships++;
      relPairs.add(key);
      await tx.objectStore('relationships').put(r);
    }
  }

  for (const e of snapshot.lifeEvents) {
    await tx.objectStore('lifeEvents').put(e);
  }

  for (const m of snapshot.media) {
    const existingM = await tx.objectStore('media').get(m.id);
    if (!existingM) addedMedia++;
    await tx.objectStore('media').put(m);
  }

  for (const s of snapshot.stories) {
    await tx.objectStore('stories').put(s);
  }

  await tx.done;
  return { addedPeople, updatedPeople, addedRelationships, addedMedia };
}

export async function resetToDemoDataset(): Promise<GenealogyDatabaseSnapshot> {
  const seed = createSeedSnapshot();
  await replaceEntireDatabase(seed);
  return seed;
}

export async function savePersonRecord(person: Person): Promise<void> {
  const db = await getDatabase();
  await db.put('people', {
    ...person,
    updatedAt: new Date().toISOString(),
  });
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
  const db = await getDatabase();
  await db.put('unions', { ...union, updatedAt: new Date().toISOString() });
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
  const db = await getDatabase();
  const tx = db.transaction(['media', 'people', 'stories'], 'readwrite');
  await tx.objectStore('media').delete(mediaId);

  const people = await tx.objectStore('people').getAll();
  for (const p of people) {
    if (p.portraitMediaId === mediaId) {
      await tx.objectStore('people').put({
        ...p,
        portraitMediaId: undefined,
        portraitUrl: undefined,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  const stories = await tx.objectStore('stories').getAll();
  for (const s of stories) {
    if (s.mediaIds.includes(mediaId)) {
      await tx.objectStore('stories').put({
        ...s,
        mediaIds: s.mediaIds.filter((id) => id !== mediaId),
        updatedAt: new Date().toISOString(),
      });
    }
  }
  await tx.done;
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
  await tx.objectStore('branches').delete(branchId);

  const people = await tx.objectStore('people').getAll();
  for (const p of people) {
    if (p.branchId === branchId || p.secondaryBranchIds?.includes(branchId)) {
      await tx.objectStore('people').put({
        ...p,
        branchId: p.branchId === branchId ? undefined : p.branchId,
        secondaryBranchIds: p.secondaryBranchIds?.filter((id) => id !== branchId),
        updatedAt: new Date().toISOString(),
      });
    }
  }
  await tx.done;
}

export async function saveSettingsRecord(settings: AppSettings): Promise<void> {
  const db = await getDatabase();
  await db.put('settings', {
    ...settings,
    id: 'default',
    updatedAt: new Date().toISOString(),
  });
}
