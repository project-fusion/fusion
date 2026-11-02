/**
 * Where a surface stands after one move of a pan, worked out on the UI thread:
 * how far the move went toward the surface's edge, and whether the surface or the
 * scroller inside it takes the move.
 */
import type { SwipeEdge } from '@fusion.dev/helix-core/swipe'

/** How far a move of `x` and `y` went toward `edge`, negative where it went away. */
export const towardEdge = (edge: SwipeEdge, x: number, y: number): number => {
  'worklet'
  return edge === 'bottom' ? y : edge === 'top' ? -y : edge === 'right' ? x : -x
}

/** Where the surface stands after a move, and whether the surface took it from the scroller. */
export interface Step {
  readonly takes: boolean
  readonly travel: number
}

/** Where a scroller a touch began inside stands, as a swipe reads it. */
export interface Held {
  /** How far it can still scroll the way a drag toward the edge scrolls it, in points. */
  readonly room: number
  /** Whether it has stood still for `SCROLL_LOCK`. */
  readonly still: boolean
}

/**
 * Where a surface `travel` points toward its edge stands after a move of
 * `delta` toward it, from a touch that began inside a scroller that stands
 * as `held` says, or outside every scroller. **The surface takes a move
 * toward the edge once the scroller can scroll no further that way and has
 * stood still, and a move away while it rests short of the whole**, as core's
 * `handsOver` says. Any other move is the scroller's. The surface never
 * moves past the whole, as the web's does not.
 */
export const stepped = (travel: number, delta: number, held: Held | undefined): Step => {
  'worklet'
  const takes = held === undefined || (delta > 0 ? held.room <= 0 && held.still : travel > 0)
  return { takes, travel: takes ? Math.max(0, travel + delta) : travel }
}
