import * as d3 from 'd3';
import { Person, Relationship, TreeViewMode, Union } from '../../models/genealogy';

export interface TreeNodeData {
  id: string;
  person: Person;
  x: number;
  y: number;
  width: number;
  height: number;
  generation: number;
  spouses: Person[];
  childIds: string[];
  parentIds: string[];
  isCollapsed?: boolean;
  hasChildren: boolean;
  hasParents: boolean;
  branchName?: string;
  isFocused?: boolean;
  descendantCount?: number;
}

export interface TreeLinkData {
  id: string;
  sourceId: string;
  targetId: string;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  lineageType?: string;
}

export interface TreeLayoutResult {
  nodes: TreeNodeData[];
  links: TreeLinkData[];
  bounds: { minX: number; maxX: number; minY: number; maxY: number; width: number; height: number };
}

export const TREE_NODE_WIDTH = 236;
export const TREE_NODE_HEIGHT = 96;
export const TREE_LEVEL_GAP_Y = 160;
export const TREE_SIBLING_GAP_X = 276;


/**
 * Builds layout for different tree views
 */
export function buildFamilyTreeLayout(params: {
  people: Person[];
  relationships: Relationship[];
  unions: Union[];
  viewMode: TreeViewMode;
  rootPersonId?: string;
  focusPersonId?: string;
  collapsedNodeIds?: Set<string>;
  branchFilter?: string;
  branchesMap?: Map<string, string>;
}): TreeLayoutResult {
  const {
    people,
    relationships,
    unions,
    viewMode,
    rootPersonId,
    focusPersonId,
    collapsedNodeIds = new Set<string>(),
    branchFilter,
    branchesMap = new Map(),
  } = params;

  if (people.length === 0) {
    return {
      nodes: [],
      links: [],
      bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 },
    };
  }

  const peopleMap = new Map<string, Person>();
  for (const p of people) {
    peopleMap.set(p.id, p);
  }

  // Build parent-child graph
  const parentsByChild = new Map<string, string[]>();
  const childrenByParent = new Map<string, string[]>();

  for (const rel of relationships) {
    const parents = parentsByChild.get(rel.childId) ?? [];
    parents.push(rel.parentId);
    parentsByChild.set(rel.childId, parents);

    const children = childrenByParent.get(rel.parentId) ?? [];
    children.push(rel.childId);
    childrenByParent.set(rel.parentId, children);
  }

  // Find spouses for each person
  const spousesByPerson = new Map<string, Person[]>();
  for (const u of unions) {
    if (u.partnerIds.length >= 2) {
      const [idA, idB] = u.partnerIds;
      const pA = peopleMap.get(idA);
      const pB = peopleMap.get(idB);
      if (pA && pB) {
        const listA = spousesByPerson.get(idA) ?? [];
        listA.push(pB);
        spousesByPerson.set(idA, listA);

        const listB = spousesByPerson.get(idB) ?? [];
        listB.push(pA);
        spousesByPerson.set(idB, listB);
      }
    }
  }

  // Determine starting root person
  let effectiveRootId = rootPersonId;
  if (!effectiveRootId || !peopleMap.has(effectiveRootId)) {
    // Pick person with lowest generation or someone with no parents
    const sortedByGen = [...people].sort(
      (a, b) => (a.generation ?? 99) - (b.generation ?? 99)
    );
    const noParents = sortedByGen.find((p) => (parentsByChild.get(p.id)?.length ?? 0) === 0);
    effectiveRootId = (noParents ?? sortedByGen[0]).id;
  }

  let targetFocusId = focusPersonId;
  if (!targetFocusId && viewMode === 'ancestor') {
    // For ancestor view, if no focus person specified, pick the person in the highest generation who has parents
    const withParents = [...people]
      .filter((p) => (parentsByChild.get(p.id)?.length ?? 0) > 0)
      .sort((a, b) => (b.generation ?? 0) - (a.generation ?? 0));
    if (withParents.length > 0) {
      targetFocusId = withParents[0].id;
    }
  }

  const focusId = targetFocusId || effectiveRootId;

  // Filter persons based on viewMode
  let includedPersonIds = new Set<string>();

  if (viewMode === 'branch' && branchFilter) {
    for (const p of people) {
      if (p.branchId === branchFilter || p.secondaryBranchIds?.includes(branchFilter)) {
        includedPersonIds.add(p.id);
      }
    }
    // Also include their direct ancestors/descendants to keep structure visible
    if (includedPersonIds.size === 0) {
      includedPersonIds = new Set(people.map((p) => p.id));
    }
  } else if (viewMode === 'ancestor') {
    // Trace upward from focus person
    const queue = [focusId];
    const visited = new Set<string>();
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      includedPersonIds.add(cur);
      const parents = parentsByChild.get(cur) ?? [];
      for (const p of parents) queue.push(p);
    }
  } else if (viewMode === 'descendant') {
    // Trace downward from focus or root person
    const startId = focusPersonId || effectiveRootId;
    const queue = [startId];
    const visited = new Set<string>();
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (visited.has(cur)) continue;
      visited.add(cur);
      includedPersonIds.add(cur);
      if (!collapsedNodeIds.has(cur)) {
        const children = childrenByParent.get(cur) ?? [];
        for (const c of children) queue.push(c);
      }
    }
  } else if (viewMode === 'individual') {
    // Focus person + immediate parents + spouses + children + siblings
    includedPersonIds.add(focusId);
    const parents = parentsByChild.get(focusId) ?? [];
    for (const p of parents) includedPersonIds.add(p);
    const children = childrenByParent.get(focusId) ?? [];
    for (const c of children) includedPersonIds.add(c);
    const spouses = spousesByPerson.get(focusId) ?? [];
    for (const s of spouses) includedPersonIds.add(s.id);
    for (const p of parents) {
      const sibs = childrenByParent.get(p) ?? [];
      for (const s of sibs) includedPersonIds.add(s);
    }
  } else if (viewMode === 'generation') {
    // Group all people by their generation
    includedPersonIds = new Set(people.map((p) => p.id));
  } else {
    // Full view
    includedPersonIds = new Set(people.map((p) => p.id));
  }

  // Construct hierarchy for D3 tree
  interface HierarchyItem {
    id: string;
    person: Person;
    children?: HierarchyItem[];
  }

  // Builds downward hierarchy (person -> children)
  const buildHierarchy = (personId: string, visited: Set<string>): HierarchyItem | null => {
    if (visited.has(personId)) return null;
    visited.add(personId);
    const person = peopleMap.get(personId);
    if (!person) return null;

    if (collapsedNodeIds.has(personId)) {
      return { id: personId, person, children: [] };
    }

    const rawChildren = childrenByParent.get(personId) ?? [];
    const validChildren = rawChildren
      .filter((cId) => includedPersonIds.has(cId) && !visited.has(cId))
      .map((cId) => buildHierarchy(cId, visited))
      .filter((item): item is HierarchyItem => item !== null);

    return {
      id: personId,
      person,
      children: validChildren.length > 0 ? validChildren : undefined,
    };
  };

  // Builds upward hierarchy (person -> parents) for Ancestor/Pedigree view
  const buildAncestorHierarchy = (personId: string, visited: Set<string>): HierarchyItem | null => {
    if (visited.has(personId)) return null;
    visited.add(personId);
    const person = peopleMap.get(personId);
    if (!person) return null;

    if (collapsedNodeIds.has(personId)) {
      return { id: personId, person, children: [] };
    }

    const rawParents = parentsByChild.get(personId) ?? [];
    const validParents = rawParents
      .filter((pId) => includedPersonIds.has(pId) && !visited.has(pId))
      .map((pId) => buildAncestorHierarchy(pId, visited))
      .filter((item): item is HierarchyItem => item !== null);

    return {
      id: personId,
      person,
      children: validParents.length > 0 ? validParents : undefined,
    };
  };

  let treeRoot: HierarchyItem | null = null;
  const globalTreeVisited = new Set<string>();

  if (viewMode === 'ancestor') {
    treeRoot = buildAncestorHierarchy(focusId, globalTreeVisited);
  } else if (viewMode === 'descendant') {
    treeRoot = buildHierarchy(focusPersonId || effectiveRootId, globalTreeVisited);
  } else if (viewMode === 'individual') {
    treeRoot = buildHierarchy(focusId, globalTreeVisited);
  } else {
    // Full view: gather all root nodes with no parents in included set
    const rootsInSet = Array.from(includedPersonIds).filter(
      (id) => (parentsByChild.get(id) ?? []).filter((pId) => includedPersonIds.has(pId)).length === 0
    );

    if (rootsInSet.length > 1) {
      // Synthetic root connecting multiple family branches side by side without duplicating children
      const virtualChildren = rootsInSet
        .map((rId) => buildHierarchy(rId, globalTreeVisited))
        .filter((item): item is HierarchyItem => item !== null);

      treeRoot = {
        id: '__virtual_root__',
        person: {
          id: '__virtual_root__',
          fullName: 'Virtual Root',
          gender: 'unknown',
          isLiving: false,
          createdAt: '',
          updatedAt: '',
        },
        children: virtualChildren,
      };
    } else {
      treeRoot = buildHierarchy(rootsInSet[0] || effectiveRootId, new Set<string>());
    }
  }

  const nodes: TreeNodeData[] = [];
  const links: TreeLinkData[] = [];
  const nodeMap = new Map<string, TreeNodeData>();

  // High-performance iterative descendant count with memoization
  const descendantCountMap = new Map<string, number>();

  const getDescendantCount = (personId: string): number => {
    const cached = descendantCountMap.get(personId);
    if (cached !== undefined) return cached;

    const descendants = new Set<string>();
    const queue = [personId];
    const visited = new Set<string>([personId]);

    while (queue.length > 0) {
      const cur = queue.shift()!;
      const children = childrenByParent.get(cur) ?? [];
      for (const c of children) {
        if (!visited.has(c)) {
          visited.add(c);
          descendants.add(c);
          queue.push(c);
        }
      }
    }

    const total = descendants.size;
    descendantCountMap.set(personId, total);
    return total;
  };

  if (viewMode === 'generation') {
    // Grid generation layout: group people by generation in horizontal bands
    const peopleByGen = new Map<number, Person[]>();
    for (const id of includedPersonIds) {
      const p = peopleMap.get(id);
      if (!p) continue;
      const gen = p.generation ?? 1;
      const list = peopleByGen.get(gen) ?? [];
      list.push(p);
      peopleByGen.set(gen, list);
    }

    const sortedGens = Array.from(peopleByGen.keys()).sort((a, b) => a - b);
    let currentY = 50;

    for (const gen of sortedGens) {
      const rowPeople = peopleByGen.get(gen)!;
      const totalWidth = rowPeople.length * TREE_SIBLING_GAP_X;
      let startX = -totalWidth / 2 + TREE_SIBLING_GAP_X / 2;

      for (const p of rowPeople) {
        const node: TreeNodeData = {
          id: p.id,
          person: p,
          x: startX,
          y: currentY,
          width: TREE_NODE_WIDTH,
          height: TREE_NODE_HEIGHT,
          generation: gen,
          spouses: spousesByPerson.get(p.id) ?? [],
          childIds: childrenByParent.get(p.id) ?? [],
          parentIds: parentsByChild.get(p.id) ?? [],
          hasChildren: (childrenByParent.get(p.id)?.length ?? 0) > 0,
          hasParents: (parentsByChild.get(p.id)?.length ?? 0) > 0,
          branchName: p.branchId ? branchesMap.get(p.branchId) : undefined,
          isFocused: p.id === focusId,
          descendantCount: getDescendantCount(p.id),
        };
        nodes.push(node);
        nodeMap.set(p.id, node);
        startX += TREE_SIBLING_GAP_X;
      }
      currentY += TREE_LEVEL_GAP_Y;
    }
  } else if (treeRoot) {
    // D3 Hierarchy tree layout
    const hierarchy = d3.hierarchy<HierarchyItem>(treeRoot);
    const treeGenerator = d3
      .tree<HierarchyItem>()
      .nodeSize([TREE_SIBLING_GAP_X, TREE_LEVEL_GAP_Y])
      .separation((a, b) => (a.parent === b.parent ? 1.05 : 1.25));

    const rootLayout = treeGenerator(hierarchy);
    const isVirtual = treeRoot.id === '__virtual_root__';

    let maxDepth = 0;
    rootLayout.each((d) => {
      if (d.depth > maxDepth) maxDepth = d.depth;
    });

    rootLayout.each((d) => {
      // Skip virtual root node if present
      if (d.data.id === '__virtual_root__') return;

      const p = d.data.person;
      const isAncestor = viewMode === 'ancestor';
      const gen = p.generation ?? (isAncestor ? (maxDepth - d.depth + 1) : (isVirtual ? d.depth : d.depth + 1));
      const actualY = isAncestor
        ? (maxDepth - d.depth) * TREE_LEVEL_GAP_Y + 50
        : isVirtual
        ? (d.depth - 1) * TREE_LEVEL_GAP_Y + 50
        : d.y + 50;

      const node: TreeNodeData = {
        id: p.id,
        person: p,
        x: d.x,
        y: actualY,
        width: TREE_NODE_WIDTH,
        height: TREE_NODE_HEIGHT,
        generation: gen,
        spouses: spousesByPerson.get(p.id) ?? [],
        childIds: childrenByParent.get(p.id) ?? [],
        parentIds: parentsByChild.get(p.id) ?? [],
        isCollapsed: collapsedNodeIds.has(p.id),
        hasChildren: (childrenByParent.get(p.id)?.length ?? 0) > 0,
        hasParents: (parentsByChild.get(p.id)?.length ?? 0) > 0,
        branchName: p.branchId ? branchesMap.get(p.branchId) : undefined,
        isFocused: p.id === focusId,
        descendantCount: getDescendantCount(p.id),
      };

      nodes.push(node);
      nodeMap.set(p.id, node);
    });
  }

  // Construct links between displayed nodes
  for (const rel of relationships) {
    const parentNode = nodeMap.get(rel.parentId);
    const childNode = nodeMap.get(rel.childId);

    if (parentNode && childNode) {
      links.push({
        id: rel.id,
        sourceId: parentNode.id,
        targetId: childNode.id,
        sourceX: parentNode.x + TREE_NODE_WIDTH / 2,
        sourceY: parentNode.y + TREE_NODE_HEIGHT,
        targetX: childNode.x + TREE_NODE_WIDTH / 2,
        targetY: childNode.y,
        lineageType: rel.lineageType,
      });
    }
  }

  // Compute bounding box
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  if (nodes.length === 0) {
    return {
      nodes: [],
      links: [],
      bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 },
    };
  }

  for (const n of nodes) {
    minX = Math.min(minX, n.x);
    maxX = Math.max(maxX, n.x + n.width);
    minY = Math.min(minY, n.y);
    maxY = Math.max(maxY, n.y + n.height);
  }

  return {
    nodes,
    links,
    bounds: {
      minX,
      maxX,
      minY,
      maxY,
      width: Math.max(maxX - minX, 100),
      height: Math.max(maxY - minY, 100),
    },
  };
}

/**
 * Generates an SVG path string for parent-to-child connections
 */
export function generateCurvedLinkPath(link: TreeLinkData): string {
  const { sourceX, sourceY, targetX, targetY } = link;
  const midY = (sourceY + targetY) / 2;

  return `M ${sourceX} ${sourceY} C ${sourceX} ${midY}, ${targetX} ${midY}, ${targetX} ${targetY}`;
}
