import { RefObject, useCallback, useEffect, useRef } from 'react';

export type ModalCloseReason = 'escape' | 'backdrop' | 'button';

interface ModalAccessibilityOptions {
  open: boolean;
  dialogRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  busy?: boolean;
  onRequestClose: (reason: ModalCloseReason) => void;
}

const modalStack: symbol[] = [];
let previousBodyOverflow = '';

const focusableSelector = [
  'a[href]',
  'button',
  'input:not([type="hidden"])',
  'select',
  'textarea',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function focusableElements(dialog: HTMLElement): HTMLElement[] {
  return Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector)).filter(
    (element) =>
      !element.matches(':disabled') &&
      !element.closest('[inert], [aria-hidden="true"]') &&
      element.getClientRects().length > 0 &&
      getComputedStyle(element).visibility !== 'hidden'
  );
}

export function useModalAccessibility({
  open,
  dialogRef,
  initialFocusRef,
  returnFocusRef,
  busy = false,
  onRequestClose,
}: ModalAccessibilityOptions) {
  const identity = useRef(Symbol('modal'));
  const latest = useRef({ busy, onRequestClose });
  latest.current = { busy, onRequestClose };

  const requestClose = useCallback((reason: ModalCloseReason) => {
    if (latest.current.busy || modalStack.at(-1) !== identity.current) return;
    latest.current.onRequestClose(reason);
  }, []);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const trigger = returnFocusRef?.current ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    const id = identity.current;
    if (modalStack.length === 0) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    modalStack.push(id);

    const focusInitial = () => {
      const preferred = initialFocusRef?.current;
      const target = preferred && dialog.contains(preferred) && !preferred.matches(':disabled')
        ? preferred
        : focusableElements(dialog)[0] ?? dialog;
      target.focus({ preventScroll: true });
    };
    focusInitial();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (modalStack.at(-1) !== id) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        requestClose('escape');
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusableElements(dialog);
      const first = elements[0];
      const last = elements.at(-1);
      const active = document.activeElement;
      if (!first || !last) {
        event.preventDefault();
        dialog.focus({ preventScroll: true });
      } else if (!dialog.contains(active) || active === dialog) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    const handleFocusIn = (event: FocusEvent) => {
      if (modalStack.at(-1) !== id || dialog.contains(event.target as Node)) return;
      focusInitial();
    };

    document.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusin', handleFocusIn);
    return () => {
      const wasTopmost = modalStack.at(-1) === id;
      const index = modalStack.indexOf(id);
      if (index >= 0) modalStack.splice(index, 1);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', handleFocusIn);
      if (modalStack.length === 0) document.body.style.overflow = previousBodyOverflow;
      if (wasTopmost && trigger?.isConnected) {
        const nextTopmost = modalStack.at(-1);
        queueMicrotask(() => {
          if (!trigger.isConnected || modalStack.at(-1) !== nextTopmost) return;
          const otherDialog = Array.from(document.querySelectorAll<HTMLElement>('[aria-modal="true"]'))
            .some((element) => element !== dialog && element.getClientRects().length > 0 && !element.contains(trigger));
          if (!otherDialog) trigger.focus({ preventScroll: true });
        });
      }
    };
  }, [open, dialogRef, initialFocusRef, returnFocusRef, requestClose]);

  return { requestClose };
}
