import {
  AppSettings,
  FamilyBranch,
  LifeEvent,
  Person,
  Union,
} from '../models/genealogy';
import { estimateSolarDateForLunarAnniversary, getCanChiYear } from './lunarCalendarService';

export type FamilyYearEventType = 'birthday' | 'death_anniversary' | 'wedding' | 'clan_ritual' | 'milestone';

export interface FamilyYearEvent {
  id: string;
  type: FamilyYearEventType;
  title: string;
  subTitle?: string;
  // Chronological sorting key in the given year
  date: Date;
  day: number;
  month: number; // 1 - 12
  year: number;
  dateDisplay: string;
  lunarDateDisplay?: string;
  description?: string;
  location?: string;
  // Associated entities
  person?: Person;
  person2?: Person;
  union?: Union;
  branch?: FamilyBranch;
  // Milestone or context details
  milestoneBadge?: string;
  ageOrYears?: number;
  isToday: boolean;
  isPassed: boolean;
  daysRemaining: number; // Negative if passed, 0 if today, positive if upcoming
}

export interface FamilyYearTimelineData {
  targetYear: number;
  events: FamilyYearEvent[];
  eventsByMonth: Map<number, FamilyYearEvent[]>;
  counts: {
    total: number;
    birthdays: number;
    deathAnniversaries: number;
    weddings: number;
    rituals: number;
  };
  upcomingNext: FamilyYearEvent | null;
}

/**
 * Calculates milestone label for wedding anniversaries (Đám cưới Vàng, Bạc, v.v.)
 */
export function getWeddingMilestone(years: number): string | undefined {
  if (years <= 0) return 'Hôn lễ mới';
  if (years === 1) return 'Kỷ niệm 1 năm (Đám cưới Giấy)';
  if (years === 5) return 'Kỷ niệm 5 năm (Đám cưới Gỗ)';
  if (years === 10) return 'Kỷ niệm 10 năm (Đám cưới Thiếc)';
  if (years === 15) return 'Kỷ niệm 15 năm (Đám cưới Thủy tinh)';
  if (years === 20) return 'Kỷ niệm 20 năm (Đám cưới Sứ)';
  if (years === 25) return 'Đám cưới Bạc (25 năm)';
  if (years === 30) return 'Đám cưới Ngọc trai (30 năm)';
  if (years === 35) return 'Đám cưới San hô (35 năm)';
  if (years === 40) return 'Đám cưới Hồng ngọc (40 năm)';
  if (years === 45) return 'Đám cưới Lam ngọc (45 năm)';
  if (years === 50) return 'Đám cưới Vàng (50 năm)';
  if (years === 55) return 'Đám cưới Ngọc bích (55 năm)';
  if (years === 60) return 'Đám cưới Kim cương (60 năm)';
  if (years >= 70) return `Đại thọ hôn nhân (${years} năm)`;
  if (years % 5 === 0) return `Kỷ niệm ${years} năm ngày cưới`;
  return `Kỷ niệm ${years} năm`;
}

/**
 * Calculates traditional Vietnamese longevity milestone for birthdays
 */
export function getLongevityMilestone(age: number): string | undefined {
  if (age === 1) return 'Lễ thôi nôi (Tròn 1 tuổi)';
  if (age === 18) return 'Tuổi trưởng thành (18 tuổi)';
  if (age === 60) return 'Hạ thọ / Lục tuần (60 tuổi)';
  if (age === 70) return 'Trung thọ / Thất tuần (70 tuổi)';
  if (age === 75) return 'Mừng thọ (75 tuổi)';
  if (age === 80) return 'Thượng thọ / Bát tuần (80 tuổi)';
  if (age === 85) return 'Đại thọ (85 tuổi)';
  if (age === 90) return 'Thượng thượng thọ (90 tuổi)';
  if (age === 95) return 'Mừng đại thọ (95 tuổi)';
  if (age >= 100) return `Bách niên giai lão (${age} tuổi)`;
  return undefined;
}

/**
 * Builds all significant family events for the current year chronologically.
 */
