import { Person } from '../models/genealogy';
import { formatFlexibleDate, formatLifespan, formatLunarAnniversary } from '../utils/dateUtils';

export interface NarrationScript {
  title: string;
  sentences: string[];
  fullText: string;
}

export interface SpeechPlayerOptions {
  rate?: number;
  pitch?: number;
  voiceURI?: string;
}

/**
 * Check if Web Speech Synthesis is available in the current browser/device.
 */
export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance !== 'undefined';
}

/**
 * Split narrative text into natural Vietnamese sentence chunks
 * for clear, continuous speech synthesis without timeouts.
 */
export function splitTextIntoSentences(text: string): string[] {
  if (!text || !text.trim()) return [];

  // Normalize line endings and extra spaces
  const cleaned = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\t/g, ' ')
    .trim();

  // Split on sentence boundaries: period, exclamation, question mark, or double newlines
  const rawParts = cleaned.split(/(?<=[.!?。])\s+|\n+/g);

  const sentences: string[] = [];
  for (const raw of rawParts) {
    const trimmed = raw.trim();
    if (!trimmed) continue;

    // If a sentence is unusually long (> 200 chars), split by commas, semicolons, or dashes
    if (trimmed.length > 220) {
      const subParts = trimmed.split(/(?<=[,;:\-])\s+/g);
      let currentBuffer = '';
      for (const sub of subParts) {
        if (!sub.trim()) continue;
        if (currentBuffer.length + sub.length > 180 && currentBuffer.length > 30) {
          sentences.push(currentBuffer.trim());
          currentBuffer = sub;
        } else {
          currentBuffer = currentBuffer ? `${currentBuffer} ${sub}` : sub;
        }
      }
      if (currentBuffer.trim()) {
        sentences.push(currentBuffer.trim());
      }
    } else {
      sentences.push(trimmed);
    }
  }

  return sentences;
}

/**
 * Helper to get Vietnamese honorific title based on person status and generation
 */
export function getPersonHonorific(person: Person): string {
  if (!person.isLiving) {
    if (person.generation && person.generation <= 2) {
      return person.gender === 'female' ? 'Cụ Bà' : 'Cụ Ông';
    }
    if (person.generation && person.generation <= 4) {
      return person.gender === 'female' ? 'Cố Bà' : 'Cố';
    }
    return person.gender === 'female' ? 'Cụ Bà' : 'Cụ Ông';
  }

  if (person.gender === 'male') return 'Ông';
  if (person.gender === 'female') return 'Bà';
  return 'Thành viên';
}

/**
 * Compose narration scripts:
 * 1. 'biography': Reads strictly the written biography of the person.
 * 2. 'full_chronicle': Traditional genealogical chronicle reading combining titles, lineage,
 *                      birth/death, resting place, merit achievements, and the full biography.
 */
