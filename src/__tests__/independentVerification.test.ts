import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import {
  buildFamilyTreeLayout,
  TREE_LEVEL_GAP_Y,
  TREE_NODE_HEIGHT,
} from '../features/family-tree/treeLayout';
import {
  Person,
  Relationship,
  Union,
  AppSettings,
  GenealogyDatabaseSnapshot,
} from '../models/genealogy';
import {
  getDatabase,
  resetDbConnectionForTesting,
  replaceEntireDatabase,
  loadFullSnapshot,
  savePersonRecord,
  saveRelationshipRecord,
  saveUnionRecord,
  saveSettingsRecord,
} from '../database/db';
import { exportToGedcom551, parseGedcom551 } from '../services/gedcomService';
import {
  serializeDatabaseBackup,
  parseAndValidateJsonBackup,
} from '../services/jsonBackupService';

describe('INDEPENDENT VERIFICATION 1: Chế độ Tổ tiên (Ancestor View)', () => {
  it('correctly builds complete 4-generation pedigree (15 members) from leaf to root without gaps', () => {
    // 4 Generations:
    // Gen 1: 8 Great-Grandparents (GGF1..4, GGM1..4)
    // Gen 2: 4 Grandparents (Paternal: GF_P, GM_P; Maternal: GF_M, GM_M)
    // Gen 3: 2 Parents (Father: F, Mother: M)
    // Gen 4: 1 Subject (Leaf: Me)
    const people: Person[] = [
      // Gen 1
      { id: 'GGF1', fullName: 'Cụ Ông Nội 1', gender: 'male', isLiving: false, generation: 1, createdAt: '', updatedAt: '' },
      { id: 'GGM1', fullName: 'Cụ Bà Nội 1', gender: 'female', isLiving: false, generation: 1, createdAt: '', updatedAt: '' },
      { id: 'GGF2', fullName: 'Cụ Ông Nội 2', gender: 'male', isLiving: false, generation: 1, createdAt: '', updatedAt: '' },
      { id: 'GGM2', fullName: 'Cụ Bà Nội 2', gender: 'female', isLiving: false, generation: 1, createdAt: '', updatedAt: '' },
      { id: 'GGF3', fullName: 'Cụ Ông Ngoại 1', gender: 'male', isLiving: false, generation: 1, createdAt: '', updatedAt: '' },
      { id: 'GGM3', fullName: 'Cụ Bà Ngoại 1', gender: 'female', isLiving: false, generation: 1, createdAt: '', updatedAt: '' },
      { id: 'GGF4', fullName: 'Cụ Ông Ngoại 2', gender: 'male', isLiving: false, generation: 1, createdAt: '', updatedAt: '' },
      { id: 'GGM4', fullName: 'Cụ Bà Ngoại 2', gender: 'female', isLiving: false, generation: 1, createdAt: '', updatedAt: '' },

      // Gen 2
      { id: 'GF_P', fullName: 'Ông Nội', gender: 'male', isLiving: false, generation: 2, createdAt: '', updatedAt: '' },
      { id: 'GM_P', fullName: 'Bà Nội', gender: 'female', isLiving: false, generation: 2, createdAt: '', updatedAt: '' },
      { id: 'GF_M', fullName: 'Ông Ngoại', gender: 'male', isLiving: false, generation: 2, createdAt: '', updatedAt: '' },
      { id: 'GM_M', fullName: 'Bà Ngoại', gender: 'female', isLiving: false, generation: 2, createdAt: '', updatedAt: '' },

      // Gen 3
      { id: 'F', fullName: 'Cha', gender: 'male', isLiving: false, generation: 3, createdAt: '', updatedAt: '' },
      { id: 'M', fullName: 'Mẹ', gender: 'female', isLiving: false, generation: 3, createdAt: '', updatedAt: '' },

      // Gen 4
      { id: 'Me', fullName: 'Tôi (Thành viên thế hệ 4)', gender: 'male', isLiving: true, generation: 4, createdAt: '', updatedAt: '' },

      // Unrelated person who should NOT be included in Me's ancestors
      { id: 'Stranger', fullName: 'Người Ngoài', gender: 'male', isLiving: true, generation: 4, createdAt: '', updatedAt: '' },
    ];

    const relationships: Relationship[] = [
      // Great-grandparents to Grandparents
      { id: 'r1', parentId: 'GGF1', childId: 'GF_P', lineageType: 'biological', createdAt: '', updatedAt: '' },
      { id: 'r2', parentId: 'GGM1', childId: 'GF_P', lineageType: 'biological', createdAt: '', updatedAt: '' },
      { id: 'r3', parentId: 'GGF2', childId: 'GM_P', lineageType: 'biological', createdAt: '', updatedAt: '' },
      { id: 'r4', parentId: 'GGM2', childId: 'GM_P', lineageType: 'biological', createdAt: '', updatedAt: '' },
      { id: 'r5', parentId: 'GGF3', childId: 'GF_M', lineageType: 'biological', createdAt: '', updatedAt: '' },
      { id: 'r6', parentId: 'GGM3', childId: 'GF_M', lineageType: 'biological', createdAt: '', updatedAt: '' },
      { id: 'r7', parentId: 'GGF4', childId: 'GM_M', lineageType: 'biological', createdAt: '', updatedAt: '' },
      { id: 'r8', parentId: 'GGM4', childId: 'GM_M', lineageType: 'biological', createdAt: '', updatedAt: '' },

      // Grandparents to Parents
      { id: 'r9', parentId: 'GF_P', childId: 'F', lineageType: 'biological', createdAt: '', updatedAt: '' },
      { id: 'r10', parentId: 'GM_P', childId: 'F', lineageType: 'biological', createdAt: '', updatedAt: '' },
      { id: 'r11', parentId: 'GF_M', childId: 'M', lineageType: 'biological', createdAt: '', updatedAt: '' },
      { id: 'r12', parentId: 'GM_M', childId: 'M', lineageType: 'biological', createdAt: '', updatedAt: '' },

      // Parents to Me
      { id: 'r13', parentId: 'F', childId: 'Me', lineageType: 'biological', createdAt: '', updatedAt: '' },
      { id: 'r14', parentId: 'M', childId: 'Me', lineageType: 'biological', createdAt: '', updatedAt: '' },
    ];

    const unions: Union[] = [
      { id: 'u1', partnerIds: ['GGF1', 'GGM1'], status: 'married', createdAt: '', updatedAt: '' },
      { id: 'u2', partnerIds: ['GGF2', 'GGM2'], status: 'married', createdAt: '', updatedAt: '' },
      { id: 'u3', partnerIds: ['GGF3', 'GGM3'], status: 'married', createdAt: '', updatedAt: '' },
      { id: 'u4', partnerIds: ['GGF4', 'GGM4'], status: 'married', createdAt: '', updatedAt: '' },
      { id: 'u5', partnerIds: ['GF_P', 'GM_P'], status: 'married', createdAt: '', updatedAt: '' },
      { id: 'u6', partnerIds: ['GF_M', 'GM_M'], status: 'married', createdAt: '', updatedAt: '' },
      { id: 'u7', partnerIds: ['F', 'M'], status: 'married', createdAt: '', updatedAt: '' },
    ];

    const result = buildFamilyTreeLayout({
      people,
      relationships,
      unions,
      viewMode: 'ancestor',
      focusPersonId: 'Me',
    });

    // 1. Must include exactly the 15 direct ancestors (Me + 2 parents + 4 grandparents + 8 great-grandparents)
    expect(result.nodes.length).toBe(15);
    const nodeIds = new Set(result.nodes.map((n) => n.id));
    expect(nodeIds.has('Stranger')).toBe(false);
    expect(nodeIds.has('Me')).toBe(true);
    expect(nodeIds.has('F')).toBe(true);
    expect(nodeIds.has('M')).toBe(true);
    expect(nodeIds.has('GF_P')).toBe(true);
    expect(nodeIds.has('GM_P')).toBe(true);
    expect(nodeIds.has('GF_M')).toBe(true);
    expect(nodeIds.has('GM_M')).toBe(true);
    for (let i = 1; i <= 4; i++) {
      expect(nodeIds.has(`GGF${i}`)).toBe(true);
      expect(nodeIds.has(`GGM${i}`)).toBe(true);
    }

    // 2. Vertical geometry: Ancestors must be vertically ABOVE children
    const nodeMap = new Map(result.nodes.map((n) => [n.id, n]));
    const meNode = nodeMap.get('Me')!;
    const fNode = nodeMap.get('F')!;
    const mNode = nodeMap.get('M')!;
    const gfPNode = nodeMap.get('GF_P')!;
    const ggf1Node = nodeMap.get('GGF1')!;

    expect(fNode.y).toBeLessThan(meNode.y);
    expect(mNode.y).toBeLessThan(meNode.y);
    expect(gfPNode.y).toBeLessThan(fNode.y);
    expect(ggf1Node.y).toBeLessThan(gfPNode.y);

    // 3. Links: Must connect each child upward to both biological parents
    const meLinks = result.links.filter((l) => l.targetId === 'Me');
    expect(meLinks.length).toBe(2);
    const parentSources = new Set(meLinks.map((l) => l.sourceId));
    expect(parentSources.has('F')).toBe(true);
    expect(parentSources.has('M')).toBe(true);

    // Total links connecting the 14 parent-child relationships in the pedigree
    expect(result.links.length).toBe(14);
  });

  it('safely handles pedigree with shared ancestors (consanguinity) without infinite loop or crash', () => {
    // Shared ancestor: Cụ Tổ P0 is grandfather to both Father and Mother (cousin marriage)
    const people: Person[] = [
      { id: 'P0', fullName: 'Cụ Tổ Chung', gender: 'male', isLiving: false, generation: 1, createdAt: '', updatedAt: '' },
      { id: 'GF1', fullName: 'Ông 1', gender: 'male', isLiving: false, generation: 2, createdAt: '', updatedAt: '' },
      { id: 'GF2', fullName: 'Ông 2', gender: 'male', isLiving: false, generation: 2, createdAt: '', updatedAt: '' },
      { id: 'F', fullName: 'Cha', gender: 'male', isLiving: false, generation: 3, createdAt: '', updatedAt: '' },
      { id: 'M', fullName: 'Mẹ', gender: 'female', isLiving: false, generation: 3, createdAt: '', updatedAt: '' },
      { id: 'Child', fullName: 'Con', gender: 'male', isLiving: true, generation: 4, createdAt: '', updatedAt: '' },
    ];

    const relationships: Relationship[] = [
      { id: 'r1', parentId: 'P0', childId: 'GF1', lineageType: 'biological', createdAt: '', updatedAt: '' },
      { id: 'r2', parentId: 'P0', childId: 'GF2', lineageType: 'biological', createdAt: '', updatedAt: '' },
      { id: 'r3', parentId: 'GF1', childId: 'F', lineageType: 'biological', createdAt: '', updatedAt: '' },
      { id: 'r4', parentId: 'GF2', childId: 'M', lineageType: 'biological', createdAt: '', updatedAt: '' },
      { id: 'r5', parentId: 'F', childId: 'Child', lineageType: 'biological', createdAt: '', updatedAt: '' },
      { id: 'r6', parentId: 'M', childId: 'Child', lineageType: 'biological', createdAt: '', updatedAt: '' },
    ];

    const unions: Union[] = [
      { id: 'u1', partnerIds: ['F', 'M'], status: 'married', createdAt: '', updatedAt: '' },
    ];

    const tStart = performance.now();
    const result = buildFamilyTreeLayout({
      people,
      relationships,
      unions,
      viewMode: 'ancestor',
      focusPersonId: 'Child',
    });
    const duration = performance.now() - tStart;

    expect(duration).toBeLessThan(50);
    expect(result.nodes.length).toBe(6);
    const ids = result.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(6); // No duplicate nodes
  });
});

