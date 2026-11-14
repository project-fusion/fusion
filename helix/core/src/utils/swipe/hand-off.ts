/**
 * When a list inside a swiping surface hands its drag to the surface, as a
 * drawer's list does on the web and on a phone, and iOS's sheets and Vaul's
 * drawer do.
 *
 * **A drag toward the edge is the list's until the list can scroll no
 * further that way and has stood still for `SCROLL_LOCK`**: a drawer at the
 * bottom takes a drag down once its list stands at its top, and a drawer at
 * the top takes a drag up once its list stands at its end. **A drag away from
 * the edge is the surface's while it rests short of the whole**, so a half
 * open sheet opens further before its list scrolls.
 */
import type { SwipeEdge } from './swipe.js'

/**
 * How long a list must have stood still before a drag toward the edge leaves
 * it for the surface, in milliseconds. **The momentum of a list flung to its
 * top then carries no drawer with it**: the list moves until it settles, and
 * a drag that starts while it moves, or within this time of its last move,
 * stays the list's. Vaul's `scrollLockTimeout` is 100 milliseconds in its
 * code and 500 in its documentation; half a second also covers the bounce an
 * iOS list makes at its top.
 */
export const SCROLL_LOCK = 500

/**
 * Whether a drag toward `edge` scrolls a list toward its start, as a drag
 * down does in a drawer at the bottom, and a drag right in one at the right.
 * A drag toward the top or the left edge scrolls it toward its end.
 */
export const scrollsToStart = (edge: SwipeEdge): boolean => edge === 'bottom' || edge === 'right'

/** What `handsOver` reads of the surface, the list, and the drag. */
export interface HandOver {
  /** How far the list can still scroll the way a drag toward the edge scrolls it, in pixels. */
  readonly room: number
  /** How far the surface rests toward its edge from the whole, in pixels. */
  readonly rest: number
  /** Whether the list has stood still for `SCROLL_LOCK`. */
  readonly still: boolean
  /** How far the drag went toward the edge, negative where it went away. */
  readonly toward: number
}

/** Whether the surface takes a drag that began inside a list, as the module says. */
export const handsOver = ({ room, rest, still, toward }: HandOver): boolean =>
  toward > 0 ? room <= 0 && still : rest > 0

/**
 * How far a scroller can still scroll the way a drag toward `edge` scrolls
 * it, in pixels, from where it stands and how long its content is: its
 * offset where the drag scrolls it toward its start, and what is left past
 * its end otherwise.
 */
export const roomToward = (
  edge: SwipeEdge,
  at: { readonly content: number; readonly frame: number; readonly offset: number },
): number => (scrollsToStart(edge) ? at.offset : Math.max(0, at.content - at.frame - at.offset))
