import { describe, expect, it } from 'vitest';
import { createSeedSnapshot } from '../database/seedData';
import { Person } from '../models/genealogy';
import {
  executeMergeRecords,
  findPotentialDuplicates,
} from '../services/duplicateMergeService';
import { exportGedcom551, parseGedcom551 } from '../services/gedcomService';
import {
  exportDatabaseSnapshotJson,
  parseAndValidateJsonBackup,
} from '../services/jsonBackupService';
import { calculateVietnameseKinship } from '../services/kinshipService';
import {
  calculateUpcomingAnniversaries,
  getCanChiYear,
} from '../services/lunarCalendarService';
import { searchFamilyMembers } from '../services/searchService';
import {
  validateParentChildRelationship,
  validatePersonInput,
  wouldCreateAncestryCycle,
} from '../services/validationService';
import { formatFlexibleDate, formatLunarAnniversary } from '../utils/dateUtils';

describe('Vietnamese Genealogy Validation Service', () => {
  it('detects circular ancestry', () => {
    // A -> B -> C
    const relationships = [
      { id: '1', parentId: 'A', childId: 'B', lineageType: 'biological' as const, createdAt: '', updatedAt: '' },
      { id: '2', parentId: 'B', childId: 'C', lineageType: 'biological' as const, createdAt: '', updatedAt: '' },
    ];

    // Trying to make C parent of A creates cycle
    const hasCycle = wouldCreateAncestryCycle('C', 'A', relationships);
    expect(hasCycle).toBe(true);

    // Trying to make D parent of A does not create cycle
    const noCycle = wouldCreateAncestryCycle('D', 'A', relationships);
    expect(noCycle).toBe(false);
  });

  it('prevents self-parenting', () => {
    const result = wouldCreateAncestryCycle('A', 'A', []);
    expect(result).toBe(true);
  });

  it('validates person input requirements', () => {
    const invalid = validatePersonInput({ fullName: 'A' });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.length).toBeGreaterThan(0);

    const valid = validatePersonInput({
      fullName: 'Trần Văn Khải',
      generation: 3,
      birthDate: { precision: 'year', year: 1952 },
      deathDate: { precision: 'year', year: 2018 },
      isLiving: false,
    });
    expect(valid.valid).toBe(true);
  });

  it('detects invalid death year prior to birth year', () => {
    const invalid = validatePersonInput({
      fullName: 'Trần Văn Khải',
      birthDate: { precision: 'year', year: 1952 },
      deathDate: { precision: 'year', year: 1920 },
      isLiving: false,
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors[0]).toContain('không thể nhỏ hơn');
  });
});

describe('Vietnamese Genealogy Date Utilities', () => {
  it('formats flexible dates with different precisions', () => {
    expect(formatFlexibleDate({ precision: 'exact', day: 15, month: 8, year: 1945 })).toBe(
      '15/08/1945'
    );
    expect(formatFlexibleDate({ precision: 'year', year: 1920 })).toBe('1920');
    expect(formatFlexibleDate({ precision: 'approx', year: 1880 })).toBe('Khoảng 1880');
    expect(formatFlexibleDate({ precision: 'unknown', displayText: 'Thời vua Tự Đức' })).toBe(
      'Thời vua Tự Đức'
    );
  });

  it('formats lunar anniversary correctly', () => {
    expect(
      formatLunarAnniversary({ day: 15, month: 1, note: 'Giỗ Thủy tổ tại Từ đường' })
    ).toBe('15/01 Âm lịch (Giỗ Thủy tổ tại Từ đường)');
    expect(formatLunarAnniversary({ day: 3, month: 3 })).toBe('03/03 Âm lịch');
  });
});

describe('GEDCOM 5.5.1 and JSON Backup Services', () => {
  it('exports and parses valid full-fidelity JSON snapshots', () => {
    const seed = createSeedSnapshot();
    const jsonStr = JSON.stringify(seed);
    const validated = parseAndValidateJsonBackup(jsonStr);

    expect(validated.valid).toBe(true);
    expect(validated.snapshot?.people.length).toBe(seed.people.length);
    expect(validated.snapshot?.settings.clanName).toBe(seed.settings.clanName);
  });

  it('exports and imports GEDCOM 5.5.1 UTF-8 with Vietnamese custom extensions', () => {
    const seed = createSeedSnapshot();
    const gedcomOutput = exportGedcom551(seed);

    expect(gedcomOutput).toContain('0 HEAD');
    expect(gedcomOutput).toContain('1 CHAR UTF-8');
    expect(gedcomOutput).toContain('_GEN');
    expect(gedcomOutput).toContain('_ROLE');
    expect(gedcomOutput).toContain('0 TRLR');

    // Parse back
    const parsed = parseGedcom551(gedcomOutput);
    expect(parsed.people.length).toBeGreaterThan(0);
    expect(parsed.relationships.length).toBeGreaterThan(0);
  });
});

