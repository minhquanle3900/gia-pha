import {
  LifeEvent,
  Media,
  Person,
  Relationship,
  Union,
} from '../models/genealogy';
import { normalizeVietnameseText } from '../utils/dateUtils';
import { findUnionCollision, hasAncestryCycleThrough } from './validationService';

export interface DuplicatePair {
  personA: Person;
  personB: Person;
  matchScore: number; // 0 - 100
  reasons: string[];
}

export interface MergeResult {
  mergedPerson: Person;
  updatedRelationships: Relationship[];
  deletedRelationshipIds: string[];
  updatedUnions: Union[];
  updatedLifeEvents: LifeEvent[];
  updatedMedia: Media[];
  deletedPersonId: string;
}

/**
 * Finds potential duplicate individuals in the dataset
 */
export function findPotentialDuplicates(
  people: Person[],
  relationships: Relationship[],
  unions: Union[]
): DuplicatePair[] {
  const duplicates: DuplicatePair[] = [];
  const checkedPairs = new Set<string>();

  // Helper lookup for parents and spouses
  const parentsByPerson = new Map<string, string[]>();
  for (const r of relationships) {
    const list = parentsByPerson.get(r.childId) ?? [];
    list.push(r.parentId);
    parentsByPerson.set(r.childId, list);
  }

  const spousesByPerson = new Map<string, string[]>();
  for (const u of unions) {
    if (u.partnerIds.length >= 2) {
      const [p1, p2] = u.partnerIds;
      const list1 = spousesByPerson.get(p1) ?? [];
      list1.push(p2);
      spousesByPerson.set(p1, list1);

      const list2 = spousesByPerson.get(p2) ?? [];
      list2.push(p1);
      spousesByPerson.set(p2, list2);
    }
  }

  for (let i = 0; i < people.length; i++) {
    for (let j = i + 1; j < people.length; j++) {
      const pA = people[i];
      const pB = people[j];
      const pairKey = `${pA.id}:::${pB.id}`;
      if (checkedPairs.has(pairKey)) continue;
      checkedPairs.add(pairKey);

      let score = 0;
      const reasons: string[] = [];

      const normA = normalizeVietnameseText(pA.fullName);
      const normB = normalizeVietnameseText(pB.fullName);
      const sameName = normA.length > 0 && normA === normB;

      // 1. Name match
      if (sameName) {
        score += 50;
        reasons.push('Họ và tên trùng sau chuẩn hóa');
      } else if (normA && normB && (normA.includes(normB) || normB.includes(normA))) {
        score += 25;
        reasons.push('Họ và tên tương tự nhau');
      }

      // Check common name / taboo name
      if (pA.tabooName && pB.tabooName && normalizeVietnameseText(pA.tabooName) === normalizeVietnameseText(pB.tabooName)) {
        score += 20;
        reasons.push('Trùng tên húy');
      }

      // 2. Gender match
      if (pA.gender === pB.gender && pA.gender !== 'unknown') {
        score += 10;
      } else if (pA.gender !== pB.gender && pA.gender !== 'unknown' && pB.gender !== 'unknown') {
        // Different known genders: definitely not duplicates
        continue;
      }

      // 3. Birth / Death year match
      const bA = pA.birthDate?.year;
      const bB = pB.birthDate?.year;
      const sameBirthYear = Boolean(bA) && bA === bB;
      if (bA && bB) {
        if (sameBirthYear) {
          score += 25;
          reasons.push(`Cùng năm sinh (${bA})`);
        } else if (Math.abs(bA - bB) <= 2) {
          score += 15;
          reasons.push(`Năm sinh gần sát nhau (${bA} và ${bB})`);
        } else {
          // Differ by more than 5 years: unlikely to be duplicate
          score -= 30;
        }
      }

      // 4. Generation match
      if (pA.generation && pB.generation) {
        if (pA.generation === pB.generation) {
          score += 15;
          reasons.push(`Cùng đời thứ ${pA.generation}`);
        } else {
          score -= 40;
          reasons.push(`Khác đời (${pA.generation} và ${pB.generation}): cần đối chiếu`);
        }
      }

      // 5. Common parents
      const parsA = parentsByPerson.get(pA.id) ?? [];
      const parsB = parentsByPerson.get(pB.id) ?? [];
      const commonParents = parsA.filter((id) => parsB.includes(id));
      if (commonParents.length > 0) {
        score += 25;
        reasons.push('Có cùng cha hoặc mẹ');
      }

      // 6. Common spouses
      const spA = spousesByPerson.get(pA.id) ?? [];
      const spB = spousesByPerson.get(pB.id) ?? [];
      const commonSpouses = spA.filter((id) => spB.includes(id));
      if (commonSpouses.length > 0) {
        score += 20;
        reasons.push('Có cùng bạn đời / vợ chồng');
      }

      // A year and normalized name match still merits review if the generation differs.
      if (score >= 50 || (sameName && sameBirthYear)) {
        duplicates.push({
          personA: pA,
          personB: pB,
          matchScore: Math.min(score, 100),
          reasons,
        });
      }
    }
  }

  duplicates.sort((a, b) => b.matchScore - a.matchScore);
  return duplicates;
}

