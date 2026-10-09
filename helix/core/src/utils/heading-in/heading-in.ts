/**
 * What counts as a heading: the six levels, anything that says it is one, and
 * an element that draws one of the six from `as`, such as
 * `<helix-text as="h3">`. That one's heading is in its shadow root, which a
 * selector run from the page cannot see, so the element counts as the heading.
 */
const HEADING = [
  'h1, h2, h3, h4, h5, h6',
  '[role="heading"]',
  '[as="h1"], [as="h2"], [as="h3"], [as="h4"], [as="h5"], [as="h6"]',
].join(', ')

/**
 * The first heading among some elements or inside them, in order, or `null`.
 *
 * What names a panel when nothing else does: Popover's panel and a Tour stop
 * by the first heading in their content. An element reference rather than an
 * id, because the heading is in the light DOM and the panel in a shadow root,
 * which an IDREF cannot cross.
 */
export const headingIn = (elements: readonly Element[]): Element | null => {
  for (const one of elements) {
    const found = one.matches(HEADING) ? one : one.querySelector(HEADING)
    if (found) {
      return found
    }
  }
  return null
}

/**
 * The first heading among some elements or inside them, or the elements
 * themselves where none is a heading or holds one.
 *
 * What names Dialog and Drawer by their `header` slot. A header can hold a
 * close button beside its title, and a name that read "Delete project Close"
 * would be worse than the title alone; a header with no heading in it is
 * still all the name there is.
 */
export const headingsIn = (elements: readonly Element[]): Element[] => {
  const heading = headingIn(elements)
  return heading ? [heading] : [...elements]
}