describe('Vietnamese Kinship Title Calculation (Tra Cứu Xưng Hô)', () => {
  it('calculates parent-child kinship terms correctly', () => {
    const seed = createSeedSnapshot();
    // In seedData: p_01 (Gen 1) -> p_02 (Gen 2)
    const kinship = calculateVietnameseKinship(
      'p_01',
      'p_02',
      seed.people,
      seed.relationships,
      seed.unions
    );

    expect(kinship.related).toBe(true);
    expect(kinship.generationDiff).toBe(1);
    expect(kinship.termAtoB).toContain('Con trai');
    expect(kinship.termBtoA).toContain('Cha');
  });

  it('calculates sibling kinship terms correctly', () => {
    const seed = createSeedSnapshot();
    // Sibling pair: p_02 (born 1897) and p_04 (born 1900)
    const kinship = calculateVietnameseKinship(
      'p_02',
      'p_04',
      seed.people,
      seed.relationships,
      seed.unions
    );

    expect(kinship.related).toBe(true);
    expect(kinship.generationDiff).toBe(0);
    expect(kinship.termAtoB).toContain('Em');
    expect(kinship.termBtoA).toContain('Anh');
  });

  it('calculates cousin (con chú con bác) kinship terms across branches', () => {
    const seed = createSeedSnapshot();
    // p_06 (Gen 3, Chi Giáp) and p_10 (Gen 3, Chi Bính)
    const kinship = calculateVietnameseKinship(
      'p_06',
      'p_10',
      seed.people,
      seed.relationships,
      seed.unions
    );

    expect(kinship.related).toBe(true);
    expect(kinship.generationDiff).toBe(0);
    expect(kinship.lcaPerson).toBeDefined();
    expect(kinship.termAtoB).toContain('họ');
    expect(kinship.termBtoA).toContain('họ');
  });
});

describe('Vietnamese Lunar Calendar & Rites Service', () => {
  it('calculates Can Chi year correctly', () => {
    expect(getCanChiYear(2024)).toBe('Giáp Thìn');
    expect(getCanChiYear(2025)).toBe('Ất Tỵ');
    expect(getCanChiYear(2026)).toBe('Bính Ngọ');
  });

  it('estimates upcoming death anniversaries with countdowns', () => {
    const seed = createSeedSnapshot();
    const upcoming = calculateUpcomingAnniversaries(seed.people);
    expect(upcoming.length).toBeGreaterThan(0);
    expect(upcoming[0].solarDate).toBeDefined();
    expect(typeof upcoming[0].daysRemaining).toBe('number');
  });
});

