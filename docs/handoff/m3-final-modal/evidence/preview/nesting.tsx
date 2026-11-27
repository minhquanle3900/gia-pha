import React, { useEffect, useId, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { useModalAccessibility } from '../../../../../src/hooks/useModalAccessibility';
import { useNativeModal } from '../../../../../src/hooks/useNativeModal';
import '../../../../../src/index.css';
import '../../../../../src/styles/heritageTypography.css';

type LayerKind = 'custom' | 'native';
const buttonClass = 'min-h-11 rounded-xl border border-[#85786A] bg-white px-3 py-2 text-sm font-semibold text-[#1B3B2B] disabled:opacity-50';

interface LayerProps {
  kind: LayerKind;
  open: boolean;
  path: string;
  depth?: number;
  onClose: (reason: string) => void;
  onEvent: (message: string) => void;
  onOpenSibling?: () => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
  note?: string;
}

function ModalLayer({ kind, open, path, depth = 0, onClose, onEvent, onOpenSibling, returnFocusRef, note }: LayerProps) {
  const headingId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const customRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [child, setChild] = useState<LayerKind | null>(null);
  const nativeRef = useNativeModal(open && kind === 'native', headingRef);
  const { requestClose } = useModalAccessibility({
    open: open && kind === 'custom',
    dialogRef: customRef,
    initialFocusRef: headingRef,
    returnFocusRef,
    busy,
    onRequestClose: reason => onClose(reason),
  });

  useEffect(() => {
    if (open) return;
    setBusy(false);
    setChild(null);
  }, [open]);

  if (!open) return null;

  const close = () => {
    if (kind === 'custom') requestClose('button');
    else if (!busy) onClose('button');
  };
  const content = <>
    <h2 ref={headingRef} id={headingId} tabIndex={-1} className="text-xl font-bold">
      {path} · {kind === 'native' ? 'Native dialog' : 'Custom dialog'}
    </h2>
    {note && <p className="text-sm">{note}</p>}
    <p className="text-sm">Initial focus ở tiêu đề <code>tabindex=-1</code>. Biên Tab chỉ gồm các control có thứ tự Tab hợp lệ.</p>
    <button type="button" tabIndex={-1} className={buttonClass} onClick={() => onEvent(path + ': kích hoạt control -1 đầu')}>
      {path}: control -1 đầu
    </button>
    <label className="grid gap-1 text-sm">
      {path}: nội dung nháp QA
      <input aria-label={path + ': nội dung nháp QA'} className="min-h-11 rounded-lg border p-2" />
    </label>
    {depth < 2 && <div className="flex flex-wrap gap-2">
      <button type="button" className={buttonClass} disabled={busy} onClick={() => setChild('custom')}>
        {path}: mở custom con
      </button>
      <button type="button" className={buttonClass} disabled={busy} onClick={() => setChild('native')}>
        {path}: mở native con
      </button>
    </div>}
    {kind === 'native' && onOpenSibling && <button type="button" className={buttonClass} disabled={busy} onClick={onOpenSibling}>
      {path}: mở custom sibling bị treo
    </button>}
    <button type="button" className={buttonClass} onClick={() => {
      onEvent(path + (busy ? ': kết thúc busy mô phỏng' : ': bắt đầu busy mô phỏng'));
      setBusy(current => !current);
    }}>
      {path}: {busy ? 'kết thúc busy mô phỏng' : 'bắt đầu busy mô phỏng'}
    </button>
    <p role="status" className="text-sm">{path}: {busy ? 'BUSY mô phỏng · không phải transaction thật' : 'Không bận'}</p>
    <button type="button" className={buttonClass} disabled={busy} onClick={close}>{path}: đóng lớp này</button>
    <button type="button" tabIndex={-1} className={buttonClass} onClick={() => onEvent(path + ': kích hoạt control -1 cuối')}>
      {path}: control -1 cuối
    </button>
    {child && <ModalLayer kind={child} path={path + '/' + child} depth={depth + 1} open onEvent={onEvent} onClose={reason => {
      onEvent(path + '/' + child + ': đóng bằng ' + reason);
      setChild(null);
    }} />}
  </>;

  if (kind === 'native') return <dialog
    ref={nativeRef}
    aria-modal="true"
    aria-labelledby={headingId}
    aria-busy={busy}
    closedby={busy ? 'none' : 'closerequest'}
    onCancel={event => {
      event.preventDefault();
      event.stopPropagation();
      if (!busy) onClose('escape/cancel');
    }}
    className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-xl space-y-4 overflow-y-auto rounded-2xl border border-[#85786A] bg-[#FFFDF9] p-4 shadow-2xl backdrop:bg-black/60"
  >{content}</dialog>;

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 p-4" onClick={() => requestClose('backdrop')}>
    <div ref={customRef} role="dialog" aria-modal="true" aria-labelledby={headingId} aria-busy={busy} tabIndex={-1}
      onClick={event => event.stopPropagation()}
      className="max-h-[calc(100dvh-2rem)] w-full max-w-xl space-y-4 overflow-y-auto rounded-2xl border border-[#85786A] bg-[#FFFDF9] p-4 shadow-2xl">
      {content}
    </div>
  </div>;
}

function NestingFixture() {
  const [layer, setLayer] = useState<LayerKind | null>(null);
  const [siblingOpen, setSiblingOpen] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const [dark, setDark] = useState(false);
  const nativeOpenerRef = useRef<HTMLButtonElement>(null);
  const record = (message: string) => setEvents(current => [...current, message]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return <main className="heritage-ui mx-auto min-h-screen max-w-3xl space-y-4 p-4 text-[#231C16] dark:text-stone-100">
    <h1 className="text-2xl font-bold">M3 QA fixture · Custom/native modal nesting</h1>
    <p>Trang kiểm thử hook thật. Không ghi IndexedDB, không gửi dữ liệu. Busy ở trang này là state mô phỏng; transaction thật được kiểm riêng bằng trang controls.</p>
    <div className="flex flex-wrap gap-2">
      <button type="button" className={buttonClass} onClick={() => setLayer('custom')}>Mở custom ngoài</button>
      <button ref={nativeOpenerRef} type="button" className={buttonClass} onClick={() => setLayer('native')}>Mở native ngoài</button>
      <button type="button" className={buttonClass} onClick={() => setDark(current => !current)}>Đổi theme QA</button>
      <button type="button" className={buttonClass} onClick={() => setEvents([])}>Xóa log QA trên trang</button>
    </div>
    <p>Tiêu đề là focus lập trình, hai nút <code>tabindex=-1</code> phải bị bỏ qua khi Tab. Escape chỉ đóng lớp trên cùng, lớp bận phải giữ nguyên.</p>
    <p>Ca sibling: từ native ngoài, mở custom sibling ở ngoài DOM của native. Custom phải chờ dưới native top layer. Đóng native rồi kiểm tra custom còn mở và nhận focus. Khi custom đóng, returnFocusRef trỏ đến nút Mở native ngoài còn kết nối.</p>
    <p><a className="underline" href="./transaction-controls.html">Mở controls transaction và fixture</a></p>
    <pre aria-label="Log QA modal" className="whitespace-pre-wrap break-words rounded-xl border p-3 text-xs">{events.length ? events.join('\n') : 'Chưa có sự kiện đóng.'}</pre>
    {layer && <ModalLayer kind={layer} path="ngoài" open onEvent={record} onOpenSibling={() => {
      record('Mount custom sibling ngoài native DOM; chờ native top layer đóng.');
      setSiblingOpen(true);
    }} onClose={reason => {
      record('ngoài/' + layer + ': đóng bằng ' + reason);
      setLayer(null);
    }} />}
    {siblingOpen && <ModalLayer kind="custom" path="sibling" depth={2} open onEvent={record} returnFocusRef={nativeOpenerRef}
      note={layer === 'native' ? 'QA: custom sibling được mount ngoài native DOM; ca thử yêu cầu bị treo dưới native top layer.' : 'QA: native đã đóng; custom sibling còn mở và phải thao tác được.'}
      onClose={reason => {
        record('sibling/custom: đóng bằng ' + reason);
        setSiblingOpen(false);
      }} />}
  </main>;
}

createRoot(document.getElementById('root')!).render(<NestingFixture />);
