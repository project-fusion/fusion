/** An element with ARIA element reflection, where the engine has it. */
type Describable = Element & { ariaDescribedByElements?: Element[] | null }

/** What takes focus inside a component that hands its focus on. */
const CONTROL =
  'a[href], button, input, select, textarea, [contenteditable], [tabindex]:not([tabindex="-1"])'

/**
 * The element focus lands on when a trigger is focused: the trigger itself,
 * or, for a component that delegates focus, the control inside its shadow root,
 * followed down through any component nested there.
 */
export const focusTarget = (trigger: Element): Element => {
  const root = trigger.shadowRoot
  if (!root?.delegatesFocus) {
    return trigger
  }
  const inner = root.querySelector(CONTROL)
  return inner ? focusTarget(inner) : trigger
}

/**
 * Adds `by` to the elements that describe `target`, where that is safe, and
 * says whether `target` is now described by it.
 *
 * Through element reflection, and only where no framework is watching:
 *
 * - **Inside a shadow root**, such as the `<button>` a Helix button draws, it
 *   is always safe. That markup is the component's own, and no server sent it.
 * - **In the light DOM**, the element is the consumer's, and reflection writes
 *   an empty `aria-describedby` onto it. So it is written only when `light` is
 *   set, which a caller does once a reader has acted on the page, after any
 *   hydration, and never where the consumer wrote `aria-describedby` or
 *   `aria-labelledby` themselves, which are theirs to keep.
 *
 * Existing references are kept, so a field's hint still describes it.
 */
export const linkDescription = (target: Element, by: Element, light: boolean): boolean => {
  const element = target as Describable
  if (!('ariaDescribedByElements' in element)) {
    return false
  }
  const current = element.ariaDescribedByElements ?? []
  if (current.includes(by)) {
    return true
  }
  const shadowed = typeof ShadowRoot !== 'undefined' && target.getRootNode() instanceof ShadowRoot
  if (
    !shadowed &&
    (!light || target.hasAttribute('aria-describedby') || target.hasAttribute('aria-labelledby'))
  ) {
    return false
  }
  element.ariaDescribedByElements = [...current, by]
  return true
}

/** Takes `by` back off the elements that describe `target`, leaving the rest. */
export const unlinkDescription = (target: Element, by: Element): void => {
  const element = target as Describable
  const current = element.ariaDescribedByElements
  if (!current?.includes(by)) {
    return
  }
  const rest = current.filter((one) => one !== by)
  element.ariaDescribedByElements = rest.length > 0 ? rest : null
}
