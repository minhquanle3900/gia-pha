import { useEffect, useRef, useState } from 'react';
import { useModalAccessibility } from './useModalAccessibility';

export function useWorkspaceFullscreen() {
  const panelRef = useRef<HTMLDivElement>(null);
  const returnRef = useRef<HTMLElement | null>(null);
  const pendingAction = useRef<(() => void) | null>(null);
  const [native, setNative] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState('');
  const active = native || expanded;

  useEffect(() => {
    const changed = () => setNative(document.fullscreenElement === panelRef.current);
    document.addEventListener('fullscreenchange', changed);
    return () => document.removeEventListener('fullscreenchange', changed);
  }, []);

  const leave = async () => {
    if (document.fullscreenElement === panelRef.current) {
      try { await document.exitFullscreen(); }
      catch { setError('Hãy thoát toàn màn hình trước khi mở cửa sổ khác.'); return false; }
    }
    setExpanded(false);
    setError('');
    return true;
  };

  const { requestClose } = useModalAccessibility({
    open: active,
    dialogRef: panelRef,
    returnFocusRef: returnRef,
    onRequestClose: () => { void leave(); },
  });

  useEffect(() => {
    if (active || !pendingAction.current) return;
    const action = pendingAction.current;
    pendingAction.current = null;
    action();
  }, [active]);

  const toggle = async () => {
    if (active) { await leave(); return; }
    returnRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setError('');
    if (document.fullscreenEnabled && panelRef.current?.requestFullscreen) {
      try { await panelRef.current.requestFullscreen(); return; }
      catch { /* The viewport mode remains available when native fullscreen is unavailable. */ }
    }
    setExpanded(true);
  };

  const runOutside = (action: () => void) => {
    if (!active) { action(); return; }
    pendingAction.current = action;
    void leave().then(left => { if (!left) pendingAction.current = null; });
  };

  return { panelRef, active, mode: native ? 'native' : expanded ? 'viewport' : 'inline', error, toggle, runOutside, requestClose };
}
