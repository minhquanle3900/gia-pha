import { RefObject, useCallback, useEffect, useRef } from 'react';
import {
  focusIsEnteringNativeDialog,
  isAvailableForFocus,
  modalFocusableElements,
  modalScopeManager,
  trapModalTab,
  type ModalScope,
  type ModalScopeManager,
} from './modalScope';

export type ModalCloseReason = 'escape' | 'backdrop' | 'button';

interface ModalAccessibilityOptions {
  open: boolean;
  dialogRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null>;
  returnFocusRef?: RefObject<HTMLElement | null>;
  busy?: boolean;
  onRequestClose: (reason: ModalCloseReason) => void;
}

export function useModalAccessibility({
  open,
  dialogRef,
  initialFocusRef,
  returnFocusRef,
  busy = false,
  onRequestClose,
}: ModalAccessibilityOptions) {
  const current = useRef<{ manager: ModalScopeManager; scope: ModalScope } | null>(null);
  const latest = useRef({ busy, onRequestClose });
  latest.current = { busy, onRequestClose };

  const requestClose = useCallback((reason: ModalCloseReason) => {
    const active = current.current;
    if (!active || latest.current.busy || !active.manager.isTop(active.scope)) return;
    latest.current.onRequestClose(reason);
  }, []);

  useEffect(() => {
    if (!open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const ownerDocument = dialog.ownerDocument;
    const trigger = returnFocusRef?.current ??
      (ownerDocument.activeElement instanceof HTMLElement ? ownerDocument.activeElement : null);
    const manager = modalScopeManager(dialog);
    const focusInitial = () => {
      const preferred = initialFocusRef?.current;
      const target = preferred && dialog.contains(preferred) && isAvailableForFocus(preferred)
        ? preferred
        : modalFocusableElements(dialog, manager.nestedElements(scope))[0] ?? dialog;
      target.focus({ preventScroll: true });
    };
    const scope = manager.register({ element: dialog, kind: 'custom', opener: trigger, focusInitial });
    current.current = { manager, scope };
    if (manager.isTop(scope)) focusInitial();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!manager.isTop(scope)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        requestClose('escape');
      } else if (event.key === 'Tab') {
        trapModalTab(event, dialog, modalFocusableElements(dialog, manager.nestedElements(scope)));
      }
    };
    const handleFocusIn = (event: FocusEvent) => {
      if (!manager.isTop(scope) || dialog.contains(event.target as Node) ||
        focusIsEnteringNativeDialog(dialog, event.target)) return;
      focusInitial();
    };

    ownerDocument.addEventListener('keydown', handleKeyDown, true);
    ownerDocument.addEventListener('focusin', handleFocusIn);
    return () => {
      ownerDocument.removeEventListener('keydown', handleKeyDown, true);
      ownerDocument.removeEventListener('focusin', handleFocusIn);
      // A fullscreen handoff can replace the opener before this scope closes.
      if (returnFocusRef?.current) scope.opener = returnFocusRef.current;
      manager.unregister(scope);
      if (current.current?.scope === scope) current.current = null;
    };
  }, [open, dialogRef, initialFocusRef, returnFocusRef, requestClose]);

  return { requestClose };
}