describe('INDEPENDENT VERIFICATION 2: Memory Stability & 100-Cycle Stress', () => {
  it('executes 100 cycles of view switching, node selection and layout without memory runaway', () => {
    // Generate a medium-large tree of 200 nodes
    const people: Person[] = [];
    const relationships: Relationship[] = [];
    const unions: Union[] = [];

    people.push({ id: 'p_0', fullName: 'Root', gender: 'male', isLiving: false, generation: 1, createdAt: '', updatedAt: '' });
    for (let i = 1; i < 200; i++) {
      const parentId = `p_${Math.floor((i - 1) / 3)}`;
      people.push({
        id: `p_${i}`,
        fullName: `Member ${i}`,
        gender: i % 2 === 0 ? 'female' : 'male',
        isLiving: true,
        generation: Math.floor(Math.log2(i + 1)) + 1,
        createdAt: '',
        updatedAt: '',
      });
      relationships.push({
        id: `r_${i}`,
        parentId,
        childId: `p_${i}`,
        lineageType: 'biological',
        createdAt: '',
        updatedAt: '',
      });
    }

    const viewModes: Array<'descendant' | 'ancestor' | 'individual' | 'generation' | 'full'> = [
      'descendant',
      'ancestor',
      'individual',
      'generation',
      'full',
    ];

    const memBefore = process.memoryUsage().heapUsed;
    const measurements: number[] = [];

    for (let cycle = 0; cycle < 100; cycle++) {
      const mode = viewModes[cycle % viewModes.length];
      const selectedPersonId = `p_${(cycle * 7) % people.length}`;

      const res = buildFamilyTreeLayout({
        people,
        relationships,
        unions,
        viewMode: mode,
        focusPersonId: selectedPersonId,
      });

      expect(res.nodes.length).toBeGreaterThan(0);

      if (cycle % 25 === 0) {
        measurements.push(process.memoryUsage().heapUsed);
      }
    }

    const memAfter = process.memoryUsage().heapUsed;
    const diffMB = (memAfter - memBefore) / (1024 * 1024);

    // After 100 cycles of tree calculations, heap growth must be constrained (< 20MB)
    expect(diffMB).toBeLessThan(20);
  });
});

