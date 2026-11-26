import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Amphora, ArrowDown, ArrowLeft, ArrowRight, BookOpen, CalendarDays,
  Images, Landmark, Mic, PenTool, ScrollText,
} from 'lucide-react';
import { useGenealogy } from '../../context/GenealogyContext';
import type { Media } from '../../models/genealogy';
import { buildExhibitionCatalog, type Exhibit, type RoomId } from './exhibitionCatalog';
import hallImage from './exhibition-hall.webp?inline';
import './exhibitionHall.css';

type HeritageTab = 'journal' | 'rites' | 'book';

interface ExhibitionHallProps {
  onOpenArchive: (item?: Media) => void;
  onNavigate: (tab: HeritageTab) => void;
}

type ExhibitionView =
  | { kind: 'hall' }
  | { kind: 'room'; room: RoomId }
  | { kind: 'detail'; exhibit: Exhibit; from: RoomId | 'featured' };

const rooms = {
  calligraphy: {
    title: 'Thư pháp và câu đối',
    description: 'Câu chữ treo nơi trang trọng trong nếp nhà Việt.',
    empty: 'Khu này chưa có tác phẩm.',
    icon: PenTool,
  },
  photos: {
    title: 'Ảnh gia tộc',
    description: 'Chân dung, ảnh xưa và những khoảnh khắc sum họp.',
    empty: 'Chưa có chân dung hay ảnh tư liệu trong kho.',
    icon: Images,
  },
  artifacts: {
    title: 'Kỷ vật và hiện vật',
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
    title: 'Nghi lễ và ký ức',
    description: 'Ghi chép, lời kể và bản ghi âm của người trong họ.',
    empty: 'Chưa có lời kể hay bản ghi âm ký ức.',
    icon: Mic,
  },
};

const roomIds: RoomId[] = ['calligraphy', 'photos', 'artifacts', 'precepts', 'memories'];

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

function Couplet({ lines }: { lines: readonly [string, string] }) {
  return (
    <span className="exhibition-couplet">
      <span>{lines[0]}</span>
      <span>{lines[1]}</span>
    </span>
  );
}

