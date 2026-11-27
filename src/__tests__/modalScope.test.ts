import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createModalScopeManager,
  focusIsEnteringNativeDialog,
  modalFocusableElements,
  trapModalTab,
  type ModalKind,
} from '../hooks/modalScope';

class FocusDocument {
  body = { style: { overflow: 'auto' } };
  activeElement: FocusElement | null = null;
}

class FocusElement {
  isConnected = true;
  open = false;
  tabIndex = 0;
  disabled = false;
  hidden = false;
  inert = false;
  ariaHidden = false;
  visible = true;
  hasRect = true;
  parent: FocusElement | null = null;
  children: FocusElement[] = [];
  focus = vi.fn(() => { this.ownerDocument.activeElement = this; });

  constructor(readonly ownerDocument: FocusDocument, readonly tag = 'button') {}

  append(child: FocusElement) {
    child.parent = this;
    this.children.push(child);
    return child;
  }

  detach() {
    if (this.parent) this.parent.children = this.parent.children.filter(child => child !== this);
    this.parent = null;
    this.isConnected = false;
  }

  contains(element: FocusElement | null): boolean {
    return element === this || this.children.some(child => child.contains(element));
  }

  matches(selector: string) { return selector === ':disabled' && this.disabled; }

  closest(selector: string): FocusElement | null {
    if (selector === 'dialog[open]') {
      if (this.tag === 'dialog' && this.open) return this;
    } else if (this.hidden || this.inert || this.ariaHidden) return this;
    return this.parent?.closest(selector) ?? null;
  }

  getClientRects() { return this.hasRect ? [{}] : []; }

  querySelectorAll(): FocusElement[] {
    return this.children.flatMap(child => [child, ...child.querySelectorAll()]);
  }
}

const element = (value: FocusElement) => value as unknown as HTMLElement;
const document = (value: FocusDocument) => value as unknown as Document;

beforeEach(() => {
  vi.stubGlobal('getComputedStyle', (value: FocusElement) => ({ visibility: value.visible ? 'visible' : 'hidden' }));
  vi.stubGlobal('Element', FocusElement);
});
afterEach(() => { vi.unstubAllGlobals(); });

function setup() {
  const doc = new FocusDocument();
  const manager = createModalScopeManager(document(doc));
  const make = (tag?: string) => new FocusElement(doc, tag);
  const register = (root: FocusElement, kind: ModalKind = 'custom', opener: FocusElement | null = null) => {
    if (kind === 'native') root.open = true;
    return manager.register({ element: element(root), kind, opener: opener && element(opener), focusInitial: vi.fn() });
  };
  return { doc, manager, make, register };
}

