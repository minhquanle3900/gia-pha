import { describe, expect, it } from 'vitest';
import { buildExhibitionCatalog } from '../features/gallery/exhibitionCatalog';
import type { RoomId } from '../features/gallery/exhibitionCatalog';
import type { FamilyStory, Media, MediaCategory } from '../models/genealogy';

const date = '2024-01-01T00:00:00Z';

function makeMedia(id: string, category: MediaCategory): Media {
  return {
    id,
    title: `Hiện vật thử nghiệm ${id}`,
    dataUrl: 'data:image/png;base64,',
    mimeType: 'image/png',
    category,
    personIds: [],
    createdAt: date,
    updatedAt: date,
  };
}

function makeStory(id: string, overrides: Partial<FamilyStory> = {}): FamilyStory {
  return {
    id,
    title: `Ghi chép thử nghiệm ${id}`,
    content: 'Bản ghi tổng hợp dùng cho kiểm thử.',
    personIds: [],
    mediaIds: [],
    createdAt: date,
    updatedAt: date,
    ...overrides,
  };
}

describe('Exhibition catalog', () => {
  it('shows the two reference couplets without adding any family records', () => {
    const { rooms, featured } = buildExhibitionCatalog([], []);

    expect(rooms.calligraphy).toMatchObject([
      {
        kind: 'reference',
        lines: [
          'Tổ tông công đức thiên niên thịnh',
          'Con cháu thảo hiền vạn đại vinh',
        ],
      },
      {
        kind: 'reference',
        lines: [
          'Cựu niên tài lộc đa phúc đức',
          'Tân xuân phú quý thọ khang ninh',
        ],
      },
    ]);
    expect(rooms.photos).toEqual([]);
    expect(rooms.artifacts).toEqual([]);
    expect(rooms.precepts).toEqual([]);
    expect(rooms.memories).toEqual([]);
    expect(featured).toEqual([rooms.calligraphy[0]]);
  });

  it.each<[MediaCategory, RoomId]>([
    ['portrait', 'photos'],
    ['historical_photo', 'photos'],
    ['document', 'artifacts'],
    ['certificate', 'artifacts'],
    ['letter', 'artifacts'],
    ['record', 'artifacts'],
    ['audio', 'memories'],
  ])('projects media category %s to %s using the original record', (category, room) => {
    const media = Object.freeze(makeMedia('a', category));
    const { rooms } = buildExhibitionCatalog(Object.freeze([media]), []);
    const [entry] = rooms[room];

    expect(entry).toMatchObject({ kind: 'media', key: 'media:a', room, title: media.title });
    expect(entry.kind === 'media' && entry.media).toBe(media);
  });

  it.each<[string, RoomId]>([
    ['  THƯ PHÁP ', 'calligraphy'],
    ['CAU   DOI', 'calligraphy'],
    ['Ảnh gia tộc', 'photos'],
    ['hien vat', 'artifacts'],
    ['Kỷ vật', 'artifacts'],
    ['gia  phong', 'precepts'],
    ['Gia huấn', 'precepts'],
    ['nghi le', 'memories'],
    ['Ký ức', 'memories'],
  ])('uses the whole tag "%s" to override the story category', (tag, room) => {
    const story = makeStory('a', { category: 'historical_event', tags: [tag, 'không phân loại'] });
    const { rooms } = buildExhibitionCatalog([], [story]);
    const entry = rooms[room].find(({ key }) => key === 'story:a');

    expect(entry).toMatchObject({ kind: 'story', room });
    expect(entry?.kind === 'story' && entry.story).toBe(story);
  });

  it('classifies legacy stories and ignores title and partial tag matches', () => {
    const legacy = makeStory('legacy', { title: 'Thư pháp', tags: ['truyền thống thư pháp'] });
    const rules = makeStory('rules', { category: 'communal_rule' });
    const { rooms } = buildExhibitionCatalog([], [legacy, rules]);

    expect(rooms.calligraphy).toHaveLength(2);
    expect(rooms.memories.map(({ key }) => key)).toEqual(['story:legacy']);
    expect(rooms.precepts.map(({ key }) => key)).toEqual(['story:rules']);
  });

  it('keeps source arrays unchanged and limits deterministic featured selection', () => {
    const pinned = Object.freeze([
      makeStory('b', { isPinned: true }),
      makeStory('a', { isPinned: true }),
      makeStory('newer', { isPinned: true, createdAt: '2024-02-01T00:00:00Z' }),
    ]);
    const media = Object.freeze([makeMedia('a', 'historical_photo')]);
    const { rooms, featured } = buildExhibitionCatalog(media, pinned);

    expect(pinned.map(({ id }) => id)).toEqual(['b', 'a', 'newer']);
    expect(rooms.memories.map(({ key }) => key)).toEqual(['story:newer', 'story:a', 'story:b']);
    expect(rooms.photos.map(({ key }) => key)).toEqual(['media:a']);
    expect(featured.map(({ key }) => key)).toEqual([
      'story:newer',
      'story:a',
      'reference:ancestral-merit',
    ]);
  });

  it('features distinct rooms when the family has different kinds of material', () => {
    const media = [
      makeMedia('a', 'portrait'),
      makeMedia('b', 'historical_photo'),
      makeMedia('c', 'document'),
    ];
    const { featured } = buildExhibitionCatalog(media, []);
    expect(featured.map(({ key }) => key)).toEqual(['reference:ancestral-merit', 'media:a', 'media:c']);
  });
});
