import { describe, expect, it } from 'vitest';
import { buildFamilyTreeLayout } from '../features/family-tree/treeLayout';
import { Person, Relationship, Union } from '../models/genealogy';

describe('Family Tree UX & Layout Performance Verification', () => {
  it('correctly calculates unique descendantCount without double counting', () => {
    // Family graph:
    // P1 -> C1, C2
    // C1 -> G1
    // C2 -> G1 (cousin marriage offspring)
    const people: Person[] = [
      { id: 'P1', fullName: 'Cụ P1', gender: 'male', isLiving: false, createdAt: '', updatedAt: '' },
      { id: 'C1', fullName: 'Ông C1', gender: 'male', isLiving: false, createdAt: '', updatedAt: '' },
      { id: 'C2', fullName: 'Bà C2', gender: 'female', isLiving: false, createdAt: '', updatedAt: '' },
      { id: 'G1', fullName: 'Cháu G1', gender: 'male', isLiving: true, createdAt: '', updatedAt: '' },
    ];

    const relationships: Relationship[] = [
      { id: 'r1', parentId: 'P1', childId: 'C1', lineageType: 'biological', createdAt: '', updatedAt: '' },
      { id: 'r2', parentId: 'P1', childId: 'C2', lineageType: 'biological', createdAt: '', updatedAt: '' },
      { id: 'r3', parentId: 'C1', childId: 'G1', lineageType: 'biological', createdAt: '', updatedAt: '' },
      { id: 'r4', parentId: 'C2', childId: 'G1', lineageType: 'biological', createdAt: '', updatedAt: '' },
    ];

    const unions: Union[] = [
      { id: 'u1', partnerIds: ['C1', 'C2'], status: 'married', createdAt: '', updatedAt: '' },
    ];

    const result = buildFamilyTreeLayout({
      people,
      relationships,
      unions,
      viewMode: 'descendant',
      rootPersonId: 'P1',
    });

    const p1Node = result.nodes.find((n) => n.id === 'P1');
    const c1Node = result.nodes.find((n) => n.id === 'C1');
    const g1Node = result.nodes.find((n) => n.id === 'G1');

    expect(p1Node).toBeDefined();
    // Unique descendants of P1 are C1, C2, and G1 -> exactly 3 individuals
    expect(p1Node?.descendantCount).toBe(3);

    // C1 has 1 descendant: G1
    expect(c1Node?.descendantCount).toBe(1);

    // Leaf node G1 has 0 descendants
    expect(g1Node?.descendantCount).toBe(0);
  });

  it('renders multi-root forest in full view without duplicate nodes', () => {
    // Two completely independent roots (e.g. husband family and wife family)
    const people: Person[] = [
      { id: 'R1', fullName: 'Họ Nội R1', gender: 'male', isLiving: false, generation: 1, createdAt: '', updatedAt: '' },
      { id: 'R2', fullName: 'Họ Ngoại R2', gender: 'male', isLiving: false, generation: 1, createdAt: '', updatedAt: '' },
      { id: 'C1', fullName: 'Con Nội C1', gender: 'male', isLiving: false, generation: 2, createdAt: '', updatedAt: '' },
      { id: 'C2', fullName: 'Con Ngoại C2', gender: 'female', isLiving: false, generation: 2, createdAt: '', updatedAt: '' },
      { id: 'M1', fullName: 'Cháu M1', gender: 'male', isLiving: true, generation: 3, createdAt: '', updatedAt: '' },
    ];

    const relationships: Relationship[] = [
      { id: 'r1', parentId: 'R1', childId: 'C1', lineageType: 'biological', createdAt: '', updatedAt: '' },
      { id: 'r2', parentId: 'R2', childId: 'C2', lineageType: 'biological', createdAt: '', updatedAt: '' },
      { id: 'r3', parentId: 'C1', childId: 'M1', lineageType: 'biological', createdAt: '', updatedAt: '' },
      { id: 'r4', parentId: 'C2', childId: 'M1', lineageType: 'biological', createdAt: '', updatedAt: '' },
    ];

    const unions: Union[] = [
      { id: 'u1', partnerIds: ['C1', 'C2'], status: 'married', createdAt: '', updatedAt: '' },
    ];

    const result = buildFamilyTreeLayout({
      people,
      relationships,
      unions,
      viewMode: 'full',
    });

    // In full view, every person should appear once (5 unique nodes, no duplicates)
    expect(result.nodes.length).toBe(5);
    const ids = result.nodes.map((n) => n.id);
    expect(new Set(ids).size).toBe(5);

    // Coordinates must be finite numbers
    for (const n of result.nodes) {
      expect(Number.isFinite(n.x)).toBe(true);
      expect(Number.isFinite(n.y)).toBe(true);
      expect(Number.isFinite(n.width)).toBe(true);
      expect(Number.isFinite(n.height)).toBe(true);
    }
  });

  it('computes 500-member tree layout in under 100ms', () => {
    const people: Person[] = [];
    const relationships: Relationship[] = [];
    const unions: Union[] = [];

    // Synthetic tree
    people.push({ id: 'root', fullName: 'Root', gender: 'male', isLiving: false, generation: 1, createdAt: '', updatedAt: '' });
    let idCounter = 1;
    let parents = ['root'];

    while (people.length < 500) {
      const nextParents: string[] = [];
      for (const p of parents) {
        if (people.length >= 500) break;
        for (let c = 0; c < 2; c++) {
          if (people.length >= 500) break;
          const childId = `c_${idCounter++}`;
          people.push({ id: childId, fullName: `Person ${idCounter}`, gender: 'male', isLiving: true, createdAt: '', updatedAt: '' });
          relationships.push({ id: `rel_${idCounter}`, parentId: p, childId, lineageType: 'biological', createdAt: '', updatedAt: '' });
          nextParents.push(childId);
        }
      }
      parents = nextParents;
      if (parents.length === 0) break;
    }

    const tStart = performance.now();
    const result = buildFamilyTreeLayout({
      people,
      relationships,
      unions,
      viewMode: 'descendant',
      rootPersonId: 'root',
    });
    const duration = performance.now() - tStart;

    expect(duration).toBeLessThan(100);
    expect(result.nodes.length).toBeGreaterThan(0);
    expect(result.bounds.width).toBeGreaterThan(0);
  });
});
