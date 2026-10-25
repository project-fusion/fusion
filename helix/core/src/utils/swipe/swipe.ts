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

/**
 * Which way a swipe across a row of items moves: `1` to the next, `-1` to the
 * previous, `0` to stay.
 *
 * Dragging the picture toward the start of the line brings the next one in,
 * so the next item is a drag leftward on a left-to-right page and rightward on
 * a right-to-left one. A quarter of the width, or a fling, is enough.
 */
export const swipeStep = (dx: number, vx: number, width: number, rtl: boolean): -1 | 0 | 1 => {
  const along = rtl ? dx : -dx
  const speed = rtl ? vx : -vx
  if (speed >= FLING || (speed > -FLING && along > width / 4)) {
    return 1
  }
  if (speed <= -FLING || along < -width / 4) {
    return -1
  }
  return 0
}

/**
 * How much of a drag past a bound a surface follows at first. The share falls
 * the further it goes, as iOS's rubber band does, so a surface pulled past its
 * open end moves less and less and never runs away from the finger.
 */
const GIVE = 0.55

/**
 * How far a surface is drawn past a bound, for a drag that went `over` pixels
 * past it, on a surface `size` pixels long along the drag.
 */
export const resist = (over: number, size: number): number => {
  if (over <= 0) {
    return 0
  }
  return size > 0 ? size * (1 - 1 / ((over * GIVE) / size + 1)) : over * GIVE
}

/**
 * Where a surface dragged to `travel` is drawn: where the finger is between
 * `min` and `max`, and with resistance past either.
 */
export const resisted = (travel: number, min: number, max: number, size: number): number => {
  if (travel < min) {
    return min - resist(min - travel, size)
  }
  return travel > max ? max + resist(travel - max, size) : travel
}

/** A release on its way to rest: how long it takes, and where it is after `elapsed` milliseconds. */
export interface Glide {
  /** The travel `elapsed` milliseconds after the release. */
  at: (elapsed: number) => number

  /** How long the glide takes, in milliseconds. */
  duration: number
}

/**
 * The glide off the edge after a release that dismisses: from `from` to `to`,
 * starting at `velocity`, in pixels per millisecond, and taking at most
 * `longest` milliseconds.
 *
 * **It leaves at the speed it was let go.** Thrown fast enough to cover the
 * distance in `longest`, it keeps that speed to the edge. Let go slowly, or
 * moving back, it starts at that speed and gathers pace evenly, so the speed
 * never jumps at the release.
 */
export const exitGlide = (from: number, to: number, velocity: number, longest: number): Glide => {
  const distance = to - from
  const duration =
    velocity > 0 ? Math.max(1, Math.min(longest, distance / velocity)) : Math.max(1, longest)
  const gather = (2 * (distance - velocity * duration)) / duration ** 2
  return {
    at: (elapsed) => {
      const t = Math.min(Math.max(elapsed, 0), duration)
      return from + velocity * t + (gather * t * t) / 2
    },
    duration,
  }
}

/** How many time constants long a settling glide is, so its push has all but died by its end. */
const DECAY = 8

/** A curve's progress at `share` of its length, read from evenly spaced samples. */
const along = (curve: readonly number[], share: number): number => {
  const steps = curve.length - 1
  if (steps < 1) {
    return share
  }
  const at = Math.min(Math.max(share, 0), 1) * steps
  const index = Math.min(Math.floor(at), steps - 1)
  const before = curve[index] ?? 0
  const after = curve[index + 1] ?? 1
  return before + (after - before) * (at - index)
}

/**
 * The glide back to rest after a release that does not dismiss: along the
 * host's curve from `from` to `to`, in at most `duration` milliseconds, with
 * the speed it was let go at carried in. `curve` is the curve's progress at
 * evenly spaced points from its start to its end, the browser's reading of a
 * timing function such as `--helix-easing-spring`.
 *
 * **A spring starts from standing, and a release usually does not.** Run from
 * its start, `--helix-easing-spring` covers a tenth of the way in its first
 * quarter and then half of it in the next twelfth, so a surface let go moving
 * toward its rest slowed almost to a stop and then lurched: measured in
 * Chromium on November 19, 2026, 16 pixels a frame before the release, then
 * 8, 4, 1, 3, 5 and 29. Moving toward its rest, the glide enters the curve at
 * the first point that moves as fast as the release, and fits its length so
 * it starts at the release's speed, within half and the whole of `duration`.
 *
 * **What the curve cannot match is pushed and spent.** The difference between
 * the release's speed and the curve's, all of it for a release moving away
 * from rest or standing on it, is added as a push that starts at that speed
 * and dies away, `v·t·e^(−t/τ)` with τ an eighth of the glide: a flick away
 * from rest carries the surface on a little before the curve brings it back,
 * and the push has spent all but a few ten-thousandths of itself by the end.
 */
export const settleGlide = (
  from: number,
  to: number,
  velocity: number,
  duration: number,
  curve: readonly number[] = [0, 1],
): Glide => {
  const distance = to - from
  const steps = curve.length - 1
  let enter = 0
  let length = Math.max(1, duration)
  let push = velocity
  if (distance !== 0 && velocity * distance > 0 && steps >= 1) {
    /* How steep the curve has to be, in progress per share of its length, to
       move at the release's speed over the whole duration. */
    const needed = (velocity * length) / distance
    let best = 0
    let steepest = Number.NEGATIVE_INFINITY
    for (let index = 0; index < steps && (curve[index] ?? 1) < 1; index += 1) {
      const slope = ((curve[index + 1] ?? 1) - (curve[index] ?? 0)) * steps
      if (slope >= needed || slope > steepest) {
        best = index
        steepest = slope
      }
      if (slope >= needed) {
        break
      }
    }
    const start = curve[best] ?? 0
    if (steepest > 0 && start < 1) {
      enter = best / steps
      const left = 1 - enter
      const fit = (distance * steepest * left) / (velocity * (1 - start))
      length = Math.min(Math.max(fit, (duration * left) / 2), Math.max(1, duration))
      push = velocity - (distance * steepest * left) / (length * (1 - start))
    }
  }
  const start = along(curve, enter)
  const tau = length / DECAY
  return {
    at: (elapsed) => {
      const t = Math.min(Math.max(elapsed, 0), length)
      const share = enter + ((1 - enter) * t) / length
      const progress = start < 1 ? (along(curve, share) - start) / (1 - start) : 1
      return from + distance * progress + push * t * Math.exp(-t / tau)
    },
    duration: length,
  }
}
export * from './hand-off.js'