export function buildFamilyYearTimeline(params: {
  people: Person[];
  unions: Union[];
  lifeEvents: LifeEvent[];
  branches: FamilyBranch[];
  settings: AppSettings;
  targetYear?: number;
  referenceDate?: Date;
  includeDeceasedBirthdays?: boolean;
}): FamilyYearTimelineData {
  const referenceDate = params.referenceDate || new Date();
  const targetYear = params.targetYear || referenceDate.getFullYear();
  const todayMs = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), referenceDate.getDate()).getTime();

  const branchMap = new Map<string, FamilyBranch>();
  for (const b of params.branches) branchMap.set(b.id, b);

  const peopleMap = new Map<string, Person>();
  for (const p of params.people) peopleMap.set(p.id, p);

  const events: FamilyYearEvent[] = [];

  // Helper to compute date diff in days relative to today
  const getDaysDiff = (targetDate: Date): number => {
    const tMs = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate()).getTime();
    return Math.round((tMs - todayMs) / (1000 * 60 * 60 * 24));
  };

  // -------------------------------------------------------------------------
  // 1. BIRTHDAYS (Sinh nhật & Mừng thọ)
  // -------------------------------------------------------------------------
  for (const p of params.people) {
    if (!p.birthDate || !p.birthDate.month) continue;
    // By default, focus birthdays on living members unless specified
    if (!p.isLiving && !params.includeDeceasedBirthdays) continue;

    const bMonth = p.birthDate.month;
    const bDay = p.birthDate.day || 1;
    const birthYear = p.birthDate.year;
    const turningAge = birthYear ? targetYear - birthYear : undefined;

    const eventDate = new Date(targetYear, bMonth - 1, bDay);
    const daysDiff = getDaysDiff(eventDate);
    const isToday = daysDiff === 0;
    const isPassed = daysDiff < 0;

    const milestoneBadge = turningAge ? getLongevityMilestone(turningAge) : undefined;
    const branch = p.branchId ? branchMap.get(p.branchId) : undefined;

    let subTitle = p.isLiving
      ? turningAge
        ? `Tròn ${turningAge} tuổi · Đời thứ ${p.generation || '—'}`
        : `Thành viên đời thứ ${p.generation || '—'}`
      : turningAge
      ? `Tưởng niệm sinh nhật (${turningAge} năm)`
      : 'Tưởng niệm sinh thời';

    if (p.clanRole) {
      subTitle += ` · ${p.clanRole}`;
    }

    events.push({
      id: `bday_${p.id}_${targetYear}`,
      type: 'birthday',
      title: p.isLiving
        ? milestoneBadge
          ? `Lễ mừng thọ: ${p.fullName}`
          : `Sinh nhật: ${p.fullName}`
        : `Kỷ niệm ngày sinh: ${p.fullName}`,
      subTitle,
      date: eventDate,
      day: bDay,
      month: bMonth,
      year: targetYear,
      dateDisplay: `${String(bDay).padStart(2, '0')}/${String(bMonth).padStart(2, '0')}/${targetYear}`,
      description: milestoneBadge
        ? `Dịp đại thọ chúc mừng cụ ${p.fullName} đón tuổi mới bình an cùng con cháu.`
        : p.commonName
        ? `Thường gọi: ${p.commonName}`
        : undefined,
      location: p.residence || p.birthPlace,
      person: p,
      branch,
      milestoneBadge,
      ageOrYears: turningAge,
      isToday,
      isPassed,
      daysRemaining: daysDiff,
    });
  }

  // -------------------------------------------------------------------------
  // 2. DEATH ANNIVERSARIES (Lễ giỗ / Kỵ nhật Tiên tổ)
  // -------------------------------------------------------------------------
  for (const p of params.people) {
    if (p.isLiving) continue;

    let eventDate: Date | null = null;
    let day = 1;
    let month = 1;
    let lunarDisplay: string | undefined = undefined;

    if (p.deathAnniversaryLunar?.day && p.deathAnniversaryLunar?.month) {
      const lDay = p.deathAnniversaryLunar.day;
      const lMonth = p.deathAnniversaryLunar.month;
      // Convert lunar anniversary to approximate solar date in targetYear
      eventDate = estimateSolarDateForLunarAnniversary(lDay, lMonth, targetYear);
      day = eventDate.getDate();
      month = eventDate.getMonth() + 1;
      lunarDisplay = `Ngày ${String(lDay).padStart(2, '0')}/${String(lMonth).padStart(2, '0')} Âm lịch${
        p.deathAnniversaryLunar.note ? ` (${p.deathAnniversaryLunar.note})` : ''
      }`;
    } else if (p.deathDate?.month) {
      const dMonth = p.deathDate.month;
      const dDay = p.deathDate.day || 1;
      eventDate = new Date(targetYear, dMonth - 1, dDay);
      day = dDay;
      month = dMonth;
    }

    if (!eventDate) continue;

    const daysDiff = getDaysDiff(eventDate);
    const isToday = daysDiff === 0;
    const isPassed = daysDiff < 0;

    const deathYear = p.deathDate?.year;
    const yearsElapsed = deathYear ? targetYear - deathYear : undefined;

    const branch = p.branchId ? branchMap.get(p.branchId) : undefined;
    let subTitle = `Kỵ nhật Tiên tổ · Đời thứ ${p.generation || '—'}`;
    if (yearsElapsed && yearsElapsed > 0) {
      subTitle += ` · Giỗ năm thứ ${yearsElapsed}`;
    }

    const title = p.tabooName
      ? `Lễ giỗ: ${p.fullName} (Húy: ${p.tabooName})`
      : `Lễ giỗ: ${p.fullName}`;

    events.push({
      id: `death_${p.id}_${targetYear}`,
      type: 'death_anniversary',
      title,
      subTitle,
      date: eventDate,
      day,
      month,
      year: targetYear,
      dateDisplay: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${targetYear} (Dương lịch)`,
      lunarDateDisplay: lunarDisplay,
      description: p.burialPlace ? `Mộ phần: ${p.burialPlace}` : p.merits ? `Công đức: ${p.merits}` : undefined,
      location: p.burialPlace || p.ancestralHome || params.settings.ancestralHallLocation,
      person: p,
      branch,
      milestoneBadge: yearsElapsed ? `Năm thứ ${yearsElapsed}` : 'Kỵ nhật cổ truyền',
      ageOrYears: yearsElapsed,
      isToday,
      isPassed,
      daysRemaining: daysDiff,
    });
  }

  // -------------------------------------------------------------------------
  // 3. WEDDINGS & ANNIVERSARIES (Kỷ niệm Ngày Cưới / Hôn lễ)
  // -------------------------------------------------------------------------
  for (const u of params.unions) {
    if (!u.marriageDate?.month) continue;

    const mMonth = u.marriageDate.month;
    const mDay = u.marriageDate.day || 1;
    const marriageYear = u.marriageDate.year;
    const yearsMarried = marriageYear ? targetYear - marriageYear : undefined;

    const p1 = u.partnerIds[0] ? peopleMap.get(u.partnerIds[0]) : undefined;
    const p2 = u.partnerIds[1] ? peopleMap.get(u.partnerIds[1]) : undefined;

    const eventDate = new Date(targetYear, mMonth - 1, mDay);
    const daysDiff = getDaysDiff(eventDate);
    const isToday = daysDiff === 0;
    const isPassed = daysDiff < 0;

    const milestoneBadge = yearsMarried !== undefined ? getWeddingMilestone(yearsMarried) : undefined;
    const partnerNames = p1 && p2 ? `${p1.fullName} & ${p2.fullName}` : p1?.fullName || p2?.fullName || 'Đôi bạn đời';

    const branch = p1?.branchId ? branchMap.get(p1.branchId) : p2?.branchId ? branchMap.get(p2.branchId) : undefined;

    events.push({
      id: `wedding_${u.id}_${targetYear}`,
      type: 'wedding',
      title: milestoneBadge ? `${milestoneBadge}: ${partnerNames}` : `Kỷ niệm ngày cưới: ${partnerNames}`,
      subTitle: `Hôn phối · ${yearsMarried ? `${yearsMarried} năm gắn bó` : 'Ngày cưới'}`,
      date: eventDate,
      day: mDay,
      month: mMonth,
      year: targetYear,
      dateDisplay: `${String(mDay).padStart(2, '0')}/${String(mMonth).padStart(2, '0')}/${targetYear}`,
      description: u.notes || (u.marriagePlace ? `Nơi thành hôn: ${u.marriagePlace}` : undefined),
      location: u.marriagePlace,
      person: p1,
      person2: p2,
      union: u,
      branch,
      milestoneBadge: milestoneBadge || 'Hôn nhân',
      ageOrYears: yearsMarried,
      isToday,
      isPassed,
      daysRemaining: daysDiff,
    });
  }

  // -------------------------------------------------------------------------
  // 4. CLAN RITUALS (Đại lễ Dòng họ định kỳ)
  // -------------------------------------------------------------------------
  const clanRitualDefinitions = [
    {
      id: 'ritual_tet_nguyen_tieu',
      title: 'Đại Lễ Tế Tổ Rằm Tháng Giêng (Thượng Nguyên)',
      lunarDay: 15,
      lunarMonth: 1,
      lunarDesc: 'Rằm tháng Giêng (15/01 ÂL)',
      desc: 'Lễ Khởi xuân, dâng hương Bái Tổ toàn tộc, xướng danh mừng thọ các cụ cao niên và khen thưởng khuyến học.',
    },
    {
      id: 'ritual_thanh_minh',
      title: 'Tiết Thanh Minh & Tảo Mộ Tông Tộc',
      lunarDay: 4,
      lunarMonth: 3,
      lunarDesc: 'Đầu tháng 3 ÂL (Tiết Thanh Minh)',
      desc: 'Con cháu khắp nơi tụ hội tu bổ, đắp sửa phần mộ tổ tiên, thắp nén tâm hương tri ân cội nguồn.',
    },
    {
      id: 'ritual_vu_lan',
      title: 'Đại Lễ Vu Lan Báo Hiếu & Tế Thu',
      lunarDay: 15,
      lunarMonth: 7,
      lunarDesc: 'Rằm tháng 7 (15/07 ÂL)',
      desc: 'Đại lễ Báo hiếu Tiên tổ, cầu siêu phả độ gia tiên, biểu dương đạo Hiếu và sum họp dòng họ.',
    },
    {
      id: 'ritual_ta_nam',
      title: 'Lễ Tạ Năm & Dâng Hương Tất Niên Từ Đường',
      lunarDay: 23,
      lunarMonth: 12,
      lunarDesc: 'Ngày 23 tháng Chạp ÂL',
      desc: 'Tổng kết công việc gia tộc trong năm, tạ ơn Tiên tổ che chở phù hộ con cháu phương xa.',
    },
  ];

  for (const r of clanRitualDefinitions) {
    const estDate = estimateSolarDateForLunarAnniversary(r.lunarDay, r.lunarMonth, targetYear);
    const day = estDate.getDate();
    const month = estDate.getMonth() + 1;
    const daysDiff = getDaysDiff(estDate);

    events.push({
      id: `${r.id}_${targetYear}`,
      type: 'clan_ritual',
      title: r.title,
      subTitle: `Đại lễ Dòng họ ${params.settings.clanName} · ${getCanChiYear(targetYear)}`,
      date: estDate,
      day,
      month,
      year: targetYear,
      dateDisplay: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${targetYear} (Dương lịch)`,
      lunarDateDisplay: r.lunarDesc,
      description: r.desc,
      location: params.settings.ancestralHallLocation || 'Từ đường Dòng họ',
      milestoneBadge: 'Đại lễ Tông tộc',
      isToday: daysDiff === 0,
      isPassed: daysDiff < 0,
      daysRemaining: daysDiff,
    });
  }

  // -------------------------------------------------------------------------
  // 5. CURRENT YEAR LIFE EVENTS (Sự kiện cuộc đời trong năm mục tiêu)
  // -------------------------------------------------------------------------
  for (const evt of params.lifeEvents) {
    if (evt.date?.year !== targetYear) continue;

    const eMonth = evt.date.month || 1;
    const eDay = evt.date.day || 1;
    const eventDate = new Date(targetYear, eMonth - 1, eDay);
    const daysDiff = getDaysDiff(eventDate);
    const person = evt.personId ? peopleMap.get(evt.personId) : undefined;
    const branch = person?.branchId ? branchMap.get(person.branchId) : undefined;

    events.push({
      id: `life_${evt.id}_${targetYear}`,
      type: 'milestone',
      title: evt.title,
      subTitle: person ? `Sự kiện: ${person.fullName}` : 'Biến cố dòng họ',
      date: eventDate,
      day: eDay,
      month: eMonth,
      year: targetYear,
      dateDisplay: `${String(eDay).padStart(2, '0')}/${String(eMonth).padStart(2, '0')}/${targetYear}`,
      description: evt.description,
      location: evt.location,
      person,
      branch,
      milestoneBadge: 'Sự kiện ghi chép',
      isToday: daysDiff === 0,
      isPassed: daysDiff < 0,
      daysRemaining: daysDiff,
    });
  }

  // Sort events strictly chronologically: by month first, then day, then title
  events.sort((a, b) => {
    if (a.month !== b.month) return a.month - b.month;
    if (a.day !== b.day) return a.day - b.day;
    return a.title.localeCompare(b.title, 'vi');
  });

  // Group events by Month (1 to 12)
  const eventsByMonth = new Map<number, FamilyYearEvent[]>();
  for (let m = 1; m <= 12; m++) {
    eventsByMonth.set(m, []);
  }
  for (const evt of events) {
    const list = eventsByMonth.get(evt.month) || [];
    list.push(evt);
    eventsByMonth.set(evt.month, list);
  }

  // Calculate counts
  let birthdays = 0;
  let deathAnniversaries = 0;
  let weddings = 0;
  let rituals = 0;
  for (const evt of events) {
    if (evt.type === 'birthday') birthdays++;
    else if (evt.type === 'death_anniversary') deathAnniversaries++;
    else if (evt.type === 'wedding') weddings++;
    else rituals++;
  }

  // Find upcoming next event (daysRemaining >= 0, smallest daysRemaining)
  const upcomingList = events.filter((e) => e.daysRemaining >= 0).sort((a, b) => a.daysRemaining - b.daysRemaining);
  const upcomingNext = upcomingList[0] || null;

  return {
    targetYear,
    events,
    eventsByMonth,
    counts: {
      total: events.length,
      birthdays,
      deathAnniversaries,
      weddings,
      rituals,
    },
    upcomingNext,
  };
}