function mergeDuplicateRelationship(
  retained: Relationship,
  incoming: Relationship,
  updatedAt: string
): Relationship {
  const incompatibleLineage = retained.lineageType !== 'unknown' && incoming.lineageType !== 'unknown'
    && retained.lineageType !== incoming.lineageType;
  const incompatibleUnions = retained.unionId && incoming.unionId && retained.unionId !== incoming.unionId;
  const incompatibleBirthOrder = retained.birthOrder !== undefined && incoming.birthOrder !== undefined
    && retained.birthOrder !== incoming.birthOrder;

  if (incompatibleLineage || incompatibleUnions || incompatibleBirthOrder) {
    throw new Error('Không thể sáp nhập vì hai liên kết cha mẹ/con cái có thông tin mâu thuẫn.');
  }

  return {
    ...retained,
    lineageType: retained.lineageType === 'unknown' ? incoming.lineageType : retained.lineageType,
    unionId: retained.unionId || incoming.unionId,
    birthOrder: retained.birthOrder ?? incoming.birthOrder,
    notes: retained.notes && incoming.notes && retained.notes !== incoming.notes
      ? `${retained.notes}\n\n${incoming.notes}`
      : retained.notes || incoming.notes,
    updatedAt,
  };
}

/**
 * Plans a merge against the supplied records. The caller owns the transaction.
 */
