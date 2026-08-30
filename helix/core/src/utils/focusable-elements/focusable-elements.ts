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
 * Everything inside `root` the reader can reach with Tab, in document order.
 *
 * Separate from the focus trap because finding is the half most callers want:
 * roving tabindex, arrow-key navigation and "focus the first thing" all need
 * this list and none of them traps anything.
 *
 * Visibility is tested with `getClientRects()` rather than `offsetParent`,
 * which is null for anything inside a `position: fixed` container. A drawer is
 * exactly that, so the `offsetParent` test excluded every control in the thing
 * being trapped.
 */
export const focusableElements = (root: HTMLElement): HTMLElement[] =>
  /* One pass asking both questions, rather than two passes concatenated.
   *
   * Two lists joined end to end is not document order: every native element
   * followed by every delegating host comes out `b d a c` for a tree holding
   * `a b c d`, measured. The trap reads `items[0]` and `items.at(-1)` as its
   * boundaries, so a surface whose last control is a plain `<button>` and whose
   * first is a Helix component has a last that is not last, forward Tab off the
   * real end does not wrap, and focus leaves the dialog.
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
 * `deepActiveElement`, which returns exactly such a node, that pairing is a trap
 * of its own: the two look like they belong together and one of them crosses.
 *
 * `contains(deepActiveElement())` is the shape to avoid: focus on a
 * `helix-button` reports as the `<button>` in its shadow root, which is in no
 * light-DOM container anywhere, so a trap written that way reads every reader
 * as already outside it.
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
