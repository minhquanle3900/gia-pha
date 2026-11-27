import type { FlexibleDate, Gender, Person, PortraitDraft } from '../../models/genealogy';

export interface PersonFormDraft {
  fullName: string;
  gender: Gender;
  commonName: string;
  tabooName: string;
  courtesyName: string;
  alias: string;
  isLiving: boolean;
  birthDate?: FlexibleDate;
  birthPlace: string;
  deathDate?: FlexibleDate;
  deathPlace: string;
  ancestralHome: string;
  residence: string;
  occupation: string;
  biography: string;
  notes: string;
  generation?: number;
  branchId?: string;
  subBranch: string;
  clanRole: string;
  lunarDay: number | '';
  lunarMonth: number | '';
  lunarNote: string;
  burialPlace: string;
  merits: string;
}

export function createPersonFormDraft(person?: Person | null, defaultBranchId?: string): PersonFormDraft {
  return {
    fullName: person?.fullName || '',
    gender: person?.gender || 'male',
    commonName: person?.commonName || '',
    tabooName: person?.tabooName || '',
    courtesyName: person?.courtesyName || '',
    alias: person?.alias || '',
    isLiving: person?.isLiving ?? true,
    birthDate: person?.birthDate,
    birthPlace: person?.birthPlace || '',
    deathDate: person?.deathDate,
    deathPlace: person?.deathPlace || '',
    ancestralHome: person?.ancestralHome || '',
    residence: person?.residence || '',
    occupation: person?.occupation || '',
    biography: person?.biography || '',
    notes: person?.notes || '',
    generation: person?.generation,
    branchId: person ? person.branchId : defaultBranchId,
    subBranch: person?.subBranch || '',
    clanRole: person?.clanRole || '',
    lunarDay: person?.deathAnniversaryLunar?.day ?? '',
    lunarMonth: person?.deathAnniversaryLunar?.month ?? '',
    lunarNote: person?.deathAnniversaryLunar?.note || '',
    burialPlace: person?.burialPlace || '',
    merits: person?.merits || '',
  };
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(
    ([key, entry]) => [key, canonical(entry)],
  ));
}

function comparableDate(date?: FlexibleDate): FlexibleDate | undefined {
  if (!date) return undefined;
  const calendar = date.calendar ?? 'solar';
  const displayText = date.displayText || undefined;
  if (date.precision === 'year' && calendar === 'solar' && date.year === undefined &&
    date.month === undefined && date.day === undefined && !displayText) return undefined;
  return { ...date, calendar, displayText };
}

export function personFormDraftFingerprint(
  draft: PersonFormDraft,
  portraitDraft?: PortraitDraft | null,
  proposedBiography: string | null = null,
  hasPersistedPortrait = false,
): string {
  return JSON.stringify(canonical({
    draft: { ...draft, birthDate: comparableDate(draft.birthDate), deathDate: comparableDate(draft.deathDate) },
    portrait: portraitDraft === undefined || (portraitDraft === null && !hasPersistedPortrait) ? 'unchanged' : portraitDraft,
    proposedBiography,
  }));
}
