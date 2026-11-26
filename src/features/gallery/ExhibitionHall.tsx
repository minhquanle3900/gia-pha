import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Amphora, ArrowDown, ArrowLeft, ArrowRight, BookOpen, CalendarDays,
  Images, Landmark, Layers3, Mic, PenTool, ScrollText, UserRound,
} from 'lucide-react';
import { useGenealogy } from '../../context/GenealogyContext';
import type { Media } from '../../models/genealogy';
import { buildExhibitionCatalog, buildExhibitionCollections, type Exhibit, type RoomId } from './exhibitionCatalog';
import { ArtworkFullscreen, Couplet } from './ExhibitionArtwork';
import hallImage from './exhibition-hall.webp?inline';
import './exhibitionHall.css';

type HeritageTab = 'journal' | 'rites' | 'book';

interface ExhibitionHallProps {
  onOpenArchive: (item?: Media) => void;
  onNavigate: (tab: HeritageTab) => void;
  onSelectPerson: (personId: string) => void;
}

type ExhibitionView =
  | { kind: 'hall' }
  | { kind: 'room'; room: RoomId }
  | { kind: 'collections' }
  | { kind: 'collection'; key: string }
  | { kind: 'detail'; exhibit: Exhibit };

interface ExhibitionVisit {
  view: ExhibitionView;
  returnTo?: string;
}

const rooms = {
  calligraphy: {
    title: 'Thư pháp và câu đối',
    description: 'Câu chữ treo nơi trang trọng trong nếp nhà Việt.',
    empty: 'Khu này chưa có tác phẩm.',
    icon: PenTool,
  },
  portraits: {
    title: 'Chân dung tiền nhân',
    description: 'Chân dung trong kho tư liệu và hồ sơ người được ghi lại.',
    empty: 'Chưa có tư liệu chân dung trong kho.',
    icon: UserRound,
  },
  photos: {
    title: 'Ảnh gia tộc',
    description: 'Ảnh xưa và những khoảnh khắc sum họp.',
    empty: 'Chưa có ảnh tư liệu trong kho.',
    icon: Images,
  },
  artifacts: {
    title: 'Kỷ vật gia truyền',
    description: 'Giấy tờ, thư từ và bút tích còn được lưu giữ.',
    empty: 'Chưa có tư liệu hay hiện vật trong kho.',
    icon: Amphora,
  },
  precepts: {
    title: 'Gia phong và gia huấn',
    description: 'Lời dạy và nếp sống được truyền qua các thế hệ.',
    empty: 'Các ghi chép tộc ước hoặc có thẻ Gia phong, Gia huấn sẽ xuất hiện tại đây.',
    icon: ScrollText,
  },
  memories: {
    title: 'Nghi lễ và phong tục',
    description: 'Ghi chép, lời kể và bản ghi âm của người trong họ.',
    empty: 'Chưa có lời kể hay bản ghi âm ký ức.',
    icon: Mic,
  },
};

const roomIds: RoomId[] = ['calligraphy', 'portraits', 'photos', 'artifacts', 'precepts', 'memories'];
const collectionsTitle = 'Triển lãm theo chủ đề';

const heritageLinks = [
  { tab: 'journal', title: 'Nhật ký dòng họ', icon: ScrollText },
  { tab: 'rites', title: 'Lễ giỗ và nghi lễ', icon: CalendarDays },
  { tab: 'book', title: 'Sách phả ký', icon: BookOpen },
] as const;

function embeddedSource(item: Media | undefined, type: 'image' | 'audio') {
  if (!item?.mimeType.toLowerCase().startsWith(type + '/')) return undefined;
  return item.dataUrl.toLowerCase().startsWith('data:' + type + '/') ? item.dataUrl : undefined;
}

function attachedMedia(exhibit: Exhibit, media: ReadonlyMap<string, Media>) {
  if (exhibit.kind !== 'story') return [];
  return [...new Set(exhibit.story.mediaIds)].flatMap((id) => {
    const item = media.get(id);
    return item ? [item] : [];
  });
}

function exhibitCover(exhibit: Exhibit, media: ReadonlyMap<string, Media>) {
  if (exhibit.kind === 'media') return exhibit.media;
  return attachedMedia(exhibit, media).find((item) => embeddedSource(item, 'image'));
}

