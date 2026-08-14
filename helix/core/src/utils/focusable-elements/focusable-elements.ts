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
export const focusableElements = (root: HTMLElement): HTMLElement[] => {
  const native = [...root.querySelectorAll<HTMLElement>(NATIVE_FOCUSABLE)]
  const delegating = [...root.querySelectorAll<HTMLElement>('*')].filter(
    (node) => node.shadowRoot?.delegatesFocus === true,
  )
  return [...new Set([...native, ...delegating])].filter((node) => node.getClientRects().length > 0)
}

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