describe('shared custom/native modal scope', () => {
  it('keeps the latest unrelated custom modal active', () => {
    const { manager, make, register } = setup();
    register(make());
    const second = register(make());
    expect(manager.top()).toBe(second);
  });

  it('does not let a later parent effect replace its already registered custom child', () => {
    const { manager, make, register } = setup();
    const parent = make('section');
    const child = parent.append(make('section'));
    const inner = register(child);
    register(parent);
    expect(manager.top()).toBe(inner);
  });

  it('keeps a native child above its custom parent regardless of effect order', () => {
    const { manager, make, register } = setup();
    const parent = make('section');
    const native = register(parent.append(make('dialog')), 'native');
    register(parent);
    expect(manager.top()).toBe(native);
  });

  it('suspends a custom sibling that cannot render above a native top layer', () => {
    const { manager, make, register } = setup();
    const native = register(make('dialog'), 'native');
    const custom = register(make('section'));
    expect(manager.isTop(custom)).toBe(false);
    expect(manager.top()).toBe(native);
  });

  it('allows a custom child rendered inside the current native dialog', () => {
    const { manager, make, register } = setup();
    const nativeRoot = make('dialog');
    register(nativeRoot, 'native');
    const custom = register(nativeRoot.append(make('section')));
    expect(manager.top()).toBe(custom);
  });

  it('follows native showModal order even when DOM ancestry points the other way', () => {
    const { manager, make, register } = setup();
    const parentRoot = make('dialog');
    const childRoot = parentRoot.append(make('dialog'));
    register(childRoot, 'native');
    const parent = register(parentRoot, 'native');
    expect(manager.top()).toBe(parent);
  });

  it('does not promote a custom child inside a covered native layer', () => {
    const { manager, make, register } = setup();
    const parentRoot = make('dialog');
    const childRoot = parentRoot.append(make('dialog'));
    register(childRoot, 'native');
    const parent = register(parentRoot, 'native');
    register(childRoot.append(make('section')));
    expect(manager.top()).toBe(parent);
  });

  it('ignores native scopes after the dialog closes and custom scopes after detach', () => {
    const { manager, make, register } = setup();
    const base = register(make());
    const nativeRoot = make('dialog');
    register(nativeRoot, 'native');
    nativeRoot.open = false;
    const detached = make();
    register(detached);
    detached.isConnected = false;
    expect(manager.top()).toBe(base);
  });

  it('shares the body scroll lock until the final scope leaves', () => {
    const { doc, manager, make, register } = setup();
    const parent = register(make());
    const native = register(make('dialog'), 'native');
    expect(doc.body.style.overflow).toBe('hidden');
    manager.unregister(parent);
    expect(doc.body.style.overflow).toBe('hidden');
    manager.unregister(native);
    expect(doc.body.style.overflow).toBe('auto');
  });

  it('restores the exact custom-parent control after its native child closes', async () => {
    const { doc, manager, make, register } = setup();
    const parentRoot = make('section');
    const opener = parentRoot.append(make());
    const parent = register(parentRoot);
    const childRoot = make('dialog');
    const child = register(childRoot, 'native', opener);
    manager.unregister(child);
    childRoot.open = false;
    await Promise.resolve();
    expect(doc.activeElement).toBe(opener);
    expect(parent.focusInitial).not.toHaveBeenCalled();
    expect(manager.top()).toBe(parent);
  });

  it('restores the native-parent control after a custom child closes', async () => {
    const { doc, manager, make, register } = setup();
    const nativeRoot = make('dialog');
    register(nativeRoot, 'native');
    const opener = nativeRoot.append(make());
    const child = register(nativeRoot.append(make('section')), 'custom', opener);
    manager.unregister(child);
    await Promise.resolve();
    expect(doc.activeElement).toBe(opener);
  });

  it('restores the native opener after the custom child is removed from its DOM parent', async () => {
    const { doc, manager, make, register } = setup();
    const nativeRoot = make('dialog');
    register(nativeRoot, 'native');
    const opener = nativeRoot.append(make());
    const customRoot = nativeRoot.append(make('section'));
    const child = register(customRoot, 'custom', opener);
    customRoot.detach();
    expect(nativeRoot.contains(customRoot)).toBe(false);
    manager.unregister(child);
    await Promise.resolve();
    expect(doc.activeElement).toBe(opener);
  });

  it('restores each opener through native/custom/native nesting after DOM removal', async () => {
    const { doc, manager, make, register } = setup();
    const nativeRoot = make('dialog');
    const native = register(nativeRoot, 'native');
    const nativeOpener = nativeRoot.append(make());
    const customRoot = nativeRoot.append(make('section'));
    const custom = register(customRoot, 'custom', nativeOpener);
    const customOpener = customRoot.append(make());
    const grandchildRoot = customRoot.append(make('dialog'));
    const grandchild = register(grandchildRoot, 'native', customOpener);
    grandchildRoot.detach();
    manager.unregister(grandchild);
    grandchildRoot.open = false;
    await Promise.resolve();
    expect(doc.activeElement).toBe(customOpener);
    expect(manager.top()).toBe(custom);
    customRoot.detach();
    manager.unregister(custom);
    await Promise.resolve();
    expect(doc.activeElement).toBe(nativeOpener);
    expect(manager.top()).toBe(native);
  });

  it('rebases a child opener when the parent and child close together', async () => {
    const { doc, manager, make, register } = setup();
    const pageButton = make();
    const parentRoot = make('section');
    const childOpener = parentRoot.append(make());
    const parent = register(parentRoot, 'custom', pageButton);
    const child = register(make('dialog'), 'native', childOpener);
    manager.unregister(parent);
    parentRoot.isConnected = false;
    childOpener.isConnected = false;
    manager.unregister(child);
    await Promise.resolve();
    expect(doc.activeElement).toBe(pageButton);
  });

  it('does not steal focus from a new modal opened before queued restoration', async () => {
    const { doc, manager, make, register } = setup();
    const pageButton = make();
    const old = register(make(), 'custom', pageButton);
    manager.unregister(old);
    const next = register(make('dialog'), 'native');
    await Promise.resolve();
    expect(doc.activeElement).toBeNull();
    expect(pageButton.focus).not.toHaveBeenCalled();
    expect(manager.top()).toBe(next);
  });

  it('restores focus when React detaches the top custom modal before passive cleanup', async () => {
    const { doc, manager, make, register } = setup();
    const opener = make();
    const root = make('section');
    const modal = register(root, 'custom', opener);
    root.isConnected = false;
    manager.unregister(modal);
    await Promise.resolve();
    expect(doc.activeElement).toBe(opener);
    expect(doc.body.style.overflow).toBe('auto');
  });

  it.each(['parent-first', 'child-first'])('restores the page after both DOM nodes detach (%s cleanup)', async order => {
    const { doc, manager, make, register } = setup();
    const pageButton = make();
    const parentRoot = make('section');
    const childOpener = parentRoot.append(make());
    const childRoot = make('dialog');
    const parent = register(parentRoot, 'custom', pageButton);
    const child = register(childRoot, 'native', childOpener);
    parentRoot.isConnected = false;
    childOpener.isConnected = false;
    childRoot.isConnected = false;
    for (const scope of order === 'parent-first' ? [parent, child] : [child, parent]) manager.unregister(scope);
    await Promise.resolve();
    expect(doc.activeElement).toBe(pageButton);
    expect(doc.body.style.overflow).toBe('auto');
  });

  it('uses the remaining modal initial focus when the old trigger is detached', async () => {
    const { manager, make, register } = setup();
    const parentRoot = make('section');
    const parent = register(parentRoot);
    const opener = parentRoot.append(make());
    const child = register(make('dialog'), 'native', opener);
    opener.isConnected = false;
    manager.unregister(child);
    await Promise.resolve();
    expect(parent.focusInitial).toHaveBeenCalledOnce();
  });

  it('yields while showModal moves focus before native scope registration', () => {
    const { make } = setup();
    const customRoot = make('section');
    const native = customRoot.append(make('dialog'));
    native.open = true;
    const target = native.append(make());
    expect(focusIsEnteringNativeDialog(element(customRoot), element(target))).toBe(true);
    expect(focusIsEnteringNativeDialog(element(native), element(target))).toBe(false);
  });
});