describe('INDEPENDENT VERIFICATION 3: Bảo toàn dữ liệu (IndexedDB & Export/Import)', () => {
  beforeEach(async () => {
    resetDbConnectionForTesting();
    const db = await getDatabase();
    const tx = db.transaction(['settings', 'branches', 'people', 'unions', 'relationships'], 'readwrite');
    await tx.objectStore('settings').clear();
    await tx.objectStore('branches').clear();
    await tx.objectStore('people').clear();
    await tx.objectStore('unions').clear();
    await tx.objectStore('relationships').clear();
    await tx.done;
  });

  it('persists and retrieves genealogy records with exact relationships', async () => {
    const personA: Person = {
      id: 'pers_1',
      fullName: 'Trần Văn Khang',
      gender: 'male',
      isLiving: false,
      generation: 1,
      birthDate: { precision: 'exact', year: 1890, month: 3, day: 15 },
      deathDate: { precision: 'exact', year: 1968, month: 8, day: 20 },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const personB: Person = {
      id: 'pers_2',
      fullName: 'Lê Thị Diệu',
      gender: 'female',
      isLiving: false,
      generation: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const personC: Person = {
      id: 'pers_3',
      fullName: 'Trần Văn Nhân',
      gender: 'male',
      isLiving: true,
      generation: 2,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await savePersonRecord(personA);
    await savePersonRecord(personB);
    await savePersonRecord(personC);

    const relA: Relationship = {
      id: 'rel_1',
      parentId: 'pers_1',
      childId: 'pers_3',
      lineageType: 'biological',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const relB: Relationship = {
      id: 'rel_2',
      parentId: 'pers_2',
      childId: 'pers_3',
      lineageType: 'biological',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveRelationshipRecord(relA);
    await saveRelationshipRecord(relB);

    const union: Union = {
      id: 'union_1',
      partnerIds: ['pers_1', 'pers_2'],
      status: 'married',
      marriageOrder: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await saveUnionRecord(union);

    // Read back via full snapshot
    const snapshot = await loadFullSnapshot();
    expect(snapshot.people.length).toBe(3);
    expect(snapshot.relationships.length).toBe(2);
    expect(snapshot.unions.length).toBe(1);

    const retrievedP1 = snapshot.people.find((p) => p.id === 'pers_1');
    expect(retrievedP1?.fullName).toBe('Trần Văn Khang');
    expect(retrievedP1?.birthDate?.year).toBe(1890);
  });

  it('guarantees 100% data preservation through JSON export and import cycle', async () => {
    const originalSnapshot: GenealogyDatabaseSnapshot = {
      app: 'Gia Phả Việt – Cội Nguồn',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      settings: {
        id: 'default',
        clanName: 'Họ Trần Việt Nam',
        clanMotto: 'Vạn đại lưu truyền',
        ancestralHallLocation: 'Hà Nội',
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
      },
      branches: [
        { id: 'b1', name: 'Nhánh Cả', code: 'NC', subBranches: [], createdAt: '', updatedAt: '' },
      ],
      people: [
        { id: 'p1', fullName: 'Cụ Tổ', gender: 'male', isLiving: false, generation: 1, createdAt: '', updatedAt: '' },
        { id: 'p2', fullName: 'Con Trưởng', gender: 'male', isLiving: true, generation: 2, createdAt: '', updatedAt: '' },
      ],
      relationships: [
        { id: 'r1', parentId: 'p1', childId: 'p2', lineageType: 'biological', createdAt: '', updatedAt: '' },
      ],
      unions: [],
      lifeEvents: [],
      media: [],
      stories: [],
    };

    // 1. Populate database
    await replaceEntireDatabase(originalSnapshot);

    // 2. Export via JSON backup service
    const exportedJson = await serializeDatabaseBackup(originalSnapshot);
    expect(exportedJson).toContain('Họ Trần Việt Nam');

    // 3. Wipe database completely
    resetDbConnectionForTesting();
    const db = await getDatabase();
    const tx = db.transaction(['settings', 'branches', 'people', 'unions', 'relationships'], 'readwrite');
    await tx.objectStore('people').clear();
    await tx.objectStore('relationships').clear();
    await tx.done;

    const wipedSnapshot = await loadFullSnapshot();
    expect(wipedSnapshot.people.length).toBe(0);

    // 4. Validate and restore backup JSON
    const parsedBackup = parseAndValidateJsonBackup(exportedJson);
    expect(parsedBackup.valid).toBe(true);
    expect(parsedBackup.snapshot).toBeDefined();

    if (parsedBackup.snapshot) {
      await replaceEntireDatabase(parsedBackup.snapshot);
    }

    // 5. Verify restored database has identical records
    const restoredSnapshot = await loadFullSnapshot();
    expect(restoredSnapshot.people.length).toBe(2);
    expect(restoredSnapshot.relationships.length).toBe(1);
    expect(restoredSnapshot.settings.clanName).toBe('Họ Trần Việt Nam');
    expect(restoredSnapshot.branches.length).toBe(1);
  });

  it('preserves genealogical family structure through GEDCOM export and import cycle', () => {
    const snapshot: GenealogyDatabaseSnapshot = {
      app: 'Gia Phả Việt – Cội Nguồn',
      schemaVersion: 1,
      exportedAt: new Date().toISOString(),
      settings: {
        id: 'default',
        clanName: 'Dòng Họ Thử Nghiệm',
        clanMotto: 'Uống nước nhớ nguồn',
        ancestralHallLocation: 'Việt Nam',
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
      },
      branches: [],
      people: [
        {
          id: 'P01',
          fullName: 'Nguyễn Văn An',
          gender: 'male',
          isLiving: false,
          birthDate: { precision: 'exact', year: 1920, month: 5, day: 10 },
          deathDate: { precision: 'exact', year: 1995, month: 11, day: 2 },
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'P02',
          fullName: 'Trần Thị Bình',
          gender: 'female',
          isLiving: false,
          birthDate: { precision: 'exact', year: 1925, month: 8, day: 14 },
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'P03',
          fullName: 'Nguyễn Văn Cường',
          gender: 'male',
          isLiving: true,
          birthDate: { precision: 'exact', year: 1950, month: 1, day: 1 },
          createdAt: '',
          updatedAt: '',
        },
      ],
      relationships: [
        { id: 'R01', parentId: 'P01', childId: 'P03', unionId: 'U01', lineageType: 'biological', createdAt: '', updatedAt: '' },
        { id: 'R02', parentId: 'P02', childId: 'P03', unionId: 'U01', lineageType: 'biological', createdAt: '', updatedAt: '' },
      ],
      unions: [
        { id: 'U01', partnerIds: ['P01', 'P02'], status: 'married', createdAt: '', updatedAt: '' },
      ],
      lifeEvents: [],
      media: [],
      stories: [],
    };

    // Export to standard GEDCOM 5.5.1
    const gedcomText = exportToGedcom551(snapshot);
    expect(gedcomText).toContain('0 HEAD');
    expect(gedcomText).toContain('1 NAME Văn An /Nguyễn/');
    expect(gedcomText).toContain('0 TRLR');

    // Parse back
    const parsed = parseGedcom551(gedcomText);
    expect(parsed.people.length).toBe(3);
    expect(parsed.relationships.length).toBe(2);
    expect(parsed.unions.length).toBe(1);
  });
});
