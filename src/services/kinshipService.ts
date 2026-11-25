import { Person, Relationship, Union } from '../models/genealogy';

export interface KinshipResult {
  related: boolean;
  lcaPerson?: Person;
  generationDiff: number; // generation(B) - generation(A)
  termAtoB: string; // How A addresses B
  termBtoA: string; // How B addresses A
  explanation: string;
  path: Array<{ person: Person; relationToPrev?: string }>;
}

/**
 * Calculates traditional Vietnamese kinship title between Person A and Person B
 */
export function calculateVietnameseKinship(
  personAId: string,
  personBId: string,
  people: Person[],
  relationships: Relationship[],
  unions: Union[]
): KinshipResult {
  const peopleMap = new Map(people.map((p) => [p.id, p]));
  const personA = peopleMap.get(personAId);
  const personB = peopleMap.get(personBId);

  if (!personA || !personB) {
    return {
      related: false,
      generationDiff: 0,
      termAtoB: 'Không rõ',
      termBtoA: 'Không rõ',
      explanation: 'Không tìm thấy hồ sơ của một hoặc cả hai thành viên trong gia phả.',
      path: [],
    };
  }

  if (personAId === personBId) {
    return {
      related: true,
      generationDiff: 0,
      termAtoB: 'Chính mình',
      termBtoA: 'Chính mình',
      explanation: 'Cùng là một người.',
      path: [{ person: personA }],
    };
  }

  // 1. Check direct spouse relationship
  for (const u of unions) {
    if (u.partnerIds.includes(personAId) && u.partnerIds.includes(personBId)) {
      if (personA.gender === 'male' && personB.gender === 'female') {
        return {
          related: true,
          generationDiff: 0,
          termAtoB: 'Vợ (Hiền thê / Nhà tôi)',
          termBtoA: 'Chồng (Phu quân / Nhà tôi)',
          explanation: 'Quan hệ vợ chồng (Hôn phối trong dòng họ).',
          path: [{ person: personA }, { person: personB, relationToPrev: 'Vợ/Chồng' }],
        };
      } else if (personA.gender === 'female' && personB.gender === 'male') {
        return {
          related: true,
          generationDiff: 0,
          termAtoB: 'Chồng (Phu quân / Nhà tôi)',
          termBtoA: 'Vợ (Hiền thê / Nhà tôi)',
          explanation: 'Quan hệ vợ chồng (Hôn phối trong dòng họ).',
          path: [{ person: personA }, { person: personB, relationToPrev: 'Vợ/Chồng' }],
        };
      }
      return {
        related: true,
        generationDiff: 0,
        termAtoB: 'Bạn đời / Phối ngẫu',
        termBtoA: 'Bạn đời / Phối ngẫu',
        explanation: 'Quan hệ hôn phối.',
        path: [{ person: personA }, { person: personB, relationToPrev: 'Bạn đời' }],
      };
    }
  }

  // Build parent and child lookup
  const parentsByChild = new Map<string, string[]>();
  const childrenByParent = new Map<string, string[]>();
  for (const r of relationships) {
    const pars = parentsByChild.get(r.childId) ?? [];
    pars.push(r.parentId);
    parentsByChild.set(r.childId, pars);

    const chils = childrenByParent.get(r.parentId) ?? [];
    chils.push(r.childId);
    childrenByParent.set(r.parentId, chils);
  }

  // Helper: Find all ancestors with path & distance
  function getAncestorsWithDistances(startId: string) {
    const distances = new Map<string, { dist: number; path: string[] }>();
    const queue: Array<{ id: string; dist: number; path: string[] }> = [
      { id: startId, dist: 0, path: [startId] },
    ];
    distances.set(startId, { dist: 0, path: [startId] });

    while (queue.length > 0) {
      const cur = queue.shift()!;
      const pars = parentsByChild.get(cur.id) ?? [];
      for (const pId of pars) {
        if (!distances.has(pId)) {
          const nextDist = cur.dist + 1;
          const nextPath = [...cur.path, pId];
          distances.set(pId, { dist: nextDist, path: nextPath });
          queue.push({ id: pId, dist: nextDist, path: nextPath });
        }
      }
    }
    return distances;
  }

  const ancestorsA = getAncestorsWithDistances(personAId);
  const ancestorsB = getAncestorsWithDistances(personBId);

  // Find Lowest Common Ancestor (minimum distA + distB)
  let lcaId: string | null = null;
  let minTotalDist = Infinity;

  for (const [ancId, dataA] of ancestorsA.entries()) {
    if (ancestorsB.has(ancId)) {
      const dataB = ancestorsB.get(ancId)!;
      const totalDist = dataA.dist + dataB.dist;
      if (totalDist < minTotalDist) {
        minTotalDist = totalDist;
        lcaId = ancId;
      }
    }
  }

  if (!lcaId) {
    return {
      related: false,
      generationDiff: (personB.generation ?? 1) - (personA.generation ?? 1),
      termAtoB: 'Người cùng họ / Chưa xác định quan hệ gần',
      termBtoA: 'Người cùng họ / Chưa xác định quan hệ gần',
      explanation:
        'Chưa tìm thấy tổ tiên chung trực tiếp giữa hai thành viên trong dữ liệu gia phả hiện tại.',
      path: [],
    };
  }

  const lcaPerson = peopleMap.get(lcaId)!;
  const distA = ancestorsA.get(lcaId)!.dist;
  const distB = ancestorsB.get(lcaId)!.dist;
  const genDiff = distA - distB; // Positive means A is younger generation, B is older generation

  // Construct visual path from A up to LCA down to B
  const pathA = ancestorsA.get(lcaId)!.path; // [A, parent, ..., LCA]
  const pathB = ancestorsB.get(lcaId)!.path; // [B, parent, ..., LCA]
  const fullPathIds = [...pathA, ...pathB.slice(0, -1).reverse()];
  const path = fullPathIds
    .map((id) => peopleMap.get(id))
    .filter((p): p is Person => p !== undefined)
    .map((p, idx) => ({
      person: p,
      relationToPrev: idx === 0 ? undefined : idx <= pathA.length - 1 ? 'Con của' : 'Cha/Mẹ của',
    }));

  // 2. Direct Lineage (A is descendant of B, or B is descendant of A)
  if (distB === 0) {
    // B IS the ancestor of A (distA > 0)
    const isMale = personB.gender === 'male';
    if (distA === 1) {
      return {
        related: true,
        lcaPerson,
        generationDiff: -1,
        termAtoB: isMale ? 'Cha (Thân phụ)' : 'Mẹ (Thân mẫu)',
        termBtoA: personA.gender === 'male' ? 'Con trai' : 'Con gái',
        explanation: `B là ${isMale ? 'Cha' : 'Mẹ'} trực tiếp của A.`,
        path,
      };
    }
    if (distA === 2) {
      return {
        related: true,
        lcaPerson,
        generationDiff: -2,
        termAtoB: isMale ? 'Ông nội / Ông ngoại' : 'Bà nội / Bà ngoại',
        termBtoA: 'Cháu nội / Cháu ngoại',
        explanation: `B là ${isMale ? 'Ông' : 'Bà'} của A.`,
        path,
      };
    }
    if (distA === 3) {
      return {
        related: true,
        lcaPerson,
        generationDiff: -3,
        termAtoB: isMale ? 'Cụ ông' : 'Cụ bà',
        termBtoA: 'Chắt',
        explanation: `B là Cụ (${distA} đời trước) của A.`,
        path,
      };
    }
    if (distA === 4) {
      return {
        related: true,
        lcaPerson,
        generationDiff: -4,
        termAtoB: isMale ? 'Kỵ ông' : 'Kỵ bà',
        termBtoA: 'Chút',
        explanation: `B là Kỵ (${distA} đời trước) của A.`,
        path,
      };
    }
    return {
      related: true,
      lcaPerson,
      generationDiff: -distA,
      termAtoB: `Tiên tổ đời ${personB.generation || distA}`,
      termBtoA: `Hậu duệ đời ${personA.generation || 'sau'}`,
      explanation: `B là Tiên tổ cách A ${distA} thế hệ.`,
      path,
    };
  }

  if (distA === 0) {
    // A IS the ancestor of B (distB > 0)
    const isMaleA = personA.gender === 'male';
    if (distB === 1) {
      return {
        related: true,
        lcaPerson,
        generationDiff: 1,
        termAtoB: personB.gender === 'male' ? 'Con trai' : 'Con gái',
        termBtoA: isMaleA ? 'Cha (Thân phụ)' : 'Mẹ (Thân mẫu)',
        explanation: `A là ${isMaleA ? 'Cha' : 'Mẹ'} của B.`,
        path,
      };
    }
    if (distB === 2) {
      return {
        related: true,
        lcaPerson,
        generationDiff: 2,
        termAtoB: 'Cháu nội / ngoại',
        termBtoA: isMaleA ? 'Ông nội / ngoại' : 'Bà nội / ngoại',
        explanation: `A là ${isMaleA ? 'Ông' : 'Bà'} của B.`,
        path,
      };
    }
    if (distB === 3) {
      return {
        related: true,
        lcaPerson,
        generationDiff: 3,
        termAtoB: 'Chắt',
        termBtoA: isMaleA ? 'Cụ ông' : 'Cụ bà',
        explanation: `A là Cụ của B.`,
        path,
      };
    }
    return {
      related: true,
      lcaPerson,
      generationDiff: distB,
      termAtoB: `Hậu duệ đời ${personB.generation || 'sau'}`,
      termBtoA: `Tiên tổ đời ${personA.generation || distB}`,
      explanation: `A là Tiên tổ của B (cách ${distB} thế hệ).`,
      path,
    };
  }

  // 3. Siblings (distA === 1 && distB === 1)
  if (distA === 1 && distB === 1) {
    const isSenior = (personA.birthDate?.year ?? 9999) < (personB.birthDate?.year ?? 9999);
    const bIsMale = personB.gender === 'male';
    const aIsMale = personA.gender === 'male';

    if (isSenior) {
      // A is older, B is younger
      return {
        related: true,
        lcaPerson,
        generationDiff: 0,
        termAtoB: bIsMale ? 'Em trai' : 'Em gái',
        termBtoA: aIsMale ? 'Anh trai' : 'Chị gái',
        explanation: `Cùng cha/mẹ là "${lcaPerson.fullName}". A lớn tuổi hơn B nên A là Anh/Chị, B là Em.`,
        path,
      };
    } else {
      // B is older, A is younger
      return {
        related: true,
        lcaPerson,
        generationDiff: 0,
        termAtoB: bIsMale ? 'Anh trai' : 'Chị gái',
        termBtoA: aIsMale ? 'Em trai' : 'Em gái',
        explanation: `Cùng cha/mẹ là "${lcaPerson.fullName}". B lớn tuổi hơn A nên B là Anh/Chị, A là Em.`,
        path,
      };
    }
  }

  // 4. Same Generation Cousins (distA === distB)
  if (distA === distB) {
    // Both are at the same generation depth from LCA
    // In Vietnamese culture: Seniority among same generation depends on
    // whether one's parent was the elder sibling (Nhánh bác) vs younger sibling (Nhánh chú/cô)
    const subLcaA = pathA[pathA.length - 2];
    const subLcaB = pathB[pathB.length - 2];
    const personSubA = peopleMap.get(subLcaA);
    const personSubB = peopleMap.get(subLcaB);

    let branchSeniority = 0; // > 0 if A's branch is elder, < 0 if B's branch is elder
    if (personSubA && personSubB) {
      const yearSubA = personSubA.birthDate?.year ?? 9999;
      const yearSubB = personSubB.birthDate?.year ?? 9999;
      branchSeniority = yearSubB - yearSubA;
    }

    const bIsMale = personB.gender === 'male';
    const aIsMale = personA.gender === 'male';

    if (branchSeniority > 0) {
      // A belongs to elder branch (Con bác), B belongs to younger branch (Con chú)
      return {
        related: true,
        lcaPerson,
        generationDiff: 0,
        termAtoB: bIsMale ? 'Em họ (Nhánh chú)' : 'Em họ (Nhánh cô/chú)',
        termBtoA: aIsMale ? 'Anh họ (Nhánh bác)' : 'Chị họ (Nhánh bác)',
        explanation: `Cùng chung tổ tiên là "${lcaPerson.fullName}". Chi của A là nhánh trên (con bác) so với chi của B (con chú), nên A ở vai Anh/Chị họ của B.`,
        path,
      };
    } else if (branchSeniority < 0) {
      // B belongs to elder branch, A belongs to younger branch
      return {
        related: true,
        lcaPerson,
        generationDiff: 0,
        termAtoB: bIsMale ? 'Anh họ (Nhánh bác)' : 'Chị họ (Nhánh bác)',
        termBtoA: aIsMale ? 'Em họ (Nhánh chú)' : 'Em họ (Nhánh cô/chú)',
        explanation: `Cùng chung tổ tiên là "${lcaPerson.fullName}". Chi của B là nhánh trên (con bác) so với chi của A (con chú), nên B ở vai Anh/Chị họ của A.`,
        path,
      };
    } else {
      // Fallback by birth year of individuals
      const isSenior = (personA.birthDate?.year ?? 9999) < (personB.birthDate?.year ?? 9999);
      return {
        related: true,
        lcaPerson,
        generationDiff: 0,
        termAtoB: isSenior
          ? bIsMale
            ? 'Em họ'
            : 'Em họ'
          : bIsMale
          ? 'Anh họ'
          : 'Chị họ',
        termBtoA: isSenior
          ? aIsMale
            ? 'Anh họ'
            : 'Chị họ'
          : aIsMale
            ? 'Em họ'
            : 'Em họ',
        explanation: `Cùng chung tổ tiên là "${lcaPerson.fullName}". Cùng đời thứ ${personA.generation || 'bằng nhau'}.`,
        path,
      };
    }
  }

  // 5. One Generation Difference (distA !== distB)
  // If distA > distB: B is in older generation (B is Uncle / Aunt / Grand-uncle relative)
  if (distA > distB) {
    const diff = distA - distB;
    const bIsMale = personB.gender === 'male';

    if (diff === 1) {
      // B is in parent's generation (Uncle / Aunt / Cô / Chú / Bác họ)
      return {
        related: true,
        lcaPerson,
        generationDiff: -1,
        termAtoB: bIsMale ? 'Bác họ / Chú họ' : 'Cô họ / Bác họ',
        termBtoA: 'Cháu họ',
        explanation: `B ở cùng thế hệ với cha/mẹ của A (chung tổ tiên "${lcaPerson.fullName}"). A gọi B bằng Bác họ hoặc Chú/Cô họ, B xưng là Bác/Chú/Cô và gọi A là Cháu họ.`,
        path,
      };
    }
    if (diff === 2) {
      // B is in grandparent's generation (Ông bác, Ông chú họ, Bà cô họ)
      return {
        related: true,
        lcaPerson,
        generationDiff: -2,
        termAtoB: bIsMale ? 'Ông bác họ / Ông chú họ' : 'Bà cô họ / Bà bác họ',
        termBtoA: 'Cháu họ (gọi bằng Ông/Bà)',
        explanation: `B ở cùng thế hệ với ông/bà của A (cách 2 đời). A gọi B bằng Ông/Bà họ, B gọi A là Cháu.`,
        path,
      };
    }
    return {
      related: true,
      lcaPerson,
      generationDiff: -diff,
      termAtoB: `Bậc trên (${diff} thế hệ)`,
      termBtoA: `Con cháu thế hệ sau`,
      explanation: `B thuộc thế hệ trước A ${diff} đời (chung gốc tổ "${lcaPerson.fullName}").`,
      path,
    };
  }

  // If distA < distB: A is in older generation (A is Uncle / Aunt / Elder relative of B)
  const diff = distB - distA;
  const aIsMale = personA.gender === 'male';

  if (diff === 1) {
    return {
      related: true,
      lcaPerson,
      generationDiff: 1,
      termAtoB: 'Cháu họ',
      termBtoA: aIsMale ? 'Bác họ / Chú họ' : 'Cô họ / Bác họ',
      explanation: `A ở cùng thế hệ với cha/mẹ của B (chung tổ tiên "${lcaPerson.fullName}"). A gọi B bằng Cháu họ, B gọi A bằng Bác/Chú/Cô họ.`,
      path,
    };
  }

  if (diff === 2) {
    return {
      related: true,
      lcaPerson,
      generationDiff: 2,
      termAtoB: 'Cháu họ',
      termBtoA: aIsMale ? 'Ông bác họ / Ông chú họ' : 'Bà cô họ / Bà bác họ',
      explanation: `A ở cùng thế hệ với ông/bà của B (cách 2 đời). A xưng là Ông/Bà họ và gọi B là Cháu.`,
      path,
    };
  }

  return {
    related: true,
    lcaPerson,
    generationDiff: diff,
    termAtoB: `Con cháu thế hệ sau (${diff} đời)`,
    termBtoA: `Bậc trên (${diff} thế hệ)`,
    explanation: `A thuộc thế hệ trước B ${diff} đời trong dòng tộc.`,
    path,
  };
}