describe('sequential modal focus boundaries', () => {
  it.each(['button', 'input', 'select', 'textarea', 'a'])(
    'excludes a native %s explicitly removed from the Tab order', tag => {
      const { make } = setup();
      const root = make('section');
      const skipped = root.append(make(tag));
      skipped.tabIndex = -1;
      const expected = root.append(make());
      expect(modalFocusableElements(element(root))).toEqual([expected]);
    },
  );

  it('excludes negative tabindex values other than minus one', () => {
    const { make } = setup();
    const root = make('section');
    root.append(make()).tabIndex = -2;
    expect(modalFocusableElements(element(root))).toEqual([]);
  });

  it('excludes disabled, hidden, inert, aria-hidden and invisible controls', () => {
    const { make } = setup();
    const root = make('section');
    root.append(make()).disabled = true;
    root.append(make()).hidden = true;
    root.append(make()).inert = true;
    root.append(make()).ariaHidden = true;
    root.append(make()).visible = false;
    root.append(make()).hasRect = false;
    const available = root.append(make());
    expect(modalFocusableElements(element(root))).toEqual([available]);
  });

  it('keeps nested modal controls out of parent boundaries', () => {
    const { manager, make, register } = setup();
    const root = make('section');
    const parent = register(root);
    const first = root.append(make());
    const nested = root.append(make('dialog'));
    nested.append(make());
    register(nested, 'native');
    const last = root.append(make());
    expect(modalFocusableElements(element(root), manager.nestedElements(parent))).toEqual([first, last]);
  });

  it('orders positive tabindex values before ordinary sequential controls', () => {
    const { make } = setup();
    const root = make('section');
    const zero = root.append(make());
    const two = root.append(make());
    two.tabIndex = 2;
    const one = root.append(make());
    one.tabIndex = 1;
    expect(modalFocusableElements(element(root))).toEqual([one, two, zero]);
  });

  it.each([false, true])('moves from a programmatic heading into real Tab controls (shift %s)', shiftKey => {
    const { doc, make } = setup();
    const root = make('section');
    const heading = root.append(make('h2'));
    heading.tabIndex = -1;
    const first = root.append(make());
    const last = root.append(make());
    doc.activeElement = heading;
    const preventDefault = vi.fn();
    trapModalTab({ shiftKey, preventDefault } as unknown as KeyboardEvent, element(root), [element(first), element(last)]);
    expect(doc.activeElement).toBe(shiftKey ? last : first);
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it.each([false, true])('wraps only at the current modal edge (shift %s)', shiftKey => {
    const { doc, make } = setup();
    const root = make('section');
    const first = root.append(make());
    const last = root.append(make());
    doc.activeElement = shiftKey ? first : last;
    const preventDefault = vi.fn();
    trapModalTab({ shiftKey, preventDefault } as unknown as KeyboardEvent, element(root), [element(first), element(last)]);
    expect(doc.activeElement).toBe(shiftKey ? last : first);
    expect(preventDefault).toHaveBeenCalledOnce();
  });

  it('focuses the modal root when no sequential control remains', () => {
    const { doc, make } = setup();
    const root = make('section');
    const preventDefault = vi.fn();
    trapModalTab({ shiftKey: false, preventDefault } as unknown as KeyboardEvent, element(root), []);
    expect(doc.activeElement).toBe(root);
    expect(preventDefault).toHaveBeenCalledOnce();
  });
});
