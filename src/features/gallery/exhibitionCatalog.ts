import type { FamilyBranch, FamilyStory, Media, MediaCategory } from '../../models/genealogy';

export type RoomId = 'calligraphy' | 'portraits' | 'photos' | 'artifacts' | 'precepts' | 'memories';

interface ExhibitLabel {
  key: string;
  room: RoomId;
  title: string;
}

type ReferenceExhibit = ExhibitLabel & {
  kind: 'reference';
  lines: readonly [string, string];
};

type MediaExhibit = ExhibitLabel & { kind: 'media'; media: Media };
type StoryExhibit = ExhibitLabel & { kind: 'story'; story: FamilyStory };

export type Exhibit = ReferenceExhibit | MediaExhibit | StoryExhibit;

export interface ExhibitionCatalog {
  rooms: Record<RoomId, Exhibit[]>;
  featured: Exhibit[];
}

export interface ExhibitionCollection {
  key: string;
  title: string;
  description?: string;
  entries: Exhibit[];
}

const referenceCouplets: readonly [ReferenceExhibit, ReferenceExhibit] = [
  {
    kind: 'reference',
    key: 'reference:ancestral-merit',
    room: 'calligraphy',
    title: 'Công đức tổ tông',
    lines: [
      'Tổ tông công đức thiên niên thịnh',
      'Con cháu thảo hiền vạn đại vinh',
    ],
  },
  {
    kind: 'reference',
    key: 'reference:spring-wishes',
    room: 'calligraphy',
    title: 'Lời chúc tân xuân',
    lines: [
      'Cựu niên tài lộc đa phúc đức',
      'Tân xuân phú quý thọ khang ninh',
    ],
  },
];

const mediaRooms: Record<MediaCategory, RoomId> = {
  portrait: 'portraits',
  historical_photo: 'photos',
  document: 'artifacts',
  certificate: 'artifacts',
  letter: 'artifacts',
  record: 'artifacts',
  audio: 'memories',
};

const roomTags = new Map<string, RoomId>([
  ['thu phap', 'calligraphy'],
  ['cau doi', 'calligraphy'],
  ['chan dung', 'portraits'],
  ['chan dung tien nhan', 'portraits'],
  ['anh gia toc', 'photos'],
  ['hien vat', 'artifacts'],
  ['ky vat', 'artifacts'],
  ['ky vat gia truyen', 'artifacts'],
  ['gia phong', 'precepts'],
  ['gia huan', 'precepts'],
  ['nghi le', 'memories'],
  ['phong tuc', 'memories'],
  ['ky uc', 'memories'],
]);

function normalizedTag(tag: string) {
  return tag
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .trim()
    .replace(/\s+/g, ' ');
}

function storyRoom(story: FamilyStory): RoomId {
  for (const tag of story.tags ?? []) {
    const room = roomTags.get(normalizedTag(tag));
    if (room) return room;
  }
  return story.category === 'communal_rule' ? 'precepts' : 'memories';
}

function newestFirst(a: Pick<Media, 'createdAt' | 'id'>, b: Pick<Media, 'createdAt' | 'id'>) {
  return (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0) || a.id.localeCompare(b.id);
}

export function buildExhibitionCatalog(media: readonly Media[], stories: readonly FamilyStory[]): ExhibitionCatalog {
  const rooms: Record<RoomId, Exhibit[]> = {
    calligraphy: [...referenceCouplets],
    portraits: [],
    photos: [],
    artifacts: [],
    precepts: [],
    memories: [],
  };

  const storyExhibits: StoryExhibit[] = [...stories]
    .sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)) || newestFirst(a, b))
    .map((story) => ({
      kind: 'story',
      key: `story:${story.id}`,
      room: storyRoom(story),
      title: story.title,
      story,
    }));
  const mediaExhibits: MediaExhibit[] = [...media].sort(newestFirst).map((item) => ({
    kind: 'media',
    key: `media:${item.id}`,
    room: mediaRooms[item.category] ?? 'artifacts',
    title: item.title,
    media: item,
  }));
  for (const exhibit of [...storyExhibits, ...mediaExhibits]) {
    rooms[exhibit.room].push(exhibit);
  }

  const pinned = storyExhibits.filter(({ story }) => story.isPinned).slice(0, 2);
  const featured: Exhibit[] = [...pinned, referenceCouplets[0]];
  const candidates = [...mediaExhibits, ...storyExhibits.filter(({ story }) => !story.isPinned)];
  for (const candidate of candidates) {
    if (featured.length === 3) break;
    if (!featured.some(({ room }) => room === candidate.room)) featured.push(candidate);
  }
  featured.push(...candidates.filter((candidate) => !featured.includes(candidate)).slice(0, 3 - featured.length));

  return { rooms, featured };
}

function collectionOrder(a: ExhibitionCollection, b: ExhibitionCollection) {
  return a.title.localeCompare(b.title, 'vi') || a.key.localeCompare(b.key);
}

export function buildExhibitionCollections(
  catalog: ExhibitionCatalog,
  branches: readonly FamilyBranch[],
): ExhibitionCollection[] {
  const branchCollections = new Map<string, ExhibitionCollection>(branches.map((branch) => [
    branch.id,
    {
      key: `branch:${branch.id}`,
      title: branch.name,
      description: branch.description,
      entries: [],
    },
  ]));
  const tagCollections = new Map<string, ExhibitionCollection>();

  for (const exhibit of Object.values(catalog.rooms).flat()) {
    if (exhibit.kind === 'reference') continue;
    const record = exhibit.kind === 'media' ? exhibit.media : exhibit.story;
    if (record.branchId) branchCollections.get(record.branchId)?.entries.push(exhibit);
    if (exhibit.kind !== 'story') continue;

    const seenTags = new Set<string>();
    for (const tag of exhibit.story.tags ?? []) {
      const label = normalizedTag(tag);
      if (!label || roomTags.has(label) || seenTags.has(label)) continue;
      seenTags.add(label);

      const collection = tagCollections.get(label);
      if (collection) {
        collection.entries.push(exhibit);
      } else {
        tagCollections.set(label, {
          key: `tag:${label}`,
          title: tag.trim().replace(/\s+/g, ' '),
          entries: [exhibit],
        });
      }
    }
  }

  return [
    ...[...branchCollections.values()].filter(({ entries }) => entries.length > 0).sort(collectionOrder),
    ...[...tagCollections.values()].sort(collectionOrder),
  ];
}
