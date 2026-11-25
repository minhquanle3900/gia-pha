import {
  LifeEvent,
  Media,
  Person,
  Relationship,
  Union,
} from '../models/genealogy';
import { normalizeVietnameseText } from '../utils/dateUtils';

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
  deletedUnionIds: string[];
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

      // 1. Name match
      if (normA === normB) {
        score += 50;
        reasons.push('Họ và tên hoàn toàn trùng khớp');
      } else if (normA.includes(normB) || normB.includes(normA)) {
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
      if (bA && bB) {
        if (bA === bB) {
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
          score -= 40; // Different generations rarely merge
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

      if (score >= 50) {
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

/**
 * Executes a clean merge of Person Source into Person Target without losing any links
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

  // 1. Combine Profile fields (Target takes precedence, Source fills blanks)
  const mergedPerson: Person = {
    ...targetPerson,
    fullName: targetPerson.fullName || sourcePerson.fullName,
    gender: targetPerson.gender !== 'unknown' ? targetPerson.gender : sourcePerson.gender,
    portraitUrl: targetPerson.portraitUrl || sourcePerson.portraitUrl,
    portraitMediaId: targetPerson.portraitMediaId || sourcePerson.portraitMediaId,
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
    branchId: targetPerson.branchId || sourcePerson.branchId,
    subBranch: targetPerson.subBranch || sourcePerson.subBranch,
    clanRole: targetPerson.clanRole || sourcePerson.clanRole,
    deathAnniversaryLunar: targetPerson.deathAnniversaryLunar || sourcePerson.deathAnniversaryLunar,
    burialPlace: targetPerson.burialPlace || sourcePerson.burialPlace,
    merits: targetPerson.merits || sourcePerson.merits,

    updatedAt: new Date().toISOString(),
  };

  // 2. Re-point relationships (Parents & Children)
  const updatedRelationships: Relationship[] = [];
  const deletedRelationshipIds: string[] = [];
  const seenRelPairs = new Set<string>();

  for (const r of relationships) {
    let pId = r.parentId;
    let cId = r.childId;

    if (pId === sourcePerson.id) pId = targetPerson.id;
    if (cId === sourcePerson.id) cId = targetPerson.id;

    // Prevent self-loop
    if (pId === cId) {
      deletedRelationshipIds.push(r.id);
      continue;
    }

    const pairKey = `${pId}:::${cId}`;
    if (seenRelPairs.has(pairKey)) {
      deletedRelationshipIds.push(r.id);
      continue;
    }
    seenRelPairs.add(pairKey);

    if (pId !== r.parentId || cId !== r.childId) {
      updatedRelationships.push({
        ...r,
        parentId: pId,
        childId: cId,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  // 3. Re-point unions (Spouses)
  const updatedUnions: Union[] = [];
  const deletedUnionIds: string[] = [];

  for (const u of unions) {
    if (!u.partnerIds.includes(sourcePerson.id)) continue;

    const newPartners = Array.from(
      new Set(u.partnerIds.map((id) => (id === sourcePerson.id ? targetPerson.id : id)))
    );

    // If both partners ended up being the same person (e.g. source married target)
    if (newPartners.length < 2) {
      deletedUnionIds.push(u.id);
      continue;
    }

    updatedUnions.push({
      ...u,
      partnerIds: newPartners,
      updatedAt: new Date().toISOString(),
    });
  }

  // 4. Re-point lifeEvents
  const updatedLifeEvents = lifeEvents
    .filter((e) => e.personId === sourcePerson.id)
    .map((e) => ({
      ...e,
      personId: targetPerson.id,
      updatedAt: new Date().toISOString(),
    }));

  // 5. Re-point media
  const updatedMedia = media
    .filter((m) => m.personIds.includes(sourcePerson.id))
    .map((m) => {
      const newPIds = Array.from(
        new Set(m.personIds.map((id) => (id === sourcePerson.id ? targetPerson.id : id)))
      );
      return {
        ...m,
        personIds: newPIds,
        updatedAt: new Date().toISOString(),
      };
    });

  return {
    mergedPerson,
    updatedRelationships,
    deletedRelationshipIds,
    updatedUnions,
    deletedUnionIds,
    updatedLifeEvents,
    updatedMedia,
    deletedPersonId: sourcePerson.id,
  };
}