function exhibitSubtitle(exhibit: Exhibit) {
  switch (exhibit.kind) {
    case 'reference': return 'Câu đối tham khảo';
    case 'media': return exhibit.media.dateLabel || rooms[exhibit.room].title;
    case 'story': return exhibit.story.periodLabel || rooms[exhibit.room].title;
  }
}

function ExhibitCard({ exhibit, cover, from, onOpen }: {
  exhibit: Exhibit;
  cover?: Media;
  from: string;
  onOpen: () => void;
}) {
  const Icon = rooms[exhibit.room].icon;
  const image = embeddedSource(cover, 'image');
  const summary = exhibit.kind === 'media' ? exhibit.media.description
    : exhibit.kind === 'story' ? exhibit.story.summary : undefined;
  return (
    <li>
      <button
        type="button"
        id={cardId(from, exhibit)}
        className="exhibition-card"
        aria-label={'Xem ' + exhibit.title}
        onClick={onOpen}
      >
        <span className={`exhibition-card-art exhibition-art-${exhibit.room}`} aria-hidden="true">
          {exhibit.kind === 'reference' ? (
            <Couplet lines={exhibit.lines} />
          ) : image ? (
            <img src={image} alt="" loading="lazy" decoding="async" />
          ) : (
            <Icon size={42} strokeWidth={1.15} />
          )}
        </span>
        <span className="exhibition-card-copy">
          <span className="exhibition-card-overline">{exhibitSubtitle(exhibit)}</span>
          <span className="exhibition-card-title">{exhibit.title}</span>
          {summary && <span className="exhibition-card-summary">{summary}</span>}
          <ArrowRight className="exhibition-card-arrow" size={17} aria-hidden="true" />
        </span>
      </button>
    </li>
  );
}

