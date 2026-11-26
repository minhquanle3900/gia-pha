import { useId, useRef, type ReactNode } from 'react';
import { Maximize, X } from 'lucide-react';

export function Couplet({ lines, vertical = false }: { lines: readonly [string, string]; vertical?: boolean }) {
  if (!vertical) {
    return <span className="exhibition-couplet">{lines.map((line) => <span key={line}>{line}</span>)}</span>;
  }

  return (
    <span className="exhibition-couplet exhibition-couplet-vertical">
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

export function ArtworkFullscreen({ title, children }: { title: string; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  return (
    <>
      <button ref={trigger} type="button" className="exhibition-action exhibition-fullscreen-action"
        aria-haspopup="dialog" onClick={() => dialog.current?.showModal()}>
        <Maximize size={17} aria-hidden="true" /> Xem toàn màn hình
      </button>
      <dialog ref={dialog} className="exhibition-fullscreen" aria-labelledby={titleId}
        onClose={() => trigger.current?.focus({ preventScroll: true })}>
        <header className="exhibition-fullscreen-header">
          <h3 id={titleId}>{title}</h3>
          <button type="button" autoFocus aria-label="Đóng toàn màn hình" onClick={() => dialog.current?.close()}>
            <X size={23} aria-hidden="true" />
          </button>
        </header>
        <div className="exhibition-fullscreen-art">{children}</div>
      </dialog>
    </>
  );
}