function ExhibitCard({ exhibit, cover, from, onOpen }: {
  exhibit: Exhibit;
  cover?: Media;
  from: RoomId | 'featured';
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

function ExhibitDetail({ exhibit, media, people, branches, onOpenArchive, onNavigate }: {
  exhibit: Exhibit;
  media: ReadonlyMap<string, Media>;
  people: ReadonlyMap<string, string>;
  branches: ReadonlyMap<string, string>;
} & ExhibitionHallProps) {
  if (exhibit.kind === 'reference') {
    return (
      <div className="exhibition-detail-layout">
        <div className="exhibition-detail-art exhibition-detail-couplet">
          <blockquote><Couplet lines={exhibit.lines} /></blockquote>
        </div>
        <div className="exhibition-detail-copy">
          <h3>Về câu đối</h3>
          <p>{exhibit.key === 'reference:ancestral-merit'
            ? 'Cặp câu gợi nhắc công đức của tổ tiên và lòng hiếu thảo của con cháu.'
            : 'Cặp câu chúc năm mới thêm phúc, thọ và bình an.'}</p>
          <p className="exhibition-detail-note">Câu đối tham khảo trong khu thư pháp.</p>
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
  const branchName = record.branchId ? branches.get(record.branchId) : undefined;
  const names = record.personIds.flatMap((id) => {
    const name = people.get(id);
    return name ? [name] : [];
  }).join(', ');
  const fields = [
    ['Thời kỳ', item?.dateLabel || story?.periodLabel],
    ['Địa điểm', story?.location],
    ['Chi họ', branchName],
    ['Người liên quan', names],
    ['Người ghi lại', story?.recordedBy],
  ].filter(([, value]) => Boolean(value));
  const Icon = rooms[exhibit.room].icon;

  return (
    <div className="exhibition-detail-layout">
      <div className={`exhibition-detail-art exhibition-art-${exhibit.room}`}>
        {image ? (
          <img src={image} alt={source?.title || exhibit.title} decoding="async" />
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
      </div>
      <div className="exhibition-detail-copy">
        {fields.length > 0 && (
          <dl className="exhibition-meta">
            {fields.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}
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

function cardId(from: RoomId | 'featured', exhibit: Exhibit) {
  return `exhibition-card-${from}-${exhibit.key}`;
}

export default function ExhibitionHall({ onOpenArchive, onNavigate }: ExhibitionHallProps) {
  const { media, stories, people, branches } = useGenealogy();
  const catalog = useMemo(() => buildExhibitionCatalog(media, stories), [media, stories]);
  const mediaById = useMemo(() => new Map(media.map((item) => [item.id, item])), [media]);
  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person.fullName])), [people]);
  const branchesById = useMemo(() => new Map(branches.map((branch) => [branch.id, branch.name])), [branches]);
  const [view, setView] = useState<ExhibitionView>({ kind: 'hall' });
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

  const showBack = () => {
    if (view.kind === 'detail') {
      returnFocus.current = cardId(view.from, view.exhibit);
      setView(view.from === 'featured' ? { kind: 'hall' } : { kind: 'room', room: view.from });
    } else if (view.kind === 'room') {
      returnFocus.current = 'exhibition-room-' + view.room;
      setView({ kind: 'hall' });
    }
  };

  const renderCards = (entries: readonly Exhibit[], from: RoomId | 'featured') => (
    <ul className="exhibition-cards">
      {entries.map((exhibit) => (
        <ExhibitCard key={exhibit.key} exhibit={exhibit} from={from} cover={exhibitCover(exhibit, mediaById)}
          onOpen={() => setView({ kind: 'detail', exhibit, from })} />
      ))}
    </ul>
  );

  if (view.kind !== 'hall') {
    const room = rooms[view.kind === 'room' ? view.room : view.exhibit.room];
    return (
      <div className="exhibition" ref={root}>
        <button type="button" className="exhibition-back" onClick={showBack}>
          <ArrowLeft size={17} aria-hidden="true" />
          {view.kind === 'detail' && view.from !== 'featured' ? 'Về ' + room.title : 'Về phòng trưng bày'}
        </button>

        <header className="exhibition-interior-header">
          <span className="exhibition-eyebrow">{view.kind === 'detail' ? exhibitSubtitle(view.exhibit) : 'Phòng trưng bày'}</span>
          <h2 ref={heading} tabIndex={-1}>{view.kind === 'detail' ? view.exhibit.title : room.title}</h2>
          {view.kind === 'room' && <p>{room.description}</p>}
        </header>

        {view.kind === 'detail' ? (
          <ExhibitDetail exhibit={view.exhibit} media={mediaById} people={peopleById} branches={branchesById}
            onOpenArchive={onOpenArchive} onNavigate={onNavigate} />
        ) : catalog.rooms[view.room].length ? renderCards(catalog.rooms[view.room], view.room) : (
          <section className="exhibition-empty">
            <room.icon size={37} strokeWidth={1.2} aria-hidden="true" />
            <h3>Chưa có mục trưng bày</h3>
            <p>{room.empty}</p>
            <button type="button" className="exhibition-action"
              onClick={() => view.room === 'precepts' || view.room === 'memories' ? onNavigate('journal') : onOpenArchive()}>
              {view.room === 'precepts' || view.room === 'memories' ? 'Mở nhật ký dòng họ' : 'Mở kho kỷ vật'}
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
            const { icon: Icon, title, description } = rooms[id];
            const count = catalog.rooms[id].length;
            return (
              <li key={id}>
                <button type="button" className={`exhibition-room exhibition-art-${id}`} id={'exhibition-room-' + id}
                  onClick={() => setView({ kind: 'room', room: id })}>
                  <Icon className="exhibition-room-icon" size={26} strokeWidth={1.35} aria-hidden="true" />
                  <span className="exhibition-room-title">{title}</span>
                  <span className="exhibition-room-description">{description}</span>
                  <span className="exhibition-room-count">{count ? `${count} mục` : 'Chưa có tư liệu'}</span>
                  <ArrowRight className="exhibition-room-arrow" size={18} aria-hidden="true" />
                </button>
              </li>
            );
          })}
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
