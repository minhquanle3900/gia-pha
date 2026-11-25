import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  deleteBranchRecord,
  deleteLifeEventRecord,
  deleteMediaRecord,
  deletePersonSafely,
  deleteRelationshipRecord,
  deleteStoryRecord,
  deleteUnionRecord,
  initializeDatabaseIfEmpty,
  loadFullSnapshot,
  mergeDatabaseSnapshot,
  mergePersonRecords,
  restoreDatabaseSnapshot,
  type SnapshotMergeStats,
  resetToDemoDataset,
  saveBranchRecord,
  saveLifeEventRecord,
  saveMediaRecord,
  savePersonRecord,
  saveRelationshipRecord,
  saveSettingsRecord,
  saveStoryRecord,
  saveUnionRecord,
} from '../database/db';
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

export interface ParentInfo {
  relationship: Relationship;
  parent: Person;
}

export interface ChildInfo {
  relationship: Relationship;
  child: Person;
}

export interface SpouseInfo {
  union: Union;
  spouse?: Person;
}

export interface GenealogyContextType {
  loading: boolean;
  error: string | null;
  snapshot: GenealogyDatabaseSnapshot | null;
  people: Person[];
  unions: Union[];
  relationships: Relationship[];
  branches: FamilyBranch[];
  media: Media[];
  stories: FamilyStory[];
  lifeEvents: LifeEvent[];
  settings: AppSettings;
  refresh: () => Promise<void>;

  // CRUD
  savePerson: (person: Person) => Promise<void>;
  deletePerson: (personId: string) => Promise<void>;
  mergePeople: (targetId: string, sourceId: string) => Promise<void>;
  saveRelationship: (rel: Relationship) => Promise<void>;
  deleteRelationship: (relId: string) => Promise<void>;
  saveUnion: (union: Union) => Promise<void>;
  deleteUnion: (unionId: string) => Promise<void>;
  saveMedia: (media: Media) => Promise<void>;
  deleteMedia: (mediaId: string) => Promise<void>;
  saveStory: (story: FamilyStory) => Promise<void>;
  deleteStory: (storyId: string) => Promise<void>;
  saveBranch: (branch: FamilyBranch) => Promise<void>;
  deleteBranch: (branchId: string) => Promise<void>;
  saveLifeEvent: (event: LifeEvent) => Promise<void>;
  deleteLifeEvent: (eventId: string) => Promise<void>;
  saveSettings: (settings: AppSettings) => Promise<void>;

  // Backup & Restore
  resetToDemo: () => Promise<void>;
  importSnapshot: (
    snapshot: GenealogyDatabaseSnapshot,
    mode: 'replace' | 'merge'
  ) => Promise<SnapshotMergeStats | void>;

  // Graph Traversal Helpers
  getPersonById: (id: string) => Person | undefined;
  getBranchById: (id: string) => FamilyBranch | undefined;
  getParents: (childId: string) => ParentInfo[];
  getChildren: (parentId: string) => ChildInfo[];
  getSpouses: (personId: string) => SpouseInfo[];
  getSiblings: (personId: string) => Person[];
}

const DEFAULT_SETTINGS: AppSettings = {
  id: 'default',
  clanName: 'Dòng họ Việt Nam',
  clanMotto: 'Uống nước nhớ nguồn',
  ancestralHallLocation: 'Việt Nam',
  schemaVersion: 1,
  updatedAt: new Date().toISOString(),
};

const GenealogyContext = createContext<GenealogyContextType | null>(null);

