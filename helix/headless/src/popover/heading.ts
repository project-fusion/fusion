const HEADING = 'h1, h2, h3, h4, h5, h6, [role="heading"]'

/**
 * The first heading among some elements or inside them, in order, which is
 * what names a popover's panel when nothing else does.
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
