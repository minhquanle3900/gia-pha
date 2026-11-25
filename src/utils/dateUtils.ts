import { FlexibleDate, LunarAnniversary } from '../models/genealogy';

export function generateId(prefix = 'rec'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function formatFlexibleDate(date?: FlexibleDate): string {
  if (!date || date.precision === 'unknown') {
    return date?.displayText?.trim() || 'Không rõ';
  }
  if (date.displayText && date.displayText.trim().length > 0 && !date.year) {
    return date.displayText.trim();
  }

  const d = date.day ? String(date.day).padStart(2, '0') : '';
  const m = date.month ? String(date.month).padStart(2, '0') : '';
  const y = date.year ? String(date.year) : '';
  const calSuffix = date.calendar === 'lunar' ? ' (ÂL)' : '';

  switch (date.precision) {
    case 'exact':
      if (d && m && y) return `${d}/${m}/${y}${calSuffix}`;
      if (m && y) return `Tháng ${m}/${y}${calSuffix}`;
      if (y) return `${y}${calSuffix}`;
      break;
    case 'month':
      if (m && y) return `Tháng ${m}/${y}${calSuffix}`;
      if (y) return `${y}${calSuffix}`;
      break;
    case 'year':
      if (y) return `${y}${calSuffix}`;
      break;
    case 'approx':
      if (y) return `Khoảng ${y}${calSuffix}`;
      break;
    case 'before':
      if (y) return `Trước ${y}${calSuffix}`;
      break;
    case 'after':
      if (y) return `Sau ${y}${calSuffix}`;
      break;
  }

  return date.displayText?.trim() || y || 'Không rõ';
}

export function formatLifespan(
  birthDate?: FlexibleDate,
  deathDate?: FlexibleDate,
  isLiving?: boolean
): string {
  const bYear =
    birthDate?.year
      ? birthDate.precision === 'approx'
        ? `~${birthDate.year}`
        : `${birthDate.year}`
      : birthDate?.displayText || '?';

  if (isLiving) {
    return birthDate?.year || birthDate?.displayText ? `Sinh ${bYear} · Còn sống` : 'Còn sống';
  }

  const dYear =
    deathDate?.year
      ? deathDate.precision === 'approx'
        ? `~${deathDate.year}`
        : `${deathDate.year}`
      : deathDate?.displayText || 'Đã mất';

  if (bYear === '?' && dYear === 'Đã mất') {
    return 'Đã mất (không rõ năm)';
  }
  return `${bYear} – ${dYear}`;
}

export function formatLunarAnniversary(lunar?: LunarAnniversary): string {
  if (!lunar || (!lunar.day && !lunar.month && !lunar.note)) return '';
  if (lunar.day && lunar.month) {
    const base = `${String(lunar.day).padStart(2, '0')}/${String(lunar.month).padStart(2, '0')} Âm lịch`;
    return lunar.note ? `${base} (${lunar.note})` : base;
  }
  return lunar.note || '';
}

export function getUpcomingAnniversaryDays(
  lunar?: LunarAnniversary,
  referenceDate: Date = new Date()
): { daysRemaining: number; estimatedSolarDate: Date } | null {
  if (!lunar?.day || !lunar?.month) return null;

  const currentYear = referenceDate.getFullYear();
  const estimateForYear = (yr: number) => {
    const base = new Date(yr, lunar.month! - 1, lunar.day!);
    base.setDate(base.getDate() + 33);
    return base;
  };

  const todayStart = new Date(
    referenceDate.getFullYear(),
    referenceDate.getMonth(),
    referenceDate.getDate()
  );

  let target = estimateForYear(currentYear);
  if (target.getTime() < todayStart.getTime()) {
    target = estimateForYear(currentYear + 1);
  }

  const prevTarget = estimateForYear(currentYear - 1);
  if (prevTarget.getTime() >= todayStart.getTime() && prevTarget.getTime() < target.getTime()) {
    target = prevTarget;
  }

  const diffMs = target.getTime() - todayStart.getTime();
  const daysRemaining = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return { daysRemaining, estimatedSolarDate: target };
}

export function normalizeVietnameseText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'GP';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function compareFlexibleDates(a?: FlexibleDate, b?: FlexibleDate): number {
  const yA = a?.year ?? 9999;
  const yB = b?.year ?? 9999;
  if (yA !== yB) return yA - yB;
  const mA = a?.month ?? 12;
  const mB = b?.month ?? 12;
  if (mA !== mB) return mA - mB;
  const dA = a?.day ?? 31;
  const dB = b?.day ?? 31;
  return dA - dB;
}
