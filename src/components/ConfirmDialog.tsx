import React, { useId, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useNativeModal } from '../hooks/useNativeModal';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  description,
  confirmLabel = 'Xác nhận',
  cancelLabel = 'Hủy bỏ',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useNativeModal(open, cancelRef);
  if (!open) return null;

  const requestCancel = () => {
    if (!busy) onCancel();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      aria-busy={busy}
      onKeyDown={(event) => {
        if (event.key === 'Escape') event.stopPropagation();
      }}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        requestCancel();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md space-y-4 overflow-y-auto rounded-2xl border border-[#E7DFD4] bg-[#FFFDF9] p-4 shadow-2xl backdrop:bg-black/60 sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl shrink-0 ${
              danger ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'
            }`}
          >
            <AlertTriangle aria-hidden="true" className="w-5 h-5" />
          </div>
          <h3 id={titleId} className="text-lg font-serif font-bold text-[#1F1913] leading-snug">{title}</h3>
        </div>
        <button
          type="button"
          onClick={requestCancel}
          disabled={busy}
          aria-label="Đóng xác nhận"
          className="grid size-11 shrink-0 place-items-center rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <p id={descriptionId} className="text-sm text-[#54483C] leading-relaxed whitespace-pre-line">{description}</p>

      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
        <button
          ref={cancelRef}
          type="button"
          onClick={requestCancel}
          disabled={busy}
          className="min-h-[42px] px-4 py-2 text-sm font-medium text-[#4A3F35] bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={busy}
          className={`min-h-[42px] px-4 py-2 text-sm font-medium text-white rounded-xl shadow-xs transition-colors ${
            danger
              ? 'bg-red-700 hover:bg-red-800'
              : 'bg-[#1B3B2B] hover:bg-[#234A36]'
          }`}
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
};
