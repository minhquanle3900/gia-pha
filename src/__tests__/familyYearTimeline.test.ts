import { describe, expect, it } from 'vitest';
import { createSeedSnapshot } from '../database/seedData';
import {
  buildFamilyYearTimeline,
  getLongevityMilestone,
  getWeddingMilestone,
} from '../services/familyYearTimelineService';

describe('Family Year Timeline Service (Annual Chronological Events)', () => {
  const seed = createSeedSnapshot();

  it('calculates wedding milestones correctly', () => {
    expect(getWeddingMilestone(50)).toBe('Đám cưới Vàng (50 năm)');
    expect(getWeddingMilestone(25)).toBe('Đám cưới Bạc (25 năm)');
    expect(getWeddingMilestone(10)).toBe('Kỷ niệm 10 năm (Đám cưới Thiếc)');
    expect(getWeddingMilestone(1)).toBe('Kỷ niệm 1 năm (Đám cưới Giấy)');
    expect(getWeddingMilestone(60)).toBe('Đám cưới Kim cương (60 năm)');
    expect(getWeddingMilestone(12)).toBe('Kỷ niệm 12 năm');
  });

  it('calculates traditional longevity milestones for birthdays', () => {
    expect(getLongevityMilestone(70)).toBe('Trung thọ / Thất tuần (70 tuổi)');
    expect(getLongevityMilestone(80)).toBe('Thượng thọ / Bát tuần (80 tuổi)');
    expect(getLongevityMilestone(85)).toBe('Đại thọ (85 tuổi)');
    expect(getLongevityMilestone(90)).toBe('Thượng thượng thọ (90 tuổi)');
    expect(getLongevityMilestone(100)).toBe('Bách niên giai lão (100 tuổi)');
    expect(getLongevityMilestone(18)).toBe('Tuổi trưởng thành (18 tuổi)');
    expect(getLongevityMilestone(35)).toBeUndefined();
  });

  it('builds chronological family events for the current year', () => {
    const timeline = buildFamilyYearTimeline({
      people: seed.people,
      unions: seed.unions,
      lifeEvents: seed.lifeEvents,
      branches: seed.branches,
      settings: seed.settings,
      targetYear: 2026,
      referenceDate: new Date(2026, 0, 1),
    });

    expect(timeline.targetYear).toBe(2026);
    expect(timeline.events.length).toBeGreaterThan(0);
    expect(timeline.counts.birthdays).toBeGreaterThan(0);
    expect(timeline.counts.deathAnniversaries).toBeGreaterThan(0);
    expect(timeline.counts.weddings).toBeGreaterThan(0);
    expect(timeline.counts.rituals).toBeGreaterThan(0);

    // Verify chronological order (months and days)
    for (let i = 0; i < timeline.events.length - 1; i++) {
      const a = timeline.events[i];
      const b = timeline.events[i + 1];
      expect(a.month <= b.month).toBe(true);
      if (a.month === b.month) {
        expect(a.day <= b.day).toBe(true);
      }
    }

    // Verify month groupings
    for (let m = 1; m <= 12; m++) {
      const monthEvts = timeline.eventsByMonth.get(m) || [];
      monthEvts.forEach((evt) => {
        expect(evt.month).toBe(m);
      });
    }
  });

  it('finds weddings with anniversary years and partners', () => {
    const timeline = buildFamilyYearTimeline({
      people: seed.people,
      unions: seed.unions,
      lifeEvents: seed.lifeEvents,
      branches: seed.branches,
      settings: seed.settings,
      targetYear: 2026,
    });

    const weddings = timeline.events.filter((e) => e.type === 'wedding');
    expect(weddings.length).toBeGreaterThan(0);

    const goldOrSilverWedding = weddings.find((w) => w.ageOrYears && w.ageOrYears >= 25);
    expect(goldOrSilverWedding).toBeDefined();
    expect(goldOrSilverWedding?.title).toBeDefined();
    expect(goldOrSilverWedding?.milestoneBadge).toBeDefined();
  });

  it('includes death anniversaries with lunar representations', () => {
    const timeline = buildFamilyYearTimeline({
      people: seed.people,
      unions: seed.unions,
      lifeEvents: seed.lifeEvents,
      branches: seed.branches,
      settings: seed.settings,
      targetYear: 2026,
    });

    const deathAnniversaries = timeline.events.filter((e) => e.type === 'death_anniversary');
    expect(deathAnniversaries.length).toBeGreaterThan(0);

    const withLunar = deathAnniversaries.find((d) => d.lunarDateDisplay !== undefined);
    expect(withLunar).toBeDefined();
    expect(withLunar?.lunarDateDisplay).toContain('Âm lịch');
  });
});
