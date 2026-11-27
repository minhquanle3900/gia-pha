import { FlexibleDate, LifeEvent } from '../models/genealogy';
import { formatFlexibleDate } from '../utils/dateUtils';
import { GEMINI_DISABLED_MESSAGE, isGeminiEnabled } from './aiBiographyAvailability';

export function canGenerateBiographyInBrowser(): boolean {
  return isGeminiEnabled(import.meta.env.VITE_GEMINI_BIOGRAPHY_ENABLED);
}

export interface GenerateBiographyParams {
  fullName: string;
  gender: 'male' | 'female' | 'unknown';
  commonName?: string;
  tabooName?: string;
  courtesyName?: string;
  alias?: string;
  isLiving: boolean;
  birthDate?: FlexibleDate;
  birthPlace?: string;
  deathDate?: FlexibleDate;
  deathPlace?: string;
  ancestralHome?: string;
  residence?: string;
  occupation?: string;
  generation?: number;
  branchName?: string;
  clanRole?: string;
  merits?: string;
  notes?: string;
  events?: LifeEvent[];
  existingBiography?: string;
}

export interface GenerateBiographyResult {
  biography?: string;
  error?: string;
}

export async function generateBiographyWithAI(
  params: GenerateBiographyParams
): Promise<GenerateBiographyResult> {
  if (!canGenerateBiographyInBrowser()) return { error: GEMINI_DISABLED_MESSAGE };

  try {
    const formattedEvents = (params.events || []).map((e) => ({
      title: e.title,
      dateText: formatFlexibleDate(e.date),
      location: e.location,
      description: e.description,
    }));

    const payload = {
      fullName: params.fullName,
      gender: params.gender,
      commonName: params.commonName,
      tabooName: params.tabooName,
      courtesyName: params.courtesyName,
      alias: params.alias,
      isLiving: params.isLiving,
      birthDateText: params.birthDate ? formatFlexibleDate(params.birthDate) : undefined,
      birthPlace: params.birthPlace,
      deathDateText: params.deathDate ? formatFlexibleDate(params.deathDate) : undefined,
      deathPlace: params.deathPlace,
      ancestralHome: params.ancestralHome,
      residence: params.residence,
      occupation: params.occupation,
      generation: params.generation,
      branchName: params.branchName,
      clanRole: params.clanRole,
      merits: params.merits,
      notes: params.notes,
      events: formattedEvents,
      existingBiography: params.existingBiography,
    };

    const res = await fetch('/api/biography/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Yêu cầu thất bại với mã lỗi HTTP ${res.status}`);
    }

    if (!data.biography || typeof data.biography !== 'string') {
      throw new Error('Máy chủ không trả về nội dung tiểu sử hợp lệ.');
    }

    return { biography: data.biography };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn('AI biography generation error:', message);
    return { error: message };
  }
}
