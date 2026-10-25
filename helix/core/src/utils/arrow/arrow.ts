import { reachOf } from '../layers/layers.js'

export { sideOf } from '../layers/layers.js'

/**
 * How far a panel's arrow reaches past the edge it sits on, which is what the
 * panel's offset adds so the gap is measured to the point.
 *
 * A square of side `n` turned forty-five degrees about its center reaches
 * `n / sqrt(2)` from it, and the arrow is placed with its center on the
 * panel's edge. Read from the element rather than assumed, because the size
 * is a hook a theme may move. `offsetWidth` rather than a rect, which reports
 * the turned box and would count the reach twice. Zero for no arrow, and while
 * the panel is closed and unrendered, when there is nothing to place.
 */
export const arrowReach = (arrow: HTMLElement | null | undefined): number =>
  reachOf(arrow?.offsetWidth ?? 0)
