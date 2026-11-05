/**
 * Elements the platform will focus, without naming a single component.
 *
 * Custom elements are covered separately below: one with `delegatesFocus` is
 * focusable as a host, and that is readable from outside through `shadowRoot`.
 * Listing tag names instead would mean a utility in `core` that only worked for
 * the components `core` happens to know about.
 */
const NATIVE_FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable]:not([contenteditable="false"])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * What takes a press of its own inside a row or an item that is pressable as a
 * whole: a link, a control, a label, a disclosure's summary, or anything a page
 * gave a `tabindex`.
 */
export const PRESSABLE = 'a[href], button, input, label, select, summary, textarea, [tabindex]'

/**
 * Whether a press landed on a control of the item's own, before `boundary` in
 * its path, so the item leaves the press to that control.
 *
 * **The composed path, so a control inside a component counts**: the `<button>`
 * in a slotted Helix button's shadow root is on the path and matches, where the
 * event's retargeted `target` is only the host. The boundary itself and
 * everything past it is not asked, so a row that is a `[tabindex]` stop does
 * not count as its own control.
 */
export const pressedOwnControl = (
  event: Event,
  boundary: EventTarget,
  pressable: string = PRESSABLE,
): boolean => {
  const path = event.composedPath()
  const end = path.indexOf(boundary)
  return path
    .slice(0, end < 0 ? 0 : end)
    .some((node) => node instanceof Element && node.matches(pressable))
}

/**
 * Everything inside `root` the reader can reach with Tab, in document order.
 *
 * Roving tabindex, arrow-key navigation and "focus the first thing" all need
 * this list, which is why it is a utility rather than part of anything that
 * asks for it.
 *
 * Visibility is tested with `getClientRects()` rather than `offsetParent`,
 * which is null for anything inside a `position: fixed` container, so the
 * `offsetParent` test excluded every control on a raised surface.
 */
export const focusableElements = (root: HTMLElement): HTMLElement[] =>
  /* One pass asking both questions, rather than two passes concatenated.
   *
   * Two lists joined end to end is not document order: every native element
   * followed by every delegating host comes out `b d a c` for a tree holding
   * `a b c d`, measured. A caller reading `items[0]` and `items.at(-1)` as the
   * ends of a surface gets a last that is not last wherever that surface's
   * final control is a plain `<button>` and its first is a Helix component.
   *
   * It is invisible in a set that is all one kind, which is what every example
   * and every spec had. A single filtered walk cannot express the fault, and
   * dedup comes free with it: a delegating host that also matches the native
   * selector is visited once because it is one node. */
  [...root.querySelectorAll<HTMLElement>('*')].filter(
    (node) =>
      (node.matches(NATIVE_FOCUSABLE) || node.shadowRoot?.delegatesFocus === true) &&
      node.getClientRects().length > 0,
  )

/**
 * The truly focused element, following shadow roots down.
 *
 * `document.activeElement` stops at the outermost host, so a button inside two
 * shadow roots reports as the component rather than as itself.
 */
export const deepActiveElement = (): Element | null => {
  let active = document.activeElement
  while (active?.shadowRoot?.activeElement) {
    active = active.shadowRoot.activeElement
  }
  return active
}

/**
 * Whether `node` sits inside `root`, following shadow boundaries upward.
 *
 * `Node.contains` walks `parentNode` and a shadow root's `parentNode` is null,
 * so it answers false for anything inside a component. Paired with
 * `deepActiveElement`, which returns exactly such a node, the pair is a hazard of
 * its own: the two look like they belong together and one of them crosses.
 *
 * `contains(deepActiveElement())` is the shape to avoid: focus on a
 * `helix-button` reports as the `<button>` in its shadow root, which is in no
 * light-DOM container anywhere, so a containment test written that way reads
 * every reader as already outside.
 *
 * `host` is reached without naming `ShadowRoot`, which the server has no global
 * for. This runs from a keydown handler and would never execute there, but a
 * bare reference is the kind that surfaces as a crash in Lit's result collector
 * the first time something calls it early.
 */
export const deepContains = (root: Node, node: Node | null): boolean => {
  let current: Node | null = node
  while (current) {
    if (current === root) {
      return true
    }
    current = current.parentNode ?? ((current as ShadowRoot).host as Node | undefined) ?? null
  }
  return false
}

/**
 * The element inside `root` marked `autofocus`, once it can take focus, or
 * `null` where nothing is marked.
 *
 * For a modal whose contents are components. A `<dialog>`'s focusing steps
 * look for `autofocus`, and Chromium's skip a component host that delegates
 * focus, so a dialog with a close control opened with focus on the close
 * control rather than the action marked. It waits on two things first: the
 * end of parsing, because a dialog opened from markup while the page is still
 * loading opens before the parser has added its contents, and the marked
 * element's first render, because a host has nothing to delegate to before it.
 */
export const autofocusTarget = async (root: HTMLElement): Promise<HTMLElement | null> => {
  const document = root.ownerDocument
  if (document.readyState === 'loading') {
    await new Promise((resolve) =>
      document.addEventListener('DOMContentLoaded', resolve, { once: true }),
    )
  }
  const marked = root.querySelector<HTMLElement & Partial<{ updateComplete: Promise<unknown> }>>(
    '[autofocus]',
  )
  await marked?.updateComplete
  return marked
}

/**
 * How a modal moves focus as it opens: with a ring where the reader came by
 * keyboard, and without one where they came by pointer or by nothing at all.
 *
 * Read before the modal opens, while the control that opened it still holds
 * focus, and passed to every focus the modal then moves. **WebKit counts a
 * focus a script moves as one the keyboard made**: a Drawer opened by a tap
 * drew a ring on its close control in WebKit and on iOS, where Chromium drew
 * none, and its own dialog focusing does the same.
 */
export const openingFocus = (): FocusOptions =>
  ({ focusVisible: deepActiveElement()?.matches(':focus-visible') ?? false }) as FocusOptions

/**
 * Focuses `element` with `options`, letting go first where it has focus
 * already: WebKit takes a focus on the element that has it as nothing to do,
 * and kept the ring its own dialog focusing step drew.
 */
export const focusAs = (element: HTMLElement, options: FocusOptions): void => {
  if (deepActiveElement() === element) {
    element.blur()
  }
  element.focus(options)
}

/**
 * Focuses the element that has focus again, with `options`, so a ring the
 * browser drew for its own focusing step follows how the reader came. Only
 * where that element is inside `root`.
 */
export const refocusWithin = (root: HTMLElement, options: FocusOptions): void => {
  const active = deepActiveElement()
  if (active instanceof HTMLElement && deepContains(root, active)) {
    focusAs(active, options)
  }
}
