import { describe, expect, it } from 'vitest';
import { FamilyStory } from '../models/genealogy';
import { JOURNAL_CATEGORY_META } from '../features/journal/ClanJournalModal';

describe('Clan Journal (Nhật ký dòng họ)', () => {
  it('supports entries with no individual person attached (communal clan records)', () => {
    const communalEntry: FamilyStory = {
      id: 'story_clan_rebuild',
      title: 'Đại tu nhà thờ họ và đúc chuông đồng',
      summary: 'Toàn thể con cháu các chi chung tay góp công đức tôn tạo từ đường.',
      content: 'Vào mùa xuân năm Giáp Ngọ, tộc biểu đã tổ chức đại lễ đặt đá trùng tu từ đường...',
      periodLabel: 'Năm 2014',
      recordedBy: 'Ban Trị Sự Tộc Biểu',
      personIds: [], // Independent from any specific person
      mediaIds: [],
      branchId: 'branch_root',
      category: 'renovation_merit',
      location: 'Nhà thờ họ Đại Tôn, Làng Trà Đông',
      isPinned: true,
      tags: ['Trùng tu', 'Công đức', 'Chuông đồng'],
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    expect(communalEntry.personIds).toHaveLength(0);
    expect(communalEntry.category).toBe('renovation_merit');
    expect(communalEntry.isPinned).toBe(true);
    expect(communalEntry.tags).toContain('Trùng tu');
  });

  it('defines metadata for all standard clan journal categories', () => {
    const categories = [
      'historical_event',
      'clan_memory',
      'renovation_merit',
      'communal_rule',
      'general_note',
    ] as const;

    categories.forEach((cat) => {
      const meta = JOURNAL_CATEGORY_META[cat];
      expect(meta).toBeDefined();
      expect(meta.label).toBeTruthy();
      expect(meta.description).toBeTruthy();
      expect(meta.badgeTone).toBeTruthy();
    });
  });

  it('correctly filters journal entries by category, search term, and pinned priority', () => {
    const sampleStories: FamilyStory[] = [
      {
        id: 's1',
        title: 'Quy ước mừng thọ hàng năm của dòng họ',
        summary: 'Các quy định về tổ chức thượng thọ cho các cụ từ 70 tuổi trở lên.',
        content: 'Mỗi dịp xuân về vào ngày mùng 4 Tết...',
        category: 'communal_rule',
        personIds: [],
        mediaIds: [],
        isPinned: false,
        createdAt: '2026-02-01T00:00:00Z',
        updatedAt: '2026-02-01T00:00:00Z',
      },
      {
        id: 's2',
        title: 'Sự kiện khai hoang lập nghiệp thế kỷ 18',
        summary: 'Các cụ tiền hiền vào phương Nam lập ấp mở cõi.',
        content: 'Theo gia phả cổ để lại...',
        category: 'historical_event',
        personIds: [],
        mediaIds: [],
        isPinned: true,
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
      {
        id: 's3',
        title: 'Họp mặt đại gia đình xuân Bính Thân',
        summary: 'Kỷ niệm sum họp hơn 200 con cháu khắp ba miền.',
        content: 'Một ngày hội ngộ đầy xúc động...',
        category: 'clan_memory',
        personIds: [],
        mediaIds: [],
        isPinned: false,
        createdAt: '2026-03-01T00:00:00Z',
        updatedAt: '2026-03-01T00:00:00Z',
      },
    ];

    // Filter by category
    const historical = sampleStories.filter(
      (s) => s.category === 'historical_event'
    );
    expect(historical).toHaveLength(1);
    expect(historical[0].id).toBe('s2');

    // Filter by keyword search (case-insensitive)
    const keyword = 'mừng thọ';
    const searched = sampleStories.filter(
      (s) =>
        s.title.toLowerCase().includes(keyword.toLowerCase()) ||
        (s.summary && s.summary.toLowerCase().includes(keyword.toLowerCase()))
    );
    expect(searched).toHaveLength(1);
    expect(searched[0].id).toBe('s1');

    // Pinned sort: pinned entries appear first
    const sorted = [...sampleStories].sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    expect(sorted[0].id).toBe('s2'); // Pinned story s2 comes first even though s3 has later date
  });
});