export const GenealogyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<GenealogyDatabaseSnapshot | null>(null);

  const reloadData = useCallback(async () => {
    try {
      const snap = await loadFullSnapshot();
      setSnapshot(snap);
      setError(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Lỗi khi nạp dữ liệu gia phả: ${msg}`);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        const initialSnap = await initializeDatabaseIfEmpty();
        if (mounted) {
          setSnapshot(initialSnap);
          setError(null);
        }
      } catch (err: unknown) {
        if (mounted) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(`Không thể khởi tạo cơ sở dữ liệu IndexedDB: ${msg}`);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const people = useMemo(() => snapshot?.people ?? [], [snapshot]);
  const unions = useMemo(() => snapshot?.unions ?? [], [snapshot]);
  const relationships = useMemo(() => snapshot?.relationships ?? [], [snapshot]);
  const branches = useMemo(() => snapshot?.branches ?? [], [snapshot]);
  const media = useMemo(() => snapshot?.media ?? [], [snapshot]);
  const stories = useMemo(() => snapshot?.stories ?? [], [snapshot]);
  const lifeEvents = useMemo(() => snapshot?.lifeEvents ?? [], [snapshot]);
  const settings = useMemo(() => snapshot?.settings ?? DEFAULT_SETTINGS, [snapshot]);

  // Lookup maps
  const peopleMap = useMemo(() => {
    const map = new Map<string, Person>();
    for (const p of people) map.set(p.id, p);
    return map;
  }, [people]);

  const branchesMap = useMemo(() => {
    const map = new Map<string, FamilyBranch>();
    for (const b of branches) map.set(b.id, b);
    return map;
  }, [branches]);

  const getPersonById = useCallback((id: string) => peopleMap.get(id), [peopleMap]);
  const getBranchById = useCallback((id: string) => branchesMap.get(id), [branchesMap]);

  const getParents = useCallback(
    (childId: string): ParentInfo[] => {
      const parentRels = relationships.filter((r) => r.childId === childId);
      const results: ParentInfo[] = [];
      for (const rel of parentRels) {
        const parent = peopleMap.get(rel.parentId);
        if (parent) {
          results.push({ relationship: rel, parent });
        }
      }
      return results;
    },
    [relationships, peopleMap]
  );

  const getChildren = useCallback(
    (parentId: string): ChildInfo[] => {
      const childRels = relationships.filter((r) => r.parentId === parentId);
      const results: ChildInfo[] = [];
      for (const rel of childRels) {
        const child = peopleMap.get(rel.childId);
        if (child) {
          results.push({ relationship: rel, child });
        }
      }
      // Sort children by birthOrder or birth date
      results.sort((a, b) => {
        if (a.relationship.birthOrder && b.relationship.birthOrder) {
          return a.relationship.birthOrder - b.relationship.birthOrder;
        }
        const yA = a.child.birthDate?.year ?? 9999;
        const yB = b.child.birthDate?.year ?? 9999;
        return yA - yB;
      });
      return results;
    },
    [relationships, peopleMap]
  );

  const getSpouses = useCallback(
    (personId: string): SpouseInfo[] => {
      const relevantUnions = unions.filter((u) => u.partnerIds.includes(personId));
      return relevantUnions.map((union) => {
        const spouseId = union.partnerIds.find((id) => id !== personId);
        const spouse = spouseId ? peopleMap.get(spouseId) : undefined;
        return { union, spouse };
      });
    },
    [unions, peopleMap]
  );

  const getSiblings = useCallback(
    (personId: string): Person[] => {
      const parents = getParents(personId).map((p) => p.parent.id);
      if (parents.length === 0) return [];

      const siblingIds = new Set<string>();
      for (const pId of parents) {
        const children = getChildren(pId);
        for (const c of children) {
          if (c.child.id !== personId) {
            siblingIds.add(c.child.id);
          }
        }
      }

      return Array.from(siblingIds)
        .map((id) => peopleMap.get(id))
        .filter((p): p is Person => p !== undefined);
    },
    [getParents, getChildren, peopleMap]
  );

  // Database action mutations
  const handleSavePerson = async (person: Person) => {
    await savePersonRecord(person);
    await reloadData();
  };

  const handleDeletePerson = async (personId: string) => {
    await deletePersonSafely(personId);
    await reloadData();
  };

  const handleMergePeople = async (targetId: string, sourceId: string) => {
    await mergePersonRecords(targetId, sourceId);
    await reloadData();
  };

  const handleSaveRelationship = async (rel: Relationship) => {
    await saveRelationshipRecord(rel);
    await reloadData();
  };

  const handleDeleteRelationship = async (relId: string) => {
    await deleteRelationshipRecord(relId);
    await reloadData();
  };

  const handleSaveUnion = async (union: Union) => {
    await saveUnionRecord(union);
    await reloadData();
  };

  const handleDeleteUnion = async (unionId: string) => {
    await deleteUnionRecord(unionId);
    await reloadData();
  };

  const handleSaveMedia = async (mediaItem: Media) => {
    await saveMediaRecord(mediaItem);
    await reloadData();
  };

  const handleDeleteMedia = async (mediaId: string) => {
    await deleteMediaRecord(mediaId);
    await reloadData();
  };

  const handleSaveStory = async (story: FamilyStory) => {
    await saveStoryRecord(story);
    await reloadData();
  };

  const handleDeleteStory = async (storyId: string) => {
    await deleteStoryRecord(storyId);
    await reloadData();
  };

  const handleSaveBranch = async (branch: FamilyBranch) => {
    await saveBranchRecord(branch);
    await reloadData();
  };

  const handleDeleteBranch = async (branchId: string) => {
    await deleteBranchRecord(branchId);
    await reloadData();
  };

  const handleSaveLifeEvent = async (event: LifeEvent) => {
    await saveLifeEventRecord(event);
    await reloadData();
  };

  const handleDeleteLifeEvent = async (eventId: string) => {
    await deleteLifeEventRecord(eventId);
    await reloadData();
  };

  const handleSaveSettings = async (nextSettings: AppSettings) => {
    await saveSettingsRecord(nextSettings);
    await reloadData();
  };

  const handleResetToDemo = async () => {
    const seed = await resetToDemoDataset();
    setSnapshot(seed);
  };

  const handleImportSnapshot = async (
    newSnapshot: GenealogyDatabaseSnapshot,
    mode: 'replace' | 'merge'
  ) => {
    if (mode === 'replace') {
      await restoreDatabaseSnapshot(newSnapshot);
      await reloadData();
    } else {
      const stats = await mergeDatabaseSnapshot(newSnapshot);
      await reloadData();
      return stats;
    }
  };

  const value: GenealogyContextType = {
    loading,
    error,
    snapshot,
    people,
    unions,
    relationships,
    branches,
    media,
    stories,
    lifeEvents,
    settings,
    refresh: reloadData,
    savePerson: handleSavePerson,
    deletePerson: handleDeletePerson,
    mergePeople: handleMergePeople,
    saveRelationship: handleSaveRelationship,
    deleteRelationship: handleDeleteRelationship,
    saveUnion: handleSaveUnion,
    deleteUnion: handleDeleteUnion,
    saveMedia: handleSaveMedia,
    deleteMedia: handleDeleteMedia,
    saveStory: handleSaveStory,
    deleteStory: handleDeleteStory,
    saveBranch: handleSaveBranch,
    deleteBranch: handleDeleteBranch,
    saveLifeEvent: handleSaveLifeEvent,
    deleteLifeEvent: handleDeleteLifeEvent,
    saveSettings: handleSaveSettings,
    resetToDemo: handleResetToDemo,
    importSnapshot: handleImportSnapshot,
    getPersonById,
    getBranchById,
    getParents,
    getChildren,
    getSpouses,
    getSiblings,
  };

  return <GenealogyContext.Provider value={value}>{children}</GenealogyContext.Provider>;
};

export function useGenealogy(): GenealogyContextType {
  const context = useContext(GenealogyContext);
  if (!context) {
    throw new Error('useGenealogy must be used within a GenealogyProvider');
  }
  return context;
}
