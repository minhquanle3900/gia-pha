export type ModalKind = 'custom' | 'native';

interface ModalScopeOptions {
  element: HTMLElement;
  kind: ModalKind;
  opener: HTMLElement | null;
  focusInitial: () => void;
}

export interface ModalScope extends ModalScopeOptions {
  readonly identity: symbol;
}

const focusableSelector = 'a[href], button, input:not([type="hidden"]), select, textarea, [tabindex]';

export function isAvailableForFocus(element: HTMLElement) {
  return element.isConnected && !element.matches(':disabled') &&
    !element.closest('[hidden], [inert], [aria-hidden="true"]') &&
    element.getClientRects().length > 0 && getComputedStyle(element).visibility === 'visible';
}

export function modalFocusableElements(dialog: HTMLElement, nestedScopes: readonly HTMLElement[] = []) {
  return Array.from(dialog.querySelectorAll<HTMLElement>(focusableSelector))
    .filter(element => element.tabIndex >= 0 && isAvailableForFocus(element) &&
      !nestedScopes.some(scope => scope.contains(element)))
    .map((element, order) => ({ element, order }))
    .sort((left, right) => {
      const leftIndex = left.element.tabIndex || Number.MAX_SAFE_INTEGER;
      const rightIndex = right.element.tabIndex || Number.MAX_SAFE_INTEGER;
      return leftIndex - rightIndex || left.order - right.order;
    })
    .map(({ element }) => element);
}

export function trapModalTab(event: KeyboardEvent, dialog: HTMLElement, controls: HTMLElement[]) {
  const first = controls[0];
  const last = controls.at(-1);
  const active = dialog.ownerDocument.activeElement;
  if (!first || !last) {
    event.preventDefault();
    dialog.focus({ preventScroll: true });
  } else if (!controls.includes(active as HTMLElement)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus({ preventScroll: true });
  } else if (event.shiftKey ? active === first : active === last) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus({ preventScroll: true });
  }
}

// showModal() moves focus before its hook can register the new top-layer scope.
export function focusIsEnteringNativeDialog(scope: HTMLElement, target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest('dialog[open]')) &&
    target.closest('dialog[open]') !== scope.closest('dialog[open]');
}

export function createModalScopeManager(ownerDocument: Document) {
  const scopes: ModalScope[] = [];
  let previousBodyOverflow = '';

  const activeScopes = (closing?: ModalScope) => scopes.filter(scope => scope === closing ||
    (scope.element.isConnected && (scope.kind !== 'native' || (scope.element as HTMLDialogElement).open)));

  const top = (closing?: ModalScope): ModalScope | null => {
    const active = activeScopes(closing);
    // Registration follows showModal(), so the last native entry is the physical top layer.
    const native = [...active].reverse().find(scope => scope.kind === 'native');
    const eligible = active.filter(scope => {
      if (scope.kind === 'native') return scope === native;
      if (!native) return true;
      if (!native.element.contains(scope.element)) return false;
      const containingNative = active.filter(candidate => candidate.kind === 'native' &&
        candidate.element.contains(scope.element))
        .find(candidate => !active.some(other => other.kind === 'native' && other !== candidate &&
          candidate.element.contains(other.element) && other.element.contains(scope.element)));
      return containingNative === native;
    });
    return eligible.reduce<ModalScope | null>((current, candidate) => {
      if (!current) return candidate;
      if (candidate === native) return current.kind === 'custom' ? current : candidate;
      if (candidate.element.contains(current.element)) return current;
      return candidate;
    }, null);
  };

  const register = (options: ModalScopeOptions): ModalScope => {
    if (scopes.length === 0) {
      previousBodyOverflow = ownerDocument.body.style.overflow;
      ownerDocument.body.style.overflow = 'hidden';
    }
    const scope = { ...options, identity: Symbol('modal-scope') };
    scopes.push(scope);
    return scope;
  };

  const unregister = (scope: ModalScope) => {
    // Passive cleanup may run after React has detached the closing custom modal.
    const wasTopmost = top(scope) === scope;
    const index = scopes.indexOf(scope);
    if (index < 0) return;
    scopes.splice(index, 1);
    // If a parent closes with its child, the child must return to the parent's opener.
    for (const remaining of scopes) {
      if (remaining.opener && scope.element.contains(remaining.opener)) remaining.opener = scope.opener;
    }
    if (scopes.length === 0) ownerDocument.body.style.overflow = previousBodyOverflow;
    if (!wasTopmost) return;
    const next = top();
    queueMicrotask(() => {
      if (top() !== next) return;
      if (scope.opener && isAvailableForFocus(scope.opener) &&
        (!next || next.element.contains(scope.opener))) {
        scope.opener.focus({ preventScroll: true });
      } else {
        next?.focusInitial();
      }
    });
  };

  return {
    register,
    unregister,
    top,
    isTop: (scope: ModalScope) => top() === scope,
    nestedElements: (scope: ModalScope) => activeScopes()
      .filter(candidate => candidate !== scope && scope.element.contains(candidate.element))
      .map(candidate => candidate.element),
  };
}

export type ModalScopeManager = ReturnType<typeof createModalScopeManager>;
const managers = new WeakMap<Document, ModalScopeManager>();

export function modalScopeManager(element: HTMLElement) {
  const ownerDocument = element.ownerDocument;
  let manager = managers.get(ownerDocument);
  if (!manager) {
    manager = createModalScopeManager(ownerDocument);
    managers.set(ownerDocument, manager);
  }
  return manager;
}
