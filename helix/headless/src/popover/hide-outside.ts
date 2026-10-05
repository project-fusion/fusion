/** What is never hidden: what draws nothing, and what announces. */
const KEEP =
  'script, style, template, link, meta, [aria-live], [role="alert"], [role="log"], [role="status"]'

/**
 * Hides everything on the page from assistive technology except `kept`, and
 * returns a function that shows it again.
 *
 * Climbs from each kept element to the top of the document, through any shadow
 * root it is in, and marks every sibling on the way that holds no kept element
 * with `aria-hidden="true"`. What already says `aria-hidden` is left as it is,
 * and given back as it was. Live regions are kept, so a message that arrives
 * while the page is hidden is still announced.
 *
 * What a modal popover rests on: `Tab` is kept inside the panel, and this keeps
 * a screen reader's virtual cursor there too.
 */
export const hideOutside = (kept: readonly Element[]): (() => void) => {
  const hidden: Element[] = []
  const holds = (element: Element): boolean => kept.some((one) => composedContains(element, one))
  const seen = new Set<Node>()
  for (const start of kept) {
    let node: Node | null = start
    while (node && node !== document.documentElement) {
      const parent: Node | null = node.parentNode
      if (!parent || seen.has(parent)) {
        break
      }
      seen.add(parent)
      for (const sibling of (parent as ParentNode).children ?? []) {
        if (
          sibling === node ||
          holds(sibling) ||
          sibling.matches(KEEP) ||
          sibling.hasAttribute('aria-hidden')
        ) {
          continue
        }
        sibling.setAttribute('aria-hidden', 'true')
        hidden.push(sibling)
      }
      node = parent instanceof ShadowRoot ? parent.host : parent
    }
  }
  return () => {
    for (const one of hidden) {
      one.removeAttribute('aria-hidden')
    }
    hidden.length = 0
  }
}

/** Whether `inner` is `outer` or inside it, through the shadow roots between them. */
const composedContains = (outer: Element, inner: Element): boolean => {
  for (
    let node: Node | null = inner;
    node;
    node = node instanceof ShadowRoot ? node.host : node.parentNode
  ) {
    if (node === outer) {
      return true
    }
  }
  return false
}
