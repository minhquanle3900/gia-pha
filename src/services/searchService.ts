import { FamilyBranch, Person } from '../models/genealogy';
import { normalizeVietnameseText } from '../utils/dateUtils';

export interface SearchResultItem {
  person: Person;
  matchedField: 'name' | 'nickname' | 'birthYear' | 'generation' | 'other';
  matchDetail?: string;
  score: number;
  branchName?: string;
}

/**
 * Global search across the family database by full name, nickname (common name, courtesy name,
 * taboo name, alias), or birth year (with generation matching support).
 */
export function searchFamilyMembers(
  query: string,
  people: Person[],
  branches: FamilyBranch[] = []
): SearchResultItem[] {
  const rawQuery = query.trim();
  if (!rawQuery) return [];

  const normQuery = normalizeVietnameseText(rawQuery);
  const lowerQuery = rawQuery.toLowerCase();
  const branchMap = new Map(branches.map((b) => [b.id, b.name]));

  // Check if query is purely a year (e.g. 1954, 1890, 54) or contains a 4-digit year token (e.g. "Trần 1954")
  const isYearQuery = /^\d{2,4}$/.test(rawQuery);
  const embeddedYearMatch = !isYearQuery ? rawQuery.match(/\b(\d{4})\b/) : null;
  const embeddedYear = embeddedYearMatch ? embeddedYearMatch[1] : null;
  const namePartQuery = embeddedYear
    ? normalizeVietnameseText(rawQuery.replace(/\b\d{4}\b/, ' ').replace(/\s+/g, ' ').trim())
    : normQuery;

  // Check if query matches generation like "đời 3", "đời thứ 3", "doi 3", "g3"
  const genMatch = normQuery.match(/(?:doi|the he|g)\s*(\d+)/i);
  const queryGen = genMatch ? parseInt(genMatch[1], 10) : null;

  const results: SearchResultItem[] = [];

  for (const person of people) {
    let score = 0;
    let matchedField: SearchResultItem['matchedField'] = 'name';
    let matchDetail: string | undefined;

    const normName = normalizeVietnameseText(person.fullName);
    const lowerName = person.fullName.toLowerCase();

    // 1. Full name matching (uses namePartQuery if query combines name + 4-digit year)
    const activeNormQuery = namePartQuery || normQuery;
    if (activeNormQuery) {
      if (lowerName === lowerQuery || normName === activeNormQuery) {
        score += 100;
        matchedField = 'name';
        matchDetail = 'Khớp chính xác họ tên';
      } else if (lowerName.startsWith(lowerQuery) || normName.startsWith(activeNormQuery)) {
        score += 85;
        matchedField = 'name';
        matchDetail = 'Bắt đầu bằng từ khóa';
      } else if (normName.includes(activeNormQuery) || lowerName.includes(lowerQuery)) {
        score += 70;
        matchedField = 'name';
      } else {
        // Check multi-word matching (e.g., "Trần Khải" matches "Trần Văn Khải")
        const queryWords = activeNormQuery.split(' ').filter(Boolean);
        const nameWords = normName.split(' ');
        const allWordsMatch = queryWords.every((qw) =>
          nameWords.some((nw) => nw.includes(qw))
        );
        if (allWordsMatch && queryWords.length > 0) {
          score += 60;
          matchedField = 'name';
          matchDetail = 'Khớp các từ trong tên';
        }
      }
    }

    // 2. Nicknames, alias, common name, courtesy name, taboo name matching
    const nicknames: Array<{ label: string; value?: string }> = [
      { label: 'Tên thường gọi', value: person.commonName },
      { label: 'Tên tự', value: person.courtesyName },
      { label: 'Tên húy', value: person.tabooName },
      { label: 'Biệt danh/Bí danh', value: person.alias },
      { label: 'Vai vế/Tước vị', value: person.clanRole },
    ];

    for (const nick of nicknames) {
      if (!nick.value) continue;
      const lowerNick = nick.value.toLowerCase();
      const normNick = normalizeVietnameseText(nick.value);

      if (lowerNick === lowerQuery || normNick === normQuery) {
        if (score < 95) {
          score = 95;
          matchedField = 'nickname';
          matchDetail = `${nick.label}: ${nick.value}`;
        }
      } else if (lowerNick.includes(lowerQuery) || normNick.includes(normQuery)) {
        if (score < 75) {
          score = 75;
          matchedField = 'nickname';
          matchDetail = `${nick.label}: ${nick.value}`;
        }
      }
    }

    // 3. Birth year matching (supports numeric year and displayText)
    const birthYear = person.birthDate?.year;
    const birthDisplay = person.birthDate?.displayText?.trim();
    if (birthYear) {
      const birthYearStr = birthYear.toString();
      if (isYearQuery) {
        if (birthYearStr === rawQuery) {
          if (score < 80) {
            score = 80;
            matchedField = 'birthYear';
            matchDetail = `Năm sinh: ${birthYear}`;
          }
        } else if (rawQuery.length >= 2 && birthYearStr.endsWith(rawQuery)) {
          if (score < 50) {
            score = 50;
            matchedField = 'birthYear';
            matchDetail = `Năm sinh: ${birthYear}`;
          }
        }
      } else if (embeddedYear && birthYearStr === embeddedYear) {
        // Combined name + birth year boost when name also matched
        if (score > 0) {
          score += 30;
          matchDetail = `Năm sinh: ${birthYear}`;
        } else {
          score = 65;
          matchedField = 'birthYear';
          matchDetail = `Năm sinh: ${birthYear}`;
        }
      } else if (normQuery.includes(birthYearStr)) {
        if (score < 65) {
          score = 65;
          matchedField = 'birthYear';
          matchDetail = `Năm sinh: ${birthYear}`;
        }
      }
    } else if (birthDisplay && (isYearQuery || embeddedYear)) {
      const targetYear = isYearQuery ? rawQuery : embeddedYear!;
      if (birthDisplay.includes(targetYear)) {
        score = Math.max(score, 65);
        matchedField = 'birthYear';
        matchDetail = `Năm sinh: ${birthDisplay}`;
      }
    }

    // Also check death year if specified and not living
    if (!person.isLiving && person.deathDate?.year) {
      const deathYearStr = person.deathDate.year.toString();
      if (isYearQuery && deathYearStr === rawQuery) {
        if (score < 70) {
          score = 70;
          matchedField = 'birthYear';
          matchDetail = `Năm mất: ${person.deathDate.year}`;
        }
      }
    }

    // 4. Generation matching
    if (queryGen !== null && person.generation === queryGen) {
      if (score < 60) {
        score = 60;
        matchedField = 'generation';
        matchDetail = `Đời thứ ${person.generation}`;
      }
    }

    // 5. Additional keyword matches (occupation, places)
    if (score === 0) {
      const otherFields = [
        { label: 'Nghề nghiệp', val: person.occupation },
        { label: 'Nguyên quán', val: person.ancestralHome },
        { label: 'Nơi sinh', val: person.birthPlace },
        { label: 'Cư trú', val: person.residence },
      ].filter((f) => Boolean(f.val)) as Array<{ label: string; val: string }>;

      for (const field of otherFields) {
        if (
          field.val.toLowerCase().includes(lowerQuery) ||
          normalizeVietnameseText(field.val).includes(normQuery)
        ) {
          score = 40;
          matchedField = 'other';
          matchDetail = `${field.label}: ${field.val}`;
          break;
        }
      }
    }

    if (score > 0) {
      results.push({
        person,
        matchedField,
        matchDetail,
        score,
        branchName: person.branchId ? branchMap.get(person.branchId) : undefined,
      });
    }
  }

  // Sort by score descending, then generation ascending (ancestors first), then fullName
  results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    const genA = a.person.generation ?? 999;
    const genB = b.person.generation ?? 999;
    if (genA !== genB) return genA - genB;
    return a.person.fullName.localeCompare(b.person.fullName, 'vi');
  });

  return results;
}
