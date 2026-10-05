/** The edge of the window a surface leaves through when it is swiped away. */
export type SwipeEdge = 'bottom' | 'left' | 'right' | 'top'

/** Which way along the screen a swipe is read. */
export type SwipeAxis = 'x' | 'y'

/**
 * How fast a release has to be moving, in pixels per millisecond, to count as
 * a fling: the surface then goes on in the direction it was thrown, whatever
 * distance it had covered.
 */
export const FLING = 0.5

/**
 * The edge a surface placed at `placement` leaves through, resolved against the
 * writing direction. `start` and `end` are logical, so on a right-to-left page
 * the end is the left edge.
 */
export const swipeEdge = (
  placement: 'bottom' | 'end' | 'start' | 'top',
  rtl: boolean,
): SwipeEdge => {
  if (placement === 'top' || placement === 'bottom') {
    return placement
  }
  return (placement === 'end') !== rtl ? 'right' : 'left'
}

/** The axis a swipe toward `edge` is read along. */
export const swipeAxis = (edge: SwipeEdge): SwipeAxis =>
  edge === 'left' || edge === 'right' ? 'x' : 'y'

/** How far a movement of `dx` and `dy` went toward `edge`, negative when it went away. */
export const towardEdge = (edge: SwipeEdge, dx: number, dy: number): number =>
  ({ bottom: dy, left: -dx, right: dx, top: -dy })[edge]

/** A distance toward `edge` as a physical offset, for a `translate`. */
export const edgeOffset = (edge: SwipeEdge, travel: number): { x: number; y: number } => ({
  x: edge === 'right' ? travel : edge === 'left' ? -travel : 0,
  y: edge === 'bottom' ? travel : edge === 'top' ? -travel : 0,
})

/**
 * The fractions of a surface a reader can leave on screen, read from a list
 * such as `"0.5 1"`. Each is above zero and at most one, and the list is sorted
 * with no repeats. Where nothing usable is written, the one point is `1`: the
 * whole surface.
 */
export const parseSnapPoints = (text: string | null | undefined): number[] => {
  const points = [
    ...new Set(
      (text ?? '')
        .split(/[\s,]+/)
        .map(Number)
        .filter((one) => Number.isFinite(one) && one > 0 && one <= 1),
    ),
  ].sort((a, b) => a - b)
  return points.length > 0 ? points : [1]
}

/** What a release asks of `settleSwipe`. */
export interface SwipeRelease {
  /** The snap points, from `parseSnapPoints`. */
  points: readonly number[]
  /** The surface's size along the axis, in pixels. */
  size: number
  /** How far the surface sits toward its edge, from fully shown, in pixels. */
  travel: number
  /** How fast it was moving toward its edge at the release, in pixels per millisecond. */
  velocity: number
}

/**
 * The fraction of the surface to rest at after a release, and `0` to dismiss it.
 *
 * A fling goes on to the next point in the direction it was thrown, and
 * flinging toward the edge from the smallest point dismisses. Otherwise the
 * surface rests at the nearest point, dismissal counted as the point at zero, so
 * a surface with the one point `1` goes once it is dragged more than halfway.
 */
export const settleSwipe = ({ points, size, travel, velocity }: SwipeRelease): number => {
  if (size <= 0) {
    return points[points.length - 1] ?? 1
  }
  const shown = Math.max(0, Math.min(1, 1 - travel / size))
  const stops = [0, ...points]
  if (velocity >= FLING) {
    return [...stops].reverse().find((one) => one < shown) ?? 0
  }
  if (velocity <= -FLING) {
    return stops.find((one) => one > shown) ?? stops[stops.length - 1] ?? 1
  }
  return stops.reduce((best, one) => (Math.abs(one - shown) < Math.abs(best - shown) ? one : best))
}

/** How far toward its edge a surface resting at `fraction` sits, in pixels. */
export const snapTravel = (size: number, fraction: number): number =>
  Math.round((1 - fraction) * size)
