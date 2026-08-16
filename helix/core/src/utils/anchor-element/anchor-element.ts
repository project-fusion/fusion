/** How far to descend before giving up on finding a box. */
const DEPTH = 4

/**
 * The element a floating surface should open against, given the slot it wraps.
 *
 * **A wrapper with no box is not an anchor.** `display: contents` puts an
 * element's children into the layout and leaves the element itself without a
 * box, so its `getBoundingClientRect()` is `0 0 0 0`. Measured: a tooltip host
 * reports exactly that while the button inside it reports 32 by 32. Anchoring
 * to it opens the surface against the top left of the window, and focusing it
 * on close puts focus nowhere.
 *
 * That is not an edge case, because wrapping is how a tooltip attaches to the
 * thing it describes. Without this, an icon button used as a trigger is the one
 * button on a toolbar that cannot have a tooltip.
 *
 * So this descends past anything that draws nothing, and the first child with a
 * box is the anchor. The wrapper is transparent by construction, so the thing
 * with the box is the thing the reader is pointing at.
 *
 * Bounded rather than a walk to the leaves: a chain of box-less wrappers is
 * already unusual, and descending without a limit through a tree this library
 * does not own is worse than stopping and anchoring to something imperfect.
 */
export const anchorElement = (
  slot: HTMLSlotElement | null | undefined,
  fallback: HTMLElement,
): HTMLElement => {
  const assigned = slot?.assignedElements({ flatten: true })[0] as HTMLElement | undefined
  if (!assigned) {
    return fallback
  }

  let element = assigned
  for (let depth = 0; depth < DEPTH; depth += 1) {
    const child = element.firstElementChild as HTMLElement | null
    if (!child || element.getClientRects().length > 0) {
      return element
    }
    element = child
  }
  return element
}
