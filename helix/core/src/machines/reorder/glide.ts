import type { Frame } from '../../capabilities/types.generated.js'
import type { ReorderInput, ReorderSpan } from './context.js'

/*
 * Where a reorder host glides a dropped item from and to. The host is in
 * `host.ts`, and the two are one file split at the 400 lines a file may have.
 */

/** Where a pointer let a dragged item go, and where the items stood then. */
export interface LetGo {
  /**
   * How far from its place along the axis: as far as the pointer traveled
   * from where it went down, and as far again as the scroller scrolled under
   * it, or `null` where no pointer let it go.
   */
  readonly by: number | null
  /** The item's own extent along the axis. */
  readonly held: ReorderSpan | undefined
  /** The other items' extents, in the order drawn. */
  readonly others: readonly (ReorderSpan | undefined)[]
}

/**
 * A glide, each end measured from the item's place along the axis: where it
 * starts, or `null` to start where the item is drawn, and where it ends.
 */
export interface Glide {
  readonly from: number | null
  readonly to: number
}

/** A frame `by` from the part's place along `axis`. */
export const frameOf = (axis: ReorderInput['axis'], by: number): Frame =>
  axis === 'block' ? { y: by } : { x: by }

/**
 * How far an item travels from place `from` to stand at place `to`: until
 * its leading edge stands where the leading edge of the last item it passes
 * stood, as the others close up behind it. `reversed` is a row laid out from
 * the right. It travels nothing where either edge is not drawn.
 */
export const travelOf = (
  held: ReorderSpan | undefined,
  others: readonly (ReorderSpan | undefined)[],
  from: number,
  to: number,
  reversed: boolean,
): number => {
  const forward = to > from
  const passed = forward ? others[to - 1] : others[to]
  if (held === undefined || passed === undefined || to === from) {
    return 0
  }
  return forward === reversed ? passed.start - held.start : passed.end - held.end
}

/**
 * The glide that lands an item let go at place `to`, from where it was let
 * go to its new place, measured from the place it had.
 *
 * **Where the page has drawn the new order**, the item already stands at its
 * new place, so the glide is measured from there and ends on it. A page that
 * moves its items as it hears `reorder`, or a family that draws the move and
 * the page's new order together, has drawn it by the time the glide starts.
 */
export const landingOf = (
  was: LetGo,
  from: number,
  to: number,
  reversed: boolean,
  drawn: boolean,
): Glide => {
  const by = travelOf(was.held, was.others, from, to, reversed)
  if (!drawn) {
    return { from: was.by, to: by }
  }
  return { from: was.by === null ? null : was.by - by, to: 0 }
}
