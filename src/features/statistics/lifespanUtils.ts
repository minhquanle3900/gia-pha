import { Person } from '../../models/genealogy';

export interface PersonLifespanData {
  person: Person;
  age: number;
  generation: number;
  isLiving: boolean;
  birthYear?: number;
  deathYear?: number;
  bracketKey: string;
}

export interface LongevityBracket {
  key: string;
  label: string;
  traditionalName: string;
  min: number;
  max: number;
  color: string;
  bgColor: string;
  description: string;
}

export const LONGEVITY_BRACKETS: LongevityBracket[] = [
  {
    key: 'under_50',
    label: 'Dưới 50 tuổi',
    traditionalName: 'Hưởng dương',
    min: 0,
    max: 49,
    color: '#8A5A2B',
    bgColor: '#FAF0E6',
    description: 'Thành viên tạ thế ở độ tuổi thanh xuân hoặc trung niên',
  },
  {
    key: '50_59',
    label: '50 – 59 tuổi',
    traditionalName: 'Tri thiên mệnh',
    min: 50,
    max: 59,
    color: '#B07D38',
    bgColor: '#FAF3E8',
    description: 'Độ tuổi ngũ tuần tri thiên mệnh',
  },
  {
    key: '60_69',
    label: '60 – 69 tuổi',
    traditionalName: 'Hạ thọ (Lục tuần)',
    min: 60,
    max: 69,
    color: '#5B7C67',
    bgColor: '#EDF4EF',
    description: 'Bắt đầu tuần lễ mừng thọ theo phong tục cổ truyền',
  },
  {
    key: '70_79',
    label: '70 – 79 tuổi',
    traditionalName: 'Trung thọ (Thất tuần)',
    min: 70,
    max: 79,
    color: '#286248',
    bgColor: '#E2EFE7',
    description: 'Nhân sinh thất thập cổ lai hy, phúc lộc song toàn',
  },
  {
    key: '80_89',
    label: '80 – 89 tuổi',
    traditionalName: 'Thượng thọ (Bát tuần)',
    min: 80,
    max: 89,
    color: '#1B3B2B',
    bgColor: '#D4E6DC',
    description: 'Bát tuần thượng thọ, rường cột phúc đức của dòng họ',
  },
  {
    key: '90_plus',
    label: 'Từ 90 tuổi trở lên',
    traditionalName: 'Đại thọ · Bách tuế',
    min: 90,
    max: 130,
    color: '#C19B4C',
    bgColor: '#FBF4DC',
    description: 'Cửu tuần đại thọ & đại tường bách tuế trường xuân',
  },
];

export function getBracketForAge(age: number): LongevityBracket {
  for (const b of LONGEVITY_BRACKETS) {
    if (age >= b.min && age <= b.max) return b;
  }
  return LONGEVITY_BRACKETS[LONGEVITY_BRACKETS.length - 1];
}

/**
 * Calculate person age / lifespan
 */
export function extractPersonLifespan(
  person: Person,
  referenceYear = new Date().getFullYear()
): PersonLifespanData | null {
  const birthYear = person.birthDate?.year;
  if (!birthYear) return null;

  let age: number;
  let deathYear: number | undefined;

  if (person.isLiving) {
    age = referenceYear - birthYear;
  } else {
    deathYear = person.deathDate?.year;
    if (!deathYear) return null;
    age = deathYear - birthYear;
  }

  if (age < 0 || age > 130) return null;

  const bracket = getBracketForAge(age);

  return {
    person,
    age,
    generation: person.generation || 1,
    isLiving: person.isLiving,
    birthYear,
    deathYear,
    bracketKey: bracket.key,
  };
}

export interface GenerationLongevityStat {
  generation: number;
  count: number;
  avgAge: number;
  minAge: number;
  maxAge: number;
  oldestPerson?: Person;
  members: PersonLifespanData[];
}

export interface ClanLongevitySummary {
  totalAnalyzed: number;
  averageAge: number;
  oldestLiving?: { person: Person; age: number };
  oldestAncestor?: { person: Person; age: number };
  venerableCount: number; // >= 70
  venerablePercent: number; // % >= 70
  generationStats: GenerationLongevityStat[];
  bracketCounts: Record<string, { bracket: LongevityBracket; count: number; members: PersonLifespanData[] }>;
}

export function computeClanLongevitySummary(
  people: Person[],
  referenceYear = new Date().getFullYear()
): ClanLongevitySummary {
  const validData: PersonLifespanData[] = [];

  for (const p of people) {
    const data = extractPersonLifespan(p, referenceYear);
    if (data) validData.push(data);
  }

  if (validData.length === 0) {
    return {
      totalAnalyzed: 0,
      averageAge: 0,
      venerableCount: 0,
      venerablePercent: 0,
      generationStats: [],
      bracketCounts: {},
    };
  }

  const totalAge = validData.reduce((sum, d) => sum + d.age, 0);
  const averageAge = Math.round((totalAge / validData.length) * 10) / 10;

  let oldestLiving: { person: Person; age: number } | undefined;
  let oldestAncestor: { person: Person; age: number } | undefined;

  for (const d of validData) {
    if (d.isLiving) {
      if (!oldestLiving || d.age > oldestLiving.age) {
        oldestLiving = { person: d.person, age: d.age };
      }
    } else {
      if (!oldestAncestor || d.age > oldestAncestor.age) {
        oldestAncestor = { person: d.person, age: d.age };
      }
    }
  }

  const venerableList = validData.filter((d) => d.age >= 70);
  const venerableCount = venerableList.length;
  const venerablePercent = Math.round((venerableCount / validData.length) * 100);

  // Group by generation
  const genMap = new Map<number, PersonLifespanData[]>();
  for (const d of validData) {
    const list = genMap.get(d.generation) || [];
    list.push(d);
    genMap.set(d.generation, list);
  }

  const generationStats: GenerationLongevityStat[] = Array.from(genMap.entries())
    .map(([gen, members]) => {
      const gTotal = members.reduce((sum, m) => sum + m.age, 0);
      const avg = Math.round((gTotal / members.length) * 10) / 10;
      let min = members[0].age;
      let max = members[0].age;
      let oldest = members[0].person;

      for (const m of members) {
        if (m.age < min) min = m.age;
        if (m.age > max) {
          max = m.age;
          oldest = m.person;
        }
      }

      return {
        generation: gen,
        count: members.length,
        avgAge: avg,
        minAge: min,
        maxAge: max,
        oldestPerson: oldest,
        members,
      };
    })
    .sort((a, b) => a.generation - b.generation);

  // Bracket counts
  const bracketCounts: Record<string, { bracket: LongevityBracket; count: number; members: PersonLifespanData[] }> = {};
  for (const b of LONGEVITY_BRACKETS) {
    bracketCounts[b.key] = {
      bracket: b,
      count: 0,
      members: [],
    };
  }

  for (const d of validData) {
    if (bracketCounts[d.bracketKey]) {
      bracketCounts[d.bracketKey].count++;
      bracketCounts[d.bracketKey].members.push(d);
    }
  }

  return {
    totalAnalyzed: validData.length,
    averageAge,
    oldestLiving,
    oldestAncestor,
    venerableCount,
    venerablePercent,
    generationStats,
    bracketCounts,
  };
}