export function executeMergeRecords(params: {
  targetPerson: Person;
  sourcePerson: Person;
  relationships: Relationship[];
  unions: Union[];
  lifeEvents: LifeEvent[];
  media: Media[];
}): MergeResult {
  const { targetPerson, sourcePerson, relationships, unions, lifeEvents, media } = params;
  const { id: targetId } = targetPerson;
  const { id: sourceId } = sourcePerson;
  const updatedAt = new Date().toISOString();

  if (targetId === sourceId) {
    throw new Error('Hãy chọn hai hồ sơ khác nhau để sáp nhập.');
  }

  const branchId = targetPerson.branchId || sourcePerson.branchId;
  const otherBranches = new Set([
    ...(targetPerson.secondaryBranchIds ?? []),
    ...(sourcePerson.secondaryBranchIds ?? []),
  ]);
  if (sourcePerson.branchId && sourcePerson.branchId !== branchId) {
    otherBranches.add(sourcePerson.branchId);
  }
  if (branchId) otherBranches.delete(branchId);

  const portrait = targetPerson.portraitUrl || targetPerson.portraitMediaId ? targetPerson : sourcePerson;

  // 1. Combine Profile fields (Target takes precedence, Source fills blanks)
  const mergedPerson: Person = {
    ...targetPerson,
    fullName: targetPerson.fullName || sourcePerson.fullName,
    gender: targetPerson.gender !== 'unknown' ? targetPerson.gender : sourcePerson.gender,
    portraitUrl: portrait.portraitUrl,
    portraitMediaId: portrait.portraitMediaId,
    commonName: targetPerson.commonName || sourcePerson.commonName,
    tabooName: targetPerson.tabooName || sourcePerson.tabooName,
    courtesyName: targetPerson.courtesyName || sourcePerson.courtesyName,
    alias: targetPerson.alias || sourcePerson.alias,

    isLiving: targetPerson.isLiving && sourcePerson.isLiving,
    birthDate: targetPerson.birthDate || sourcePerson.birthDate,
    birthPlace: targetPerson.birthPlace || sourcePerson.birthPlace,
    deathDate: targetPerson.deathDate || sourcePerson.deathDate,
    deathPlace: targetPerson.deathPlace || sourcePerson.deathPlace,
    ancestralHome: targetPerson.ancestralHome || sourcePerson.ancestralHome,
    residence: targetPerson.residence || sourcePerson.residence,
    occupation: targetPerson.occupation || sourcePerson.occupation,
    biography:
      targetPerson.biography && sourcePerson.biography && targetPerson.biography !== sourcePerson.biography
        ? `${targetPerson.biography}\n\n[Ghi chú sáp nhập]: ${sourcePerson.biography}`
        : targetPerson.biography || sourcePerson.biography,
    notes:
      targetPerson.notes && sourcePerson.notes && targetPerson.notes !== sourcePerson.notes
        ? `${targetPerson.notes}\n\n${sourcePerson.notes}`
        : targetPerson.notes || sourcePerson.notes,

    generation: targetPerson.generation || sourcePerson.generation,
    branchId,
    secondaryBranchIds: otherBranches.size ? [...otherBranches] : undefined,
    subBranch: targetPerson.subBranch || sourcePerson.subBranch,
    clanRole: targetPerson.clanRole || sourcePerson.clanRole,
    deathAnniversaryLunar: targetPerson.deathAnniversaryLunar || sourcePerson.deathAnniversaryLunar,
    burialPlace: targetPerson.burialPlace || sourcePerson.burialPlace,
    merits: targetPerson.merits || sourcePerson.merits,

    updatedAt,
  };

  // Index existing target edges first so a collision retains their IDs.
  const targetEdges = new Map<string, Relationship>();
  const relationshipKey = (parentId: string, childId: string) => JSON.stringify([parentId, childId]);
  for (const rel of relationships) {
    if (rel.parentId !== targetId && rel.childId !== targetId) continue;
    const key = relationshipKey(rel.parentId, rel.childId);
    if (!targetEdges.has(key)) targetEdges.set(key, rel);
  }

  const updatedRelationships = new Map<string, Relationship>();
  const deletedRelationshipIds = new Set<string>();
  for (const rel of relationships) {
    if (rel.parentId !== sourceId && rel.childId !== sourceId) continue;
    const parentId = rel.parentId === sourceId ? targetId : rel.parentId;
    const childId = rel.childId === sourceId ? targetId : rel.childId;
    if (parentId === childId) {
      throw new Error('Không thể sáp nhập vì sẽ tạo quan hệ cha mẹ/con cái với chính mình.');
    }

    const key = relationshipKey(parentId, childId);
    const retained = targetEdges.get(key);
    const next = retained
      ? mergeDuplicateRelationship(retained, rel, updatedAt)
      : { ...rel, parentId, childId, updatedAt };
    if (retained) deletedRelationshipIds.add(rel.id);

    targetEdges.set(key, next);
    updatedRelationships.set(next.id, next);
  }

  // A new cycle from coalescing two people must pass through the retained person.
  const mergedGraph = relationships
    .filter((rel) => !deletedRelationshipIds.has(rel.id))
    .map((rel) => updatedRelationships.get(rel.id) ?? rel);
  if (hasAncestryCycleThrough(targetId, mergedGraph)) {
    throw new Error('Không thể sáp nhập vì đồ thị tổ tiên sau sáp nhập có vòng lặp.');
  }

  const updatedUnions: Union[] = [];
  for (const union of unions) {
    if (!union.partnerIds.includes(sourceId)) continue;
    if (union.partnerIds.includes(targetId)) {
      throw new Error('Không thể sáp nhập hai hồ sơ đang có quan hệ hôn phối với nhau.');
    }
    updatedUnions.push({
      ...union,
      partnerIds: [...new Set(union.partnerIds.map((id) => id === sourceId ? targetId : id))],
      updatedAt,
    });
  }
  if (updatedUnions.length > 0) {
    const mergedUnions = [...unions.filter((union) => !union.partnerIds.includes(sourceId)), ...updatedUnions];
    for (const union of updatedUnions) {
      const collision = findUnionCollision(union, mergedUnions);
      if (collision) {
        throw new Error(
          `Không thể sáp nhập vì hôn phối "${union.id}" và "${collision.id}" cùng cặp thành viên nhưng thiếu niên đại phân biệt.`
        );
      }
    }
  }

  const updatedLifeEvents = lifeEvents
    .filter((event) => event.personId === sourceId)
    .map((event) => ({ ...event, personId: targetId, updatedAt }));

  const updatedMedia = media
    .filter((item) =>
      item.personIds.includes(sourceId) ||
      (item.id === sourcePerson.portraitMediaId && !item.personIds.includes(targetId))
    )
    .map((item) => ({
      ...item,
      personIds: [...new Set([...item.personIds.map((id) => id === sourceId ? targetId : id), targetId])],
      updatedAt,
    }));

  return {
    mergedPerson,
    updatedRelationships: [...updatedRelationships.values()],
    deletedRelationshipIds: [...deletedRelationshipIds],
    updatedUnions,
    updatedLifeEvents,
    updatedMedia,
    deletedPersonId: sourceId,
  };
}
