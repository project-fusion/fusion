/** The ARIA properties that take elements rather than ids. */
export type ElementsProperty = 'ariaDescribedByElements' | 'ariaLabelledByElements'

/** An element with ARIA element reflection, where the engine has it. */
type Reflecting = Element & Partial<Record<ElementsProperty, Element[] | null>>

/**
 * Writes elements onto an ARIA element-reflection property of `target`, or
 * clears it, and says whether the property is now this caller's.
 *
 * Element references, because the words are in the light DOM and the panel in
 * a shadow root, which an IDREF cannot cross. Nothing is written where the
 * engine has no reflection, which keeps the fallback name, and the answer is
 * then `owned` as it was. **An empty list clears the property only where the
 * caller wrote it**, which `owned` says, so a name another hand wrote stays.
 *
 * Dialog and Drawer name their panel by its header this way, Popover by its
 * first heading, Dialog describes itself by its body, and a Tour stop names
 * and describes its panel.
 */
export const reflectElements = (
  target: Element | null | undefined,
  property: ElementsProperty,
  elements: readonly Element[],
  owned: boolean,
): boolean => {
  const element = target as Reflecting | null | undefined
  if (!element || !(property in element)) {
    return owned
  }
  if (elements.length > 0) {
    element[property] = elements as Element[]
    return true
  }
  if (owned) {
    element[property] = null
  }
  return false
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
 * Existing references are kept, so a field's hint still describes it. Tooltip
 * describes its trigger this way.
 */
export const linkDescription = (target: Element, by: Element, light: boolean): boolean => {
  const element = target as Reflecting
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
  const element = target as Reflecting
  const current = element.ariaDescribedByElements
  if (!current?.includes(by)) {
    return
  }
  const rest = current.filter((one) => one !== by)
  element.ariaDescribedByElements = rest.length > 0 ? rest : null
}