function ExhibitDetail({ exhibit, media, people, branchName, onOpenBranch, onOpenArchive, onNavigate, onSelectPerson }: {
  exhibit: Exhibit;
  media: ReadonlyMap<string, Media>;
  people: ReadonlyMap<string, string>;
  branchName?: string;
  onOpenBranch?: () => void;
} & ExhibitionHallProps) {
  if (exhibit.kind === 'reference') {
    return (
      <div className="exhibition-detail-layout">
        <figure className="exhibition-detail-art exhibition-detail-couplet exhibition-art-calligraphy">
          <blockquote><Couplet lines={exhibit.lines} vertical /></blockquote>
          <figcaption className="exhibition-caption">
            <span>Câu đối tham khảo</span>
            <ArtworkFullscreen title={exhibit.title}><Couplet lines={exhibit.lines} vertical /></ArtworkFullscreen>
          </figcaption>
        </figure>
        <div className="exhibition-detail-copy">
          <h3>Về câu đối</h3>
          <p>{exhibit.key === 'reference:ancestral-merit'
            ? 'Cặp câu gợi nhắc công đức của tổ tiên và lòng hiếu thảo của con cháu.'
            : 'Cặp câu chúc năm mới thêm phúc, thọ và bình an.'}</p>
          <p className="exhibition-detail-note">Nguồn và dị bản chưa được xác minh.</p>
        </div>
      </div>
    );
  }

  const item = exhibit.kind === 'media' ? exhibit.media : undefined;
  const story = exhibit.kind === 'story' ? exhibit.story : undefined;
  const source = exhibitCover(exhibit, media);
  const image = embeddedSource(source, 'image');
  const audio = embeddedSource(item, 'audio');
  const attachments = attachedMedia(exhibit, media);
  const record = exhibit.kind === 'media' ? exhibit.media : exhibit.story;
  const relatedPeople = [...new Set(record.personIds)].flatMap((id) => {
    const name = people.get(id);
    return name ? [{ id, name }] : [];
  });
  const fields = [
    ['Thời kỳ', item?.dateLabel || story?.periodLabel],
    ['Địa điểm', story?.location],
    ['Người ghi lại', story?.recordedBy],
  ].filter(([, value]) => Boolean(value));
  const Icon = rooms[exhibit.room].icon;

  return (
    <div className="exhibition-detail-layout">
      <figure className={`exhibition-detail-art exhibition-art-${exhibit.room}`}>
        {image ? (
          <>
            <img src={image} alt={source?.title || exhibit.title} decoding="async" />
            <figcaption className="exhibition-caption">
              <span>{source?.title}</span>
              <ArtworkFullscreen title={source?.title || exhibit.title}>
                <img src={image} alt={source?.title || exhibit.title} decoding="async" />
              </ArtworkFullscreen>
            </figcaption>
          </>
        ) : audio ? (
          <div className="exhibition-audio">
            <Mic aria-hidden="true" size={44} strokeWidth={1.2} />
            <audio controls preload="none" src={audio} aria-label={'Nghe ' + exhibit.title} />
          </div>
        ) : (
          <div className="exhibition-art-placeholder">
            <Icon size={54} strokeWidth={1.05} aria-hidden="true" />
            {item && <span>Tư liệu này chưa có bản xem trước trong phòng trưng bày.</span>}
          </div>
        )}
      </figure>
      <div className="exhibition-detail-copy">
        {(fields.length > 0 || branchName || relatedPeople.length > 0) && (
          <dl className="exhibition-meta">
            {fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
            {branchName && <div><dt>Chi họ</dt><dd>
              {onOpenBranch ? (
                <button id="exhibition-related-branch" type="button" className="exhibition-text-link" onClick={onOpenBranch}>
                  {branchName}
                </button>
              ) : branchName}
            </dd></div>}
            {relatedPeople.length > 0 && <div><dt>Người liên quan</dt><dd>
              <ul className="exhibition-related-people">
                {relatedPeople.map(({ id, name }) => <li key={id}>
                  <button type="button" className="exhibition-text-link" onClick={() => onSelectPerson(id)}>{name}</button>
                </li>)}
              </ul>
            </dd></div>}
          </dl>
        )}
        {(story?.content || item?.description || item?.storyContext) && (
          <section className="exhibition-object-story">
            <h3>Câu chuyện</h3>
            {story?.content && <p>{story.content}</p>}
            {item?.description && <p>{item.description}</p>}
            {item?.storyContext && <p>{item.storyContext}</p>}
          </section>
        )}
        {attachments.length > 0 && (
          <section>
            <h3>Tư liệu đính kèm</h3>
            <ul className="exhibition-attachments">
              {attachments.map((attachment) => (
                <li key={attachment.id}>
                  <button type="button" onClick={() => onOpenArchive(attachment)}>{attachment.title}</button>
                </li>
              ))}
            </ul>
          </section>
        )}
        <button type="button" className="exhibition-action" onClick={() => item ? onOpenArchive(item) : onNavigate('journal')}>
          {item ? 'Xem trong kho kỷ vật' : 'Mở nhật ký dòng họ'} <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

function cardId(from: string, exhibit: Exhibit) {
  return `exhibition-card-${from}-${exhibit.key}`;
}

function CollectionButton({ id, title, description, count, icon: Icon, onClick }: {
  id: string;
  title: string;
  description?: string;
  count: number;
  icon: typeof Layers3;
  onClick: () => void;
}) {
  return (
    <li>
      <button type="button" className="exhibition-room" id={id} onClick={onClick}>
        <Icon className="exhibition-room-icon" size={26} strokeWidth={1.35} aria-hidden="true" />
        <span className="exhibition-room-title">{title}</span>
        {description && <span className="exhibition-room-description">{description}</span>}
        <span className="exhibition-room-count">{count ? `${count} mục` : 'Chưa có tư liệu'}</span>
        <ArrowRight className="exhibition-room-arrow" size={18} aria-hidden="true" />
      </button>
    </li>
  );
}

export default function ExhibitionHall({ onOpenArchive, onNavigate, onSelectPerson }: ExhibitionHallProps) {
  const { media, stories, people, branches } = useGenealogy();
  const catalog = useMemo(() => buildExhibitionCatalog(media, stories), [media, stories]);
  const collections = useMemo(() => buildExhibitionCollections(catalog, branches), [catalog, branches]);
  const collectionsByKey = useMemo(() => new Map(collections.map((item) => [item.key, item])), [collections]);
  const mediaById = useMemo(() => new Map(media.map((item) => [item.id, item])), [media]);
  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person.fullName])), [people]);
  const branchesById = useMemo(() => new Map(branches.map((branch) => [branch.id, branch.name])), [branches]);
  const [trail, setTrail] = useState<ExhibitionVisit[]>([{ view: { kind: 'hall' } }]);
  const current = trail[trail.length - 1];
  const view = current.view;
  const parent = trail[trail.length - 2]?.view;
  const root = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const roomsHeading = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<string>(null);

  useEffect(() => {
    const target = returnFocus.current && document.getElementById(returnFocus.current);
    returnFocus.current = null;
    if (target) {
      target.focus({ preventScroll: true });
      target.scrollIntoView({ block: 'nearest' });
    } else {
      heading.current?.focus({ preventScroll: true });
      root.current?.scrollIntoView({ block: 'start' });
    }
  }, [view]);

  const open = (next: ExhibitionView, returnTo: string) => {
    setTrail((visits) => [...visits, { view: next, returnTo }]);
  };

  const showBack = () => {
    returnFocus.current = current.returnTo ?? null;
    setTrail((visits) => visits.slice(0, -1));
  };

  const renderCards = (entries: readonly Exhibit[], from: string) => (
    <ul className="exhibition-cards">
      {entries.map((exhibit) => (
        <ExhibitCard key={exhibit.key} exhibit={exhibit} from={from} cover={exhibitCover(exhibit, mediaById)}
          onOpen={() => open({ kind: 'detail', exhibit }, cardId(from, exhibit))} />
      ))}
    </ul>
  );

  const titleOf = (panel: ExhibitionView) => {
    switch (panel.kind) {
      case 'hall': return 'phòng trưng bày';
      case 'room': return rooms[panel.room].title;
      case 'collections': return collectionsTitle;
      case 'collection': return collectionsByKey.get(panel.key)?.title ?? 'Bộ sưu tập';
      case 'detail': return panel.exhibit.title;
    }
  };

  if (view.kind !== 'hall') {
    const exhibit = view.kind === 'detail' ? view.exhibit : undefined;
    const room = view.kind === 'room' ? rooms[view.room] : undefined;
    const collection = view.kind === 'collection' ? collectionsByKey.get(view.key) : undefined;
    const entries = view.kind === 'room' ? catalog.rooms[view.room] : collection?.entries;
    const branchId = exhibit?.kind === 'media' ? exhibit.media.branchId
      : exhibit?.kind === 'story' ? exhibit.story.branchId : undefined;
    const branchKey = branchId ? 'branch:' + branchId : undefined;
    const openBranch = branchKey && collectionsByKey.has(branchKey)
      ? () => {
        if (parent?.kind === 'collection' && parent.key === branchKey) showBack();
        else open({ kind: 'collection', key: branchKey }, 'exhibition-related-branch');
      }
      : undefined;
    const canOpenJournal = view.kind === 'collections' || (view.kind === 'room' && (view.room === 'precepts' || view.room === 'memories'));
    const EmptyIcon = room?.icon ?? Layers3;
    const emptyTitle = view.kind === 'collections' ? 'Chưa có bộ sưu tập' : 'Chưa có mục trưng bày';

    return (
      <div className="exhibition" ref={root}>
        <button type="button" className="exhibition-back" onClick={showBack}>
          <ArrowLeft size={17} aria-hidden="true" />
          Về {parent ? titleOf(parent) : 'phòng trưng bày'}
        </button>

        <header className="exhibition-interior-header">
          <span className="exhibition-eyebrow">{exhibit ? exhibitSubtitle(exhibit) : 'Phòng trưng bày'}</span>
          <h2 ref={heading} tabIndex={-1}>{titleOf(view)}</h2>
          {room?.description && <p>{room.description}</p>}
          {collection?.description && <p>{collection.description}</p>}
          {view.kind === 'collections' && <p>Khám phá tư liệu theo chi họ và chủ đề trong nhật ký.</p>}
        </header>

        {exhibit ? (
          <ExhibitDetail key={exhibit.key} exhibit={exhibit} media={mediaById} people={peopleById}
            branchName={branchId ? branchesById.get(branchId) : undefined} onOpenBranch={openBranch}
            onOpenArchive={onOpenArchive} onNavigate={onNavigate} onSelectPerson={onSelectPerson} />
        ) : view.kind === 'collections' && collections.length > 0 ? (
          <ul className="exhibition-rooms">
            {collections.map((item) => (
              <CollectionButton key={item.key} id={'exhibition-collection-' + item.key}
                title={item.title} description={item.description} count={item.entries.length}
                icon={item.key.startsWith('branch:') ? Landmark : Layers3}
                onClick={() => open({ kind: 'collection', key: item.key }, 'exhibition-collection-' + item.key)} />
            ))}
          </ul>
        ) : entries?.length ? renderCards(entries, view.kind === 'room' ? view.room : collection?.key ?? 'collection') : (
          <section className="exhibition-empty">
            <EmptyIcon size={37} strokeWidth={1.2} aria-hidden="true" />
            <h3>{emptyTitle}</h3>
            <p>{room?.empty ?? 'Tư liệu gắn với chi họ và ghi chép có thẻ chủ đề sẽ xuất hiện tại đây.'}</p>
            <button type="button" className="exhibition-action" onClick={() => canOpenJournal ? onNavigate('journal') : onOpenArchive()}>
              {canOpenJournal ? 'Mở nhật ký dòng họ' : 'Mở kho kỷ vật'}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          </section>
        )}
      </div>
    );
  }

  return (
    <div className="exhibition" ref={root}>
      <header className="exhibition-hero">
        <img src={hallImage} alt="" aria-hidden="true" className="exhibition-hero-image" />
        <span className="exhibition-hero-caption">Ảnh minh họa</span>
        <div className="exhibition-hero-content">
          <span className="exhibition-eyebrow">Di sản gia tộc</span>
          <h2 ref={heading} tabIndex={-1}>Phòng trưng bày</h2>
          <p>Thư pháp, ảnh xưa và lời dạy được gìn giữ qua các thế hệ.</p>
          <div className="exhibition-hero-actions">
            <button type="button" className="exhibition-hero-primary" onClick={() => {
              roomsHeading.current?.focus({ preventScroll: true });
              roomsHeading.current?.scrollIntoView({ block: 'start' });
            }}>
              Khám phá các khu <ArrowDown size={16} aria-hidden="true" />
            </button>
            <button type="button" className="exhibition-hero-secondary" onClick={() => onOpenArchive()}>
              Mở kho kỷ vật <ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <section aria-labelledby="exhibition-featured" className="exhibition-section">
        <h3 id="exhibition-featured" className="exhibition-section-title">Tác phẩm nổi bật</h3>
        {renderCards(catalog.featured, 'featured')}
      </section>

      <section aria-labelledby="exhibition-rooms" className="exhibition-section">
        <h3 id="exhibition-rooms" className="exhibition-section-title" ref={roomsHeading} tabIndex={-1}>Các khu trưng bày</h3>
        <ul className="exhibition-rooms">
          {roomIds.map((id) => {
            const { icon, title, description } = rooms[id];
            return (
              <CollectionButton key={id} id={'exhibition-room-' + id} icon={icon} title={title}
                description={description} count={catalog.rooms[id].length}
                onClick={() => open({ kind: 'room', room: id }, 'exhibition-room-' + id)} />
            );
          })}
          <CollectionButton id="exhibition-room-collections" icon={Layers3} title={collectionsTitle}
            description="Tư liệu được quy tụ theo chi họ và thẻ chủ đề." count={collections.length}
            onClick={() => open({ kind: 'collections' }, 'exhibition-room-collections')} />
        </ul>
      </section>

      <section aria-labelledby="exhibition-reading" className="exhibition-section exhibition-reading">
        <Landmark size={25} strokeWidth={1.2} aria-hidden="true" />
        <h3 id="exhibition-reading">Tìm hiểu thêm về dòng họ</h3>
        <ul>
          {heritageLinks.map(({ tab, title, icon: Icon }) => (
            <li key={tab}><button type="button" className="exhibition-action" onClick={() => onNavigate(tab)}>
              <Icon size={17} aria-hidden="true" /> {title} <ArrowRight size={16} aria-hidden="true" />
            </button></li>
          ))}
        </ul>
      </section>
    </div>
  );
}
