import { useLayoutEffect, useRef, type RefObject } from 'react';

export function useNativeModal(open: boolean, initialFocusRef?: RefObject<HTMLElement | null>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const opener = document.activeElement;
    dialog.showModal();
    initialFocusRef?.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      if (!(opener instanceof HTMLElement)) return;
      queueMicrotask(() => {
        // React may have detached the dialog before the browser restores focus.
        if (!dialog.open && document.activeElement === document.body && opener.isConnected) {
          opener.focus({ preventScroll: true });
        }
      });
    };
  }, [open, initialFocusRef]);

  return dialogRef;
}
