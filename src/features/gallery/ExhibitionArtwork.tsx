import { useId, useRef, useState, type ReactNode } from 'react';
import { Maximize, X } from 'lucide-react';

const treatments = [
  { key: 'lacquer', label: 'Đỏ son – vàng kim' },
  { key: 'paper', label: 'Giấy dó – mực tàu' },
  { key: 'wood', label: 'Gỗ trầm – chữ vàng' },
  { key: 'scroll', label: 'Tranh cuộn truyền thống' },
] as const;

type CoupletTreatment = (typeof treatments)[number]['key'];
type Verse = readonly [string, string];

export function Couplet({ lines, vertical = false, treatment = 'lacquer' }: {
  lines: Verse;
  vertical?: boolean;
  treatment?: CoupletTreatment;
}) {
  if (!vertical) {
    return (
      <span className="exhibition-couplet heritage-brush" data-treatment={treatment}>
        {lines.map((line) => <span key={line}>{line}</span>)}
      </span>
    );
  }

  return (
    <span className="exhibition-couplet exhibition-couplet-vertical heritage-brush" data-treatment={treatment}>
      {lines.map((line) => (
        <span key={line} className="exhibition-couplet-panel">
          <span className="sr-only">{line}</span>
          <span className="exhibition-couplet-words" aria-hidden="true">
            {line.split(' ').map((word, index) => <span key={index}>{word}</span>)}
          </span>
        </span>
      ))}
    </span>
  );
}

export function CoupletDetail({ title, lines, isAncestral }: { title: string; lines: Verse; isAncestral: boolean }) {
  const [treatment, setTreatment] = useState<CoupletTreatment>('lacquer');
  const treatmentGroup = useId();

  return (
    <div className="exhibition-detail-layout">
      <figure className="exhibition-detail-art exhibition-detail-couplet exhibition-art-calligraphy">
        <blockquote><Couplet lines={lines} treatment={treatment} vertical /></blockquote>
        <figcaption className="exhibition-caption">
          <span>Câu đối tham khảo</span>
          <ArtworkFullscreen title={title}><Couplet lines={lines} treatment={treatment} vertical /></ArtworkFullscreen>
        </figcaption>
      </figure>
      <div className="exhibition-detail-copy">
        <h3 className="heritage-heading">Về câu đối</h3>
        <p className="heritage-body">{isAncestral
          ? 'Cặp câu gợi nhắc công đức của tổ tiên và lòng hiếu thảo của con cháu.'
          : 'Cặp câu chúc năm mới thêm phúc, thọ và bình an.'}</p>
        <p className="exhibition-detail-note">Nguồn và dị bản chưa được xác minh. Kiểu chữ dự phòng Charm.</p>
        {!isAncestral && (
          <p className="exhibition-detail-note">Bản trưng bày giữ “Cựu niên”. Cách ghi “Khứa niên” chờ Product Owner xác nhận.</p>
        )}
        <fieldset className="exhibition-treatments">
          <legend>Phong cách trình bày</legend>
          {treatments.map(({ key, label }) => (
            <label key={key}>
              <input type="radio" name={treatmentGroup} value={key} checked={treatment === key}
                onChange={() => setTreatment(key)} />
              {label}
            </label>
          ))}
        </fieldset>
      </div>
    </div>
  );
}

export function ArtworkFullscreen({ title, children }: { title: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  const openFullscreen = () => {
    const element = dialog.current;
    if (!element || element.open) return;
    element.showModal();
    element.setAttribute('aria-modal', 'true');
  };

  return (
    <>
      <button ref={trigger} type="button" className="exhibition-action exhibition-fullscreen-action"
        aria-haspopup="dialog" onClick={openFullscreen}>
        <Maximize size={17} aria-hidden="true" /> Xem toàn màn hình
      </button>
      <dialog ref={dialog} className="exhibition-fullscreen" aria-labelledby={titleId}
        onClose={(event) => {
          if (event.currentTarget.open) return;
          event.currentTarget.removeAttribute('aria-modal');
          trigger.current?.focus({ preventScroll: true });
        }}>
        <header className="exhibition-fullscreen-header">
          <h3 id={titleId} className="heritage-heading">{title}</h3>
          <button type="button" autoFocus aria-label="Đóng toàn màn hình" onClick={() => dialog.current?.close()}>
            <X size={23} aria-hidden="true" />
          </button>
        </header>
        <div className="exhibition-fullscreen-art">{children}</div>
      </dialog>
    </>
  );
}
