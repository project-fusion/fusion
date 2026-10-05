/**
 * The elements and roles that take a header out of the banner landmark.
 *
 * HTML-AAM maps `<header>` to `banner` only where its nearest sectioning
 * ancestor is the body. Inside `article`, `aside`, `main`, `nav` or `section`
 * it is a generic box, and the explicit roles of those elements count the same.
 */
const SECTIONING = [
  'article',
  'aside',
  'main',
  'nav',
  'section',
  '[role="article"]',
  '[role="complementary"]',
  '[role="main"]',
  '[role="navigation"]',
  '[role="region"]',
].join(', ')

/**
 * Whether an element sits inside sectioning content, read across shadow
 * boundaries as the accessibility tree reads it: through the slot an element
 * is assigned to, so a header slotted into a component that draws a `<nav>`
 * around its slot, as `Navigation` does, is inside that `<nav>`.
 *
 * Client only: a server has no ancestors to read.
 */
export const inSectioningContent = (element: Element): boolean => {
  let node: Element | null = above(element)
  while (node) {
    if (node.matches(SECTIONING)) {
      return true
    }
    node = above(node)
  }
  return false
}

/** The element above this one in the flat tree, which is the one a reader is in. */
const above = (element: Element): Element | null =>
  element.assignedSlot ?? element.parentElement ?? hostOf(element)

/** The host of the shadow root an element sits in, or nothing. */
const hostOf = (element: Element): Element | null => {
  const root = element.getRootNode()
  return root instanceof ShadowRoot ? root.host : null
}
