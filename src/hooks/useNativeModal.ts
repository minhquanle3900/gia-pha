import { useLayoutEffect, useRef, type RefObject } from 'react';
import {
  focusIsEnteringNativeDialog,
  guardNativeModalCancel,
  isAvailableForFocus,
  modalFocusableElements,
  modalScopeManager,
  trapModalTab,
} from './modalScope';

export function useNativeModal(open: boolean, initialFocusRef?: RefObject<HTMLElement | null>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const ownerDocument = dialog.ownerDocument;
    const opener = ownerDocument.activeElement instanceof HTMLElement ? ownerDocument.activeElement : null;
    dialog.showModal();
    const manager = modalScopeManager(dialog);
    const focusInitial = () => {
      const preferred = initialFocusRef?.current;
      const target = preferred && dialog.contains(preferred) && isAvailableForFocus(preferred)
        ? preferred
        : modalFocusableElements(dialog, manager.nestedElements(scope))[0] ?? dialog;
      target.focus({ preventScroll: true });
    };
    const scope = manager.register({ element: dialog, kind: 'native', opener, focusInitial });
    if (manager.isTop(scope)) focusInitial();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!manager.isTop(scope)) return;
      if (event.key === 'Escape' && dialog.getAttribute('aria-busy') === 'true') {
        event.preventDefault();
        event.stopPropagation();
      } else if (event.key === 'Tab') {
        trapModalTab(event, dialog, modalFocusableElements(dialog, manager.nestedElements(scope)));
      }
    };
    const handleCancel = (event: Event) => {
      guardNativeModalCancel(event, dialog, !manager.isTop(scope) || dialog.getAttribute('aria-busy') === 'true');
    };
    const handleFocusIn = (event: FocusEvent) => {
      if (!manager.isTop(scope) || dialog.contains(event.target as Node) ||
        focusIsEnteringNativeDialog(dialog, event.target)) return;
      focusInitial();
    };
    ownerDocument.addEventListener('keydown', handleKeyDown, true);
    ownerDocument.addEventListener('focusin', handleFocusIn);
    dialog.addEventListener('cancel', handleCancel, true);

    return () => {
      ownerDocument.removeEventListener('keydown', handleKeyDown, true);
      ownerDocument.removeEventListener('focusin', handleFocusIn);
      dialog.removeEventListener('cancel', handleCancel, true);
      manager.unregister(scope);
      dialog.close();
    };
  }, [open, initialFocusRef]);

  return dialogRef;
}
