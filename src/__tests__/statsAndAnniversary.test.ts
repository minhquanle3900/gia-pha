import { describe, expect, it } from 'vitest';
import { DeathAnniversaryReminder, UpcomingAnniversariesWidget } from '../features/rites/UpcomingAnniversariesWidget';
import { Person } from '../models/genealogy';
import { calculateUpcomingAnniversaries } from '../services/lunarCalendarService';

describe('Stats & Death Anniversary Reminder (Nhắc nhở ngày giỗ 30 ngày)', () => {
  it('UpcomingAnniversariesWidget is also exported as DeathAnniversaryReminder', () => {
    expect(DeathAnniversaryReminder).toBeDefined();
    expect(DeathAnniversaryReminder).toBe(UpcomingAnniversariesWidget);
  });

  it('correctly filters death anniversaries within 30 days window', () => {
    const today = new Date(2026, 10, 12); // Nov 12, 2026

    // Create mock deceased persons with lunar death anniversaries
    const mockPeople: Person[] = [
      {
        id: 'p1',
        fullName: 'Trần Văn Lộc',
        gender: 'male',
        isLiving: false,
        deathAnniversaryLunar: {
          day: 22,
          month: 10,
          note: 'Chính kỵ',
        },
        generation: 3,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'p2',
        fullName: 'Trần Văn Phúc',
        gender: 'male',
        isLiving: false,
        deathAnniversaryLunar: {
          day: 2,
          month: 11,
        },
        generation: 4,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 'p3',
        fullName: 'Người còn sống',
        gender: 'male',
        isLiving: true,
        generation: 5,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ];

    const upcoming = calculateUpcomingAnniversaries(mockPeople, today);
    // filter within 30 days
    const within30Days = upcoming.filter(
      (item) => item.daysRemaining >= 0 && item.daysRemaining <= 30
    );

    expect(within30Days.length).toBeGreaterThanOrEqual(1);
    expect(within30Days.some((item) => item.person.fullName === 'Trần Văn Lộc')).toBe(true);
    // living person must not appear in death anniversaries
    expect(within30Days.some((item) => item.person.fullName === 'Người còn sống')).toBe(false);
  });

  it('computes generation distribution and gender ratio for demographic stats', () => {
    const samplePeople: Person[] = [
      { id: '1', fullName: 'Cụ Tổ', gender: 'male', isLiving: false, generation: 1, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      { id: '2', fullName: 'Bà Tổ', gender: 'female', isLiving: false, generation: 1, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      { id: '3', fullName: 'Bác Trưởng', gender: 'male', isLiving: true, generation: 2, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      { id: '4', fullName: 'Cô Hai', gender: 'female', isLiving: true, generation: 2, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      { id: '5', fullName: 'Chú Ba', gender: 'male', isLiving: true, generation: 2, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
    ];

    // Compute generation stats
    const genCounts: Record<number, { male: number; female: number; total: number }> = {};
    for (const p of samplePeople) {
      const g = p.generation || 1;
      if (!genCounts[g]) genCounts[g] = { male: 0, female: 0, total: 0 };
      genCounts[g].total++;
      if (p.gender === 'male') genCounts[g].male++;
      if (p.gender === 'female') genCounts[g].female++;
    }

    expect(genCounts[1].total).toBe(2);
    expect(genCounts[1].male).toBe(1);
    expect(genCounts[1].female).toBe(1);

    expect(genCounts[2].total).toBe(3);
    expect(genCounts[2].male).toBe(2);
    expect(genCounts[2].female).toBe(1);

    // Gender ratio
    const totalMale = samplePeople.filter((p) => p.gender === 'male').length;
    const totalFemale = samplePeople.filter((p) => p.gender === 'female').length;
    expect(totalMale).toBe(3);
    expect(totalFemale).toBe(2);
    const maleRatio = Math.round((totalMale / samplePeople.length) * 100);
    expect(maleRatio).toBe(60);
  });
});
