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
  const ancestors = new Map<ModalScope, Set<ModalScope>>();
  let previousBodyOverflow = '';

  const rememberAncestry = () => {
    for (const inner of scopes) {
      if (!inner.element.isConnected) continue;
      const remembered = ancestors.get(inner) ?? new Set<ModalScope>();
      for (const outer of scopes) {
        if (outer === inner || !outer.element.isConnected) continue;
        if (outer.element.contains(inner.element)) remembered.add(outer);
        else remembered.delete(outer);
      }
      ancestors.set(inner, remembered);
    }
  };

  const containsScope = (outer: ModalScope, inner: ModalScope) =>
    outer.element.isConnected && inner.element.isConnected
      ? outer.element.contains(inner.element)
      : ancestors.get(inner)?.has(outer) ?? false;

  const activeScopes = (closing?: ModalScope) => scopes.filter(scope => scope === closing ||
    (scope.element.isConnected && (scope.kind !== 'native' || (scope.element as HTMLDialogElement).open)));

  const top = (closing?: ModalScope): ModalScope | null => {
    rememberAncestry();
    const active = activeScopes(closing);
    // Registration follows showModal(), so the last native entry is the physical top layer.
    const native = [...active].reverse().find(scope => scope.kind === 'native');
    const eligible = active.filter(scope => {
      if (scope.kind === 'native') return scope === native;
      if (!native) return true;
      if (!containsScope(native, scope)) return false;
      const containingNative = active.filter(candidate => candidate.kind === 'native' &&
        containsScope(candidate, scope))
        .find(candidate => !active.some(other => other.kind === 'native' && other !== candidate &&
          containsScope(candidate, other) && containsScope(other, scope)));
      return containingNative === native;
    });
    return eligible.reduce<ModalScope | null>((current, candidate) => {
      if (!current) return candidate;
      if (candidate === native) return current.kind === 'custom' ? current : candidate;
      if (containsScope(candidate, current)) return current;
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
    rememberAncestry();
    return scope;
  };

  const unregister = (scope: ModalScope) => {
    // Passive cleanup may run after React has detached the closing custom modal.
    const wasTopmost = top(scope) === scope;
    const index = scopes.indexOf(scope);
    if (index < 0) return;
    scopes.splice(index, 1);
    ancestors.delete(scope);
    for (const remembered of ancestors.values()) remembered.delete(scope);
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