export function preparePersonNarrationScript(
  person: Person,
  mode: 'biography' | 'full_chronicle',
  branchName?: string
): NarrationScript {
  const honorific = getPersonHonorific(person);

  if (mode === 'biography') {
    const bioText = person.biography?.trim() || '';
    if (!bioText) {
      const fallback = `Hồ sơ của ${honorific} ${person.fullName} hiện chưa được biên soạn phần văn bản tiểu sử chi tiết. Quý vị có thể chuyển sang chế độ Đọc toàn văn phả ký, hoặc nhấn Sửa hồ sơ để soạn thảo tiểu sử cho tiền nhân.`;
      return {
        title: `Tiểu sử ${person.fullName}`,
        sentences: splitTextIntoSentences(fallback),
        fullText: fallback,
      };
    }

    return {
      title: `Tiểu sử ${honorific} ${person.fullName}`,
      sentences: splitTextIntoSentences(bioText),
      fullText: bioText,
    };
  }

  // Full chronicle composition
  const paragraphs: string[] = [];

  // 1. Dignified introduction
  paragraphs.push(
    `Kính thưa gia quyến và con cháu dòng họ. Sau đây là phả ký truyền đời của ${honorific} ${person.fullName}.`
  );

  // 2. Lineage details
  const lineageDetails: string[] = [];
  if (person.generation) {
    lineageDetails.push(`thuộc đời thứ ${person.generation} của dòng tộc`);
  }
  if (branchName) {
    lineageDetails.push(`trực thuộc chi họ ${branchName}`);
  }
  if (person.subBranch) {
    lineageDetails.push(`phái ${person.subBranch}`);
  }
  if (person.clanRole) {
    lineageDetails.push(`giữ trọng trách ${person.clanRole}`);
  }

  if (lineageDetails.length > 0) {
    paragraphs.push(`${honorific} ${lineageDetails.join(', ')}.`);
  }

  // 3. Traditional names
  const traditionalNames: string[] = [];
  if (person.commonName) traditionalNames.push(`tên thường gọi là ${person.commonName}`);
  if (person.tabooName) traditionalNames.push(`tên húy là ${person.tabooName}`);
  if (person.courtesyName) traditionalNames.push(`tên tự là ${person.courtesyName}`);
  if (person.alias) traditionalNames.push(`bí danh hoạt động là ${person.alias}`);

  if (traditionalNames.length > 0) {
    paragraphs.push(`Trong gia phả ghi nhận, ${traditionalNames.join('; ')}.`);
  }

  // 4. Lifespan and Origins
  const birthStr = person.birthDate ? formatFlexibleDate(person.birthDate) : undefined;
  const birthPlace = person.birthPlace;
  const ancestralHome = person.ancestralHome;

  if (birthStr || birthPlace || ancestralHome) {
    let originSentence = `${honorific} ${person.fullName}`;
    if (birthStr && birthStr !== 'Chưa rõ') originSentence += ` sinh vào ${birthStr}`;
    if (birthPlace) originSentence += ` tại ${birthPlace}`;
    if (ancestralHome) originSentence += `. Nguyên quán dòng họ tại ${ancestralHome}`;
    paragraphs.push(`${originSentence}.`);
  }

  if (!person.isLiving) {
    const deathStr = person.deathDate ? formatFlexibleDate(person.deathDate) : undefined;
    const deathPlace = person.deathPlace;
    let demiseSentence = `${honorific} tạ thế`;
    if (deathStr && deathStr !== 'Chưa rõ') demiseSentence += ` vào ${deathStr}`;
    if (deathPlace) demiseSentence += ` tại ${deathPlace}`;

    if (person.deathAnniversaryLunar && (person.deathAnniversaryLunar.day || person.deathAnniversaryLunar.month)) {
      demiseSentence += `. Lễ kỵ giỗ hàng năm được con cháu phụng sự vào ngày ${formatLunarAnniversary(person.deathAnniversaryLunar)}`;
    }
    paragraphs.push(`${demiseSentence}.`);

    if (person.burialPlace) {
      paragraphs.push(`Phần mộ của ${honorific} hiện được an táng tại ${person.burialPlace}.`);
    }
  } else {
    paragraphs.push(
      `Hiện nay ${honorific} đang đại thụ trường xuân${person.residence ? `, cư trú tại ${person.residence}` : ''}.`
    );
  }

  if (person.occupation) {
    paragraphs.push(`Sinh thời, nghề nghiệp và công tác của ${honorific} là: ${person.occupation}.`);
  }

  // 5. Merits and contributions
  if (person.merits && person.merits.trim()) {
    paragraphs.push(
      `Về công đức và đóng góp cho gia tộc: ${person.merits.trim()}`
    );
  }

  // 6. Detailed biography body
  if (person.biography && person.biography.trim()) {
    paragraphs.push(`Sau đây là ký sự cuộc đời: ${person.biography.trim()}`);
  }

  // 7. Concluding genealogical blessing
  if (!person.isLiving) {
    paragraphs.push(
      `Cúi xin tiền nhân anh linh phù hộ độ trì cho cháu con vạn đại luôn giữ tròn hiếu nghĩa, rạng rỡ tông đường.`
    );
  } else {
    paragraphs.push(
      `Kính chúc ${honorific} bách niên giai lão, phúc thọ song toàn, làm điểm tựa tinh thần vững chãi cho muôn đời con cháu.`
    );
  }

  const fullText = paragraphs.join('\n\n');
  const sentences = splitTextIntoSentences(fullText);

  return {
    title: `Phả ký toàn diện ${honorific} ${person.fullName}`,
    sentences,
    fullText,
  };
}

/**
 * Filter available browser voices for Vietnamese speech
 */
export function getVietnameseVoices(allVoices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return allVoices.filter((v) => {
    const lang = (v.lang || '').toLowerCase().replace(/_/g, '-');
    return lang.startsWith('vi') || v.name.toLowerCase().includes('vietnam') || v.name.toLowerCase().includes('tiếng việt');
  });
}
