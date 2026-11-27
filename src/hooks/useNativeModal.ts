import { useLayoutEffect, useRef, type RefObject } from 'react';

export function useNativeModal(open: boolean, initialFocusRef?: RefObject<HTMLElement | null>) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    if (!open || !dialog) return;
    const opener = document.activeElement;
    dialog.showModal();
    initialFocusRef?.current?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.target instanceof Element) || event.target.closest('dialog') !== dialog) return;
      if (event.key === 'Escape' && dialog.getAttribute('aria-busy') === 'true') {
        event.preventDefault();
        event.stopPropagation();
        return;
      }
      if (event.key !== 'Tab') return;
      const controls = Array.from(dialog.querySelectorAll<HTMLElement>(
        'button, input, select, textarea, a[href], [tabindex]',
      )).filter((element) => element.tabIndex >= 0 && !element.matches(':disabled') &&
        !element.closest('[hidden], [inert]') && element.getClientRects().length > 0 &&
        getComputedStyle(element).visibility === 'visible');
      const first = controls[0];
      const last = controls.at(-1);
      const active = document.activeElement;
      if (!first || !last || (event.shiftKey ? active === first : active === last)) {
        event.preventDefault();
        (event.shiftKey ? last : first)?.focus();
      }
    };
    dialog.addEventListener('keydown', handleKeyDown);

    return () => {
      dialog.removeEventListener('keydown', handleKeyDown);
      dialog.close();
      if (!(opener instanceof HTMLElement)) return;
      queueMicrotask(() => {
        // React may have detached the dialog before the browser restores focus.
        if ((!dialog.isConnected || !dialog.open) && document.activeElement === document.body && opener.isConnected) {
          opener.focus({ preventScroll: true });
        }
      });
    };
  }, [open, initialFocusRef]);

  return dialogRef;
}