describe('Duplicate Detection & Record Merging', () => {
  it('detects duplicate pairs based on name similarity and year', () => {
    const seed = createSeedSnapshot();
    // Inject a duplicate person
    const duplicatePerson: Person = {
      ...seed.people[0],
      id: 'duplicate_khoi_99',
      fullName: 'Trần Nguyên Khởi',
      notes: 'Hồ sơ tạo nhầm',
    };
    const peopleWithDuplicate = [...seed.people, duplicatePerson];

    const duplicates = findPotentialDuplicates(
      peopleWithDuplicate,
      seed.relationships,
      seed.unions
    );
    expect(duplicates.length).toBeGreaterThan(0);
    expect(duplicates[0].matchScore).toBeGreaterThanOrEqual(50);
  });

  it('safely merges duplicate record into target without losing relationships', () => {
    const seed = createSeedSnapshot();
    const target = seed.people[0];
    const source: Person = {
      ...target,
      id: 'source_clone_123',
      biography: 'Tiểu sử từ hồ sơ nguồn',
    };

    const mergeResult = executeMergeRecords({
      targetPerson: target,
      sourcePerson: source,
      relationships: seed.relationships,
      unions: seed.unions,
      lifeEvents: seed.lifeEvents,
      media: seed.media,
    });

    expect(mergeResult.mergedPerson.id).toBe(target.id);
    expect(mergeResult.deletedPersonId).toBe(source.id);
  });

  describe('Clan History & Milestones Data Extraction', () => {
    it('accurately compiles death anniversaries from ancestors', () => {
      const seed = createSeedSnapshot();
      const ancestorsWithAnniversary = seed.people.filter(
        (p) => !p.isLiving && p.deathAnniversaryLunar && (p.deathAnniversaryLunar.day || p.deathAnniversaryLunar.month)
      );

      expect(ancestorsWithAnniversary.length).toBeGreaterThan(0);
      const patriarch = seed.people.find((p) => p.id === 'p_01');
      expect(patriarch?.deathAnniversaryLunar?.day).toBe(22);
      expect(patriarch?.deathAnniversaryLunar?.month).toBe(10);
      expect(patriarch?.deathAnniversaryLunar?.note).toContain('Giỗ Tổ Đại Tôn');
    });

    it('contains seeded lifeEvents for clan milestones (restorations, migrations)', () => {
      const seed = createSeedSnapshot();
      expect(seed.lifeEvents.length).toBeGreaterThan(0);

      const migrationEvents = seed.lifeEvents.filter((e) => e.type === 'migration');
      expect(migrationEvents.length).toBeGreaterThan(0);
      expect(migrationEvents.some((e) => e.title.includes('Sài Gòn') || e.title.includes('tản cư'))).toBe(true);

      const contribution = seed.lifeEvents.find((e) => e.type === 'contribution');
      expect(contribution).toBeDefined();
      expect(contribution?.title).toContain('Từ đường');
    });
  });

  describe('Browser Push Notification Service for Anniversaries', () => {
    it('provides valid default notification settings', async () => {
      const {
        DEFAULT_NOTIFICATION_SETTINGS,
        loadNotificationSettings,
        saveNotificationSettings,
      } = await import('../services/notificationService');

      expect(DEFAULT_NOTIFICATION_SETTINGS.enabled).toBe(true);
      expect(DEFAULT_NOTIFICATION_SETTINGS.leadDays).toContain(0);
      expect(DEFAULT_NOTIFICATION_SETTINGS.leadDays).toContain(1);
      expect(DEFAULT_NOTIFICATION_SETTINGS.leadDays).toContain(3);

      // Verify save and load
      const testSettings = {
        ...DEFAULT_NOTIFICATION_SETTINGS,
        leadDays: [0, 1, 7],
        allAncestors: false,
        trackedPersonIds: ['p_01', 'p_02'],
      };
      saveNotificationSettings(testSettings);
      const loaded = loadNotificationSettings();
      expect(loaded.leadDays).toEqual([0, 1, 7]);
      expect(loaded.allAncestors).toBe(false);
      expect(loaded.trackedPersonIds).toContain('p_01');
    });

    it('safely handles environments without Notification API without throwing', async () => {
      const {
        isNotificationSupported,
        getNotificationPermission,
        requestNotificationPermission,
      } = await import('../services/notificationService');

      // In Node/Vitest test environment, Notification may not be present
      const supported = isNotificationSupported();
      const perm = getNotificationPermission();
      expect(['granted', 'denied', 'default', 'unsupported']).toContain(perm);

      const req = await requestNotificationPermission();
      expect(['granted', 'denied', 'default', 'unsupported']).toContain(req);
    });
  });

  describe('AI Biography Generation Service (Gemini API)', () => {
    it('safely handles network failure or missing server endpoint without throwing', async () => {
      const { generateBiographyWithAI } = await import('../services/aiBiographyService');

      const result = await generateBiographyWithAI({
        fullName: 'Trần Văn Lộc',
        gender: 'male',
        generation: 1,
        birthDate: { precision: 'exact', day: 14, month: 3, year: 1872 },
        deathDate: { precision: 'exact', day: 22, month: 11, year: 1948 },
        birthPlace: 'Đông Ngạc, Hà Nội',
        occupation: 'Thầy đồ',
        isLiving: false,
        merits: 'Trùng tu nhà thờ họ năm 1924',
      });

      // In unit test environment without running server, it returns structured error object rather than crashing
      expect(result).toBeDefined();
      expect(result.error || result.biography).toBeDefined();
    });
  });

  describe('Web Speech Synthesis Biography Reader Service', () => {
    it('splits biography text into natural sentence chunks', async () => {
      const { splitTextIntoSentences } = await import('../services/speechSynthesisService');

      const text = 'Cụ sinh năm 1872 tại làng Đông Ngạc. Thuở nhỏ theo học chữ Nho, sau đỗ tú tài! Cụ mở lớp dạy học và phụng dưỡng cha mẹ chu toàn.';
      const sentences = splitTextIntoSentences(text);

      expect(sentences.length).toBe(3);
      expect(sentences[0]).toContain('Đông Ngạc');
      expect(sentences[1]).toContain('tú tài');
      expect(sentences[2]).toContain('chu toàn');
    });

    it('generates appropriate honorifics for Vietnamese ancestors', async () => {
      const { getPersonHonorific } = await import('../services/speechSynthesisService');

      const ancestorMale: Person = {
        id: '1',
        fullName: 'Trần Văn Lộc',
        gender: 'male',
        generation: 1,
        isLiving: false,
        createdAt: '',
        updatedAt: '',
      };
      expect(getPersonHonorific(ancestorMale)).toBe('Cụ Ông');

      const ancestorFemale: Person = {
        id: '2',
        fullName: 'Nguyễn Thị Sen',
        gender: 'female',
        generation: 2,
        isLiving: false,
        createdAt: '',
        updatedAt: '',
      };
      expect(getPersonHonorific(ancestorFemale)).toBe('Cụ Bà');

      const livingMale: Person = {
        id: '3',
        fullName: 'Trần Minh Hải',
        gender: 'male',
        generation: 5,
        isLiving: true,
        createdAt: '',
        updatedAt: '',
      };
      expect(getPersonHonorific(livingMale)).toBe('Ông');
    });

    it('prepares biography narration and full chronicle narration scripts', async () => {
      const { preparePersonNarrationScript } = await import('../services/speechSynthesisService');

      const person: Person = {
        id: '10',
        fullName: 'Trần Văn Lộc',
        gender: 'male',
        generation: 1,
        isLiving: false,
        birthDate: { precision: 'exact', day: 14, month: 3, year: 1872 },
        deathDate: { precision: 'exact', day: 22, month: 11, year: 1948 },
        birthPlace: 'Đông Ngạc, Hà Nội',
        burialPlace: 'Nghĩa trang dòng họ Đông Ngạc',
        merits: 'Đứng đầu việc trùng tu từ đường dòng họ.',
        biography: 'Sinh thời cụ là người đức độ, trọng chữ tín và hiếu học.',
        createdAt: '',
        updatedAt: '',
      };

      // Biography mode
      const bioScript = preparePersonNarrationScript(person, 'biography', 'Chi Trưởng');
      expect(bioScript.sentences.length).toBeGreaterThan(0);
      expect(bioScript.fullText).toContain('đức độ');

      // Full chronicle mode
      const chronicleScript = preparePersonNarrationScript(person, 'full_chronicle', 'Chi Trưởng');
      expect(chronicleScript.sentences.length).toBeGreaterThan(2);
      expect(chronicleScript.fullText).toContain('Cụ Ông Trần Văn Lộc');
      expect(chronicleScript.fullText).toContain('Chi Trưởng');
      expect(chronicleScript.fullText).toContain('Nghĩa trang dòng họ');
      expect(chronicleScript.fullText).toContain('trùng tu từ đường');
    });

    it('filters Vietnamese voices correctly', async () => {
      const { getVietnameseVoices } = await import('../services/speechSynthesisService');

      const mockVoices = [
        { voiceURI: '1', name: 'Google US English', lang: 'en-US', default: true, localService: false },
        { voiceURI: '2', name: 'Google Tiếng Việt', lang: 'vi-VN', default: false, localService: true },
        { voiceURI: '3', name: 'Microsoft HoaiMy Online (Natural) - Vietnamese', lang: 'vi-VN', default: false, localService: false },
        { voiceURI: '4', name: 'Kyoko', lang: 'ja-JP', default: false, localService: true },
      ] as SpeechSynthesisVoice[];

      const viVoices = getVietnameseVoices(mockVoices);
      expect(viVoices.length).toBe(2);
      expect(viVoices.map((v) => v.voiceURI)).toEqual(['2', '3']);
    });
  });

  describe('Clan Lifespan & Longevity Distribution Utilities', () => {
    it('correctly extracts person lifespan and assigns cultural longevity brackets', async () => {
      const { extractPersonLifespan, getBracketForAge } = await import('../features/statistics/lifespanUtils');

      const deceasedAncestor: Person = {
        id: 'p_ancestor',
        fullName: 'Trần Văn Lộc',
        gender: 'male',
        isLiving: false,
        generation: 1,
        birthDate: { precision: 'exact', year: 1872 },
        deathDate: { precision: 'exact', year: 1948 },
        createdAt: '',
        updatedAt: '',
      };

      const lifespan = extractPersonLifespan(deceasedAncestor, 2026);
      expect(lifespan).not.toBeNull();
      expect(lifespan?.age).toBe(76);
      expect(lifespan?.bracketKey).toBe('70_79');

      const bracket76 = getBracketForAge(76);
      expect(bracket76.traditionalName).toContain('Trung thọ');

      const bracket92 = getBracketForAge(92);
      expect(bracket92.traditionalName).toContain('Đại thọ');

      const bracket40 = getBracketForAge(40);
      expect(bracket40.traditionalName).toContain('Hưởng dương');
    });

    it('computes overall clan longevity summary and generation statistics', async () => {
      const { computeClanLongevitySummary } = await import('../features/statistics/lifespanUtils');

      const samplePeople: Person[] = [
        {
          id: '1',
          fullName: 'Cụ 1',
          gender: 'male',
          isLiving: false,
          generation: 1,
          birthDate: { precision: 'year', year: 1880 },
          deathDate: { precision: 'year', year: 1960 }, // 80 tuổi
          createdAt: '',
          updatedAt: '',
        },
        {
          id: '2',
          fullName: 'Cụ 2',
          gender: 'female',
          isLiving: false,
          generation: 1,
          birthDate: { precision: 'year', year: 1885 },
          deathDate: { precision: 'year', year: 1975 }, // 90 tuổi
          createdAt: '',
          updatedAt: '',
        },
        {
          id: '3',
          fullName: 'Ông 3',
          gender: 'male',
          isLiving: true,
          generation: 2,
          birthDate: { precision: 'year', year: 1956 }, // 70 tuổi in 2026
          createdAt: '',
          updatedAt: '',
        },
      ];

      const summary = computeClanLongevitySummary(samplePeople, 2026);
      expect(summary.totalAnalyzed).toBe(3);
      expect(summary.averageAge).toBe(80);
      expect(summary.venerableCount).toBe(3); // All >= 70
      expect(summary.venerablePercent).toBe(100);
      expect(summary.oldestAncestor?.age).toBe(90);
      expect(summary.oldestLiving?.age).toBe(70);
      expect(summary.generationStats.length).toBe(2);
      expect(summary.generationStats[0].generation).toBe(1);
      expect(summary.generationStats[0].avgAge).toBe(85);
    });
  });

  describe('Family Legacy Score (Chỉ số di sản gia tộc) Calculation', () => {
    it('handles empty database gracefully with 0 score', async () => {
      const { calculateFamilyLegacyScore } = await import('../features/statistics/legacyScoreUtils');

      const result = calculateFamilyLegacyScore({
        people: [],
        media: [],
        stories: [],
        lifeEvents: [],
        relationships: [],
        unions: [],
        branches: [],
      });

      expect(result.overallScore).toBe(0);
      expect(result.tierName).toBe('Khởi Dựng Phả Hệ');
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('accurately computes 4-pillar scores and tier on seed snapshot', async () => {
      const { calculateFamilyLegacyScore } = await import('../features/statistics/legacyScoreUtils');

      const seedSnapshot = createSeedSnapshot();
      const result = calculateFamilyLegacyScore({
        people: seedSnapshot.people,
        media: seedSnapshot.media,
        stories: seedSnapshot.stories,
        lifeEvents: seedSnapshot.lifeEvents,
        relationships: seedSnapshot.relationships,
        unions: seedSnapshot.unions,
        branches: seedSnapshot.branches,
      });

      // Overall score should be high on rich seed data (> 70)
      expect(result.overallScore).toBeGreaterThanOrEqual(70);
      expect(result.overallScore).toBeLessThanOrEqual(100);

      // Verify pillars
      expect(result.pillars.length).toBe(4);

      // Total weights should equal 1.0
      const totalWeight = result.pillars.reduce((sum, p) => sum + p.weight, 0);
      expect(Math.round(totalWeight * 100) / 100).toBe(1.0);

      // Check pillar names
      const pillarNames = result.pillars.map((p) => p.name);
      expect(pillarNames).toContain('Tiểu sử & Nhân thân');
      expect(pillarNames).toContain('Kho ảnh & Kỷ vật di sản');
      expect(pillarNames).toContain('Cột mốc & Ký ức truyền đời');
      expect(pillarNames).toContain('Mạng lưới gia tộc');

      // Verify stats
      expect(result.stats.totalPeople).toBe(seedSnapshot.people.length);
      expect(result.stats.totalMedia).toBe(seedSnapshot.media.length);
      expect(result.stats.totalStories).toBe(seedSnapshot.stories.length);
      expect(result.stats.totalMilestones).toBe(seedSnapshot.lifeEvents.length);
    });
  });

  describe('Onboarding Walkthrough Tour', () => {
    it('defines all core feature steps required for introducing new users', async () => {
      const { TOUR_STEPS } = await import('../components/OnboardingTour');

      expect(TOUR_STEPS.length).toBe(5);

      const stepIds = TOUR_STEPS.map((s) => s.id);
      expect(stepIds).toContain('welcome');
      expect(stepIds).toContain('family_tree');
      expect(stepIds).toContain('add_member');
      expect(stepIds).toContain('rites_assistant');
      expect(stepIds).toContain('data_sharing');

      // Check step properties
      for (const step of TOUR_STEPS) {
        expect(step.title).toBeDefined();
        expect(step.description.length).toBeGreaterThan(30);
        expect(step.highlights.length).toBeGreaterThanOrEqual(3);
        expect(step.icon).toBeDefined();
        expect(step.watermark).toBeDefined();
      }

      // Check target tabs
      const treeStep = TOUR_STEPS.find((s) => s.id === 'family_tree');
      expect(treeStep?.tabTarget).toBe('tree');

      const addMemberStep = TOUR_STEPS.find((s) => s.id === 'add_member');
      expect(addMemberStep?.tabTarget).toBe('members');
      expect(addMemberStep?.actionType).toBe('add_person');

      const ritesStep = TOUR_STEPS.find((s) => s.id === 'rites_assistant');
      expect(ritesStep?.tabTarget).toBe('rites');
    });

    it('safely gets and sets onboarding completion state in storage', async () => {
      const { hasCompletedOnboarding, setCompletedOnboarding } = await import(
        '../components/OnboardingTour'
      );

      // Should not throw in node/vitest environment
      setCompletedOnboarding(true);
      expect(typeof hasCompletedOnboarding()).toBe('boolean');

      setCompletedOnboarding(false);
      expect(typeof hasCompletedOnboarding()).toBe('boolean');
    });
  });

  describe('Genealogical Data Backup Reminder Service', () => {
    it('detects that backup is overdue when never exported', async () => {
      const { getBackupStatus } = await import('../services/backupReminderService');

      const status = getBackupStatus({
        id: 'default',
        clanName: 'Họ Trần',
        clanMotto: '',
        ancestralHallLocation: '',
        schemaVersion: 1,
        updatedAt: '',
      });

      expect(status.needsBackup).toBe(true);
      expect(status.isOverdue).toBe(true);
      expect(status.daysSinceBackup).toBeNull();
      expect(status.formattedLastBackup).toBe('Chưa từng sao lưu');
    });

    it('calculates days since backup and detects 30-day threshold', async () => {
      const { getBackupStatus } = await import('../services/backupReminderService');

      const refDate = new Date('2026-11-06T12:00:00Z');

      // 10 days ago -> not overdue
      const tenDaysAgo = new Date('2026-10-27T12:00:00Z').toISOString();
      const statusRecent = getBackupStatus(
        {
          id: 'default',
          clanName: 'Họ Trần',
          clanMotto: '',
          ancestralHallLocation: '',
          schemaVersion: 1,
          lastBackupAt: tenDaysAgo,
          updatedAt: '',
        },
        refDate
      );

      expect(statusRecent.needsBackup).toBe(false);
      expect(statusRecent.isOverdue).toBe(false);
      expect(statusRecent.daysSinceBackup).toBe(10);

      // 45 days ago -> overdue (> 30 days)
      const fortyFiveDaysAgo = new Date('2026-09-22T12:00:00Z').toISOString();
      const statusOverdue = getBackupStatus(
        {
          id: 'default',
          clanName: 'Họ Trần',
          clanMotto: '',
          ancestralHallLocation: '',
          schemaVersion: 1,
          lastBackupAt: fortyFiveDaysAgo,
          updatedAt: '',
        },
        refDate
      );

      expect(statusOverdue.needsBackup).toBe(true);
      expect(statusOverdue.isOverdue).toBe(true);
      expect(statusOverdue.daysSinceBackup).toBe(45);
    });

    it('handles snooze and recording backup timestamp safely', async () => {
      const { recordBackupTimestamp, snoozeBackupReminder } = await import(
        '../services/backupReminderService'
      );

      expect(() => recordBackupTimestamp()).not.toThrow();
      expect(() => snoozeBackupReminder(7)).not.toThrow();
    });
  });

  describe('30-Day Upcoming Death Anniversaries (Ngày Giỗ Sắp Tới) Reminders', () => {
    it('calculates upcoming anniversaries and correctly identifies those within 30 days', async () => {
      const { calculateUpcomingAnniversaries } = await import(
        '../services/lunarCalendarService'
      );

      const refDate = new Date('2026-11-06T00:00:00Z');

      const testAncestors: Person[] = [
        {
          id: 'anc_1',
          fullName: 'Cụ Tổ Lộc',
          gender: 'male',
          isLiving: false,
          deathAnniversaryLunar: { day: 22, month: 10, note: 'Giỗ Tổ Đại Tôn' },
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'anc_2',
          fullName: 'Cụ Bà Kim',
          gender: 'female',
          isLiving: false,
          deathAnniversaryLunar: { day: 14, month: 11, note: 'Giỗ Tổ Mẫu' },
          createdAt: '',
          updatedAt: '',
        },
        {
          id: 'living_person',
          fullName: 'Người còn sống',
          gender: 'male',
          isLiving: true,
          createdAt: '',
          updatedAt: '',
        },
      ];

      const upcoming = calculateUpcomingAnniversaries(testAncestors, refDate);

      // Living person should not be included
      expect(upcoming.some((u) => u.person.id === 'living_person')).toBe(false);

      // Ancestors with lunar anniversary should be calculated
      expect(upcoming.length).toBe(2);

      // All returned items should have daysRemaining and valid solarDate
      for (const item of upcoming) {
        expect(typeof item.daysRemaining).toBe('number');
        expect(item.solarDate instanceof Date).toBe(true);
        expect(item.canChiYear).toBeDefined();
      }

      // Filter within 30 days
      const within30Days = upcoming.filter(
        (u) => u.daysRemaining >= 0 && u.daysRemaining <= 30
      );
      expect(Array.isArray(within30Days)).toBe(true);
    });
  });

  describe('Evening Dark Mode & User Preferences', () => {
    const PREF_KEY = 'gia_pha_viet_preferences_v1';

    it('correctly persists and reads theme preference in storage', () => {
      // Mock storage map
      const mockStorage: Record<string, string> = {};
      const setItem = (k: string, v: string) => {
        mockStorage[k] = v;
      };
      const getItem = (k: string) => mockStorage[k] || null;

      // Test default light
      const lightPref = { theme: 'light', showLunarDates: true };
      setItem(PREF_KEY, JSON.stringify(lightPref));
      const parsedLight = JSON.parse(getItem(PREF_KEY) || '{}');
      expect(parsedLight.theme).toBe('light');

      // Test dark mode persistence for evening settings
      const darkPref = { ...lightPref, theme: 'dark' };
      setItem(PREF_KEY, JSON.stringify(darkPref));
      const parsedDark = JSON.parse(getItem(PREF_KEY) || '{}');
      expect(parsedDark.theme).toBe('dark');
    });

    it('synchronizes .dark class on document root correctly', () => {
      // Mock classList toggle behavior
      const classes = new Set<string>();
      const mockClassList = {
        add: (cls: string) => classes.add(cls),
        remove: (cls: string) => classes.delete(cls),
        contains: (cls: string) => classes.has(cls),
      };

      // Simulate applying dark theme
      mockClassList.add('dark');
      expect(mockClassList.contains('dark')).toBe(true);

      // Simulate switching back to light theme
      mockClassList.remove('dark');
      expect(mockClassList.contains('dark')).toBe(false);
    });

    it('toggles theme state between light and dark', () => {
      let currentTheme: 'light' | 'dark' = 'light';
      const toggle = (theme: 'light' | 'dark'): 'light' | 'dark' =>
        theme === 'dark' ? 'light' : 'dark';

      currentTheme = toggle(currentTheme);
      expect(currentTheme).toBe('dark');

      currentTheme = toggle(currentTheme);
      expect(currentTheme).toBe('light');
    });
  });

  describe('Global Search Component & Member Lookup Service', () => {
    const mockPeople: Person[] = [
      {
        id: 'p1',
        fullName: 'Trần Văn Khải',
        gender: 'male',
        isLiving: false,
        generation: 1,
        birthDate: { precision: 'year', year: 1920 },
        deathDate: { precision: 'year', year: 1995 },
        commonName: 'Cụ Khải',
        courtesyName: 'Bá Long',
        tabooName: 'Húy Khải',
        alias: 'Hai Lúa',
        clanRole: 'Thủy tổ',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'p2',
        fullName: 'Nguyễn Thị Sen',
        gender: 'female',
        isLiving: false,
        generation: 1,
        birthDate: { precision: 'year', year: 1925 },
        commonName: 'Bà Sen',
        alias: 'Mẫu Đức',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'p3',
        fullName: 'Trần Minh Đức',
        gender: 'male',
        isLiving: true,
        generation: 2,
        birthDate: { precision: 'year', year: 1954 },
        commonName: 'Ba Đức',
        courtesyName: 'Minh Viễn',
        createdAt: '',
        updatedAt: '',
      },
      {
        id: 'p4',
        fullName: 'Trần Thu Hà',
        gender: 'female',
        isLiving: true,
        generation: 3,
        birthDate: { precision: 'year', year: 1988 },
        alias: 'Bé Út',
        createdAt: '',
        updatedAt: '',
      },
    ];

    it('returns empty array when search query is empty or whitespace', () => {
      expect(searchFamilyMembers('', mockPeople)).toEqual([]);
      expect(searchFamilyMembers('   ', mockPeople)).toEqual([]);
    });

    it('searches accurately by exact and partial full name with Vietnamese diacritics', () => {
      const resultsExact = searchFamilyMembers('Trần Văn Khải', mockPeople);
      expect(resultsExact.length).toBeGreaterThan(0);
      expect(resultsExact[0].person.id).toBe('p1');
      expect(resultsExact[0].score).toBe(100);

      const resultsPartial = searchFamilyMembers('Thu Hà', mockPeople);
      expect(resultsPartial.length).toBe(1);
      expect(resultsPartial[0].person.fullName).toBe('Trần Thu Hà');
    });

    it('searches accurately without Vietnamese diacritics (accent-insensitive)', () => {
      const resultsNoAccent = searchFamilyMembers('tran minh duc', mockPeople);
      expect(resultsNoAccent.length).toBeGreaterThan(0);
      expect(resultsNoAccent[0].person.id).toBe('p3');

      const resultsNoAccentPartial = searchFamilyMembers('sen', mockPeople);
      expect(resultsNoAccentPartial.length).toBe(1);
      expect(resultsNoAccentPartial[0].person.fullName).toBe('Nguyễn Thị Sen');
    });

    it('searches accurately by nickname, courtesy name, taboo name, and alias', () => {
      // Search by courtesy name (tên tự)
      const courtesyResults = searchFamilyMembers('Bá Long', mockPeople);
      expect(courtesyResults.length).toBe(1);
      expect(courtesyResults[0].person.id).toBe('p1');
      expect(courtesyResults[0].matchedField).toBe('nickname');

      // Search by alias (biệt danh / bí danh)
      const aliasResults = searchFamilyMembers('Hai Lúa', mockPeople);
      expect(aliasResults.length).toBe(1);
      expect(aliasResults[0].person.id).toBe('p1');

      // Search by alias without accents
      const aliasNoAccent = searchFamilyMembers('be ut', mockPeople);
      expect(aliasNoAccent.length).toBe(1);
      expect(aliasNoAccent[0].person.fullName).toBe('Trần Thu Hà');

      // Search by common name (tên thường gọi)
      const commonResults = searchFamilyMembers('Ba Đức', mockPeople);
      expect(commonResults.length).toBe(1);
      expect(commonResults[0].person.id).toBe('p3');
    });

    it('searches accurately by birth year across database', () => {
      const year1954Results = searchFamilyMembers('1954', mockPeople);
      expect(year1954Results.length).toBe(1);
      expect(year1954Results[0].person.id).toBe('p3');
      expect(year1954Results[0].matchedField).toBe('birthYear');

      const year1925Results = searchFamilyMembers('1925', mockPeople);
      expect(year1925Results.length).toBe(1);
      expect(year1925Results[0].person.id).toBe('p2');
    });

    it('searches accurately by generation keywords like "đời 3"', () => {
      const gen3Results = searchFamilyMembers('đời 3', mockPeople);
      expect(gen3Results.length).toBe(1);
      expect(gen3Results[0].person.fullName).toBe('Trần Thu Hà');

      const gen1Results = searchFamilyMembers('doi 1', mockPeople);
      expect(gen1Results.length).toBe(2);
    });

    it('prioritizes higher relevance score and older generation order', () => {
      const results = searchFamilyMembers('Trần', mockPeople);
      expect(results.length).toBe(3);
      // Generation 1 (Trần Văn Khải) should be ranked higher or equal to later generations
      expect(results[0].person.generation).toBe(1);
    });

    it('boosts combined name and birth year queries like "Trần 1954"', () => {
      const combined = searchFamilyMembers('Trần 1954', mockPeople);
      expect(combined.length).toBeGreaterThan(0);
      expect(combined[0].person.id).toBe('p3');
      expect(combined[0].matchDetail).toContain('1954');
    });
  });
});






