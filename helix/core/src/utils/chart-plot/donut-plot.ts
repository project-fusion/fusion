/**
 * What a Donut Chart draws and says of its readings, as arithmetic with no
 * element in it: the web's element and a phone's both draw what this returns.
 *
 * **The web draws a slice as a dash on a circle**, which its sheet turns to
 * start at twelve, so a share growing is a dash interpolating. **A phone
 * draws the same slice as an arc already turned**, `donutArc`, since a
 * shape's transform is not a phone's paint, and the same closed wedge for an
 * outline, `donutEdge`, from the same numbers.
 */

import { PLOT_HEIGHT, PLOT_WIDTH } from './plot-box.js'

/* Square, because the shape has to stay round: the plot box is already one and
   this is the center of it. */
export const DONUT_CENTER = PLOT_WIDTH / 2

/** The outer edge of the ring, whatever its thickness. */
export const DONUT_EDGE = 40

/**
 * The dash gap, long enough that the pattern cannot repeat.
 *
 * A dash array tiles. Set to `circumference - length` the pattern fills the
 * circle exactly once and is right at rest, and wrong the moment it animates:
 * both numbers interpolate, and while the gap is shorter than the path still to
 * cover, a second and third copy of the slice sweep round the ring and vanish
 * inside one transition. A constant far larger than any circumference has no
 * second tile to draw at any point in the interpolation. It is the number
 * `@starting-style` already uses for the same reason.
 */
export const DONUT_GAP = 9999

/**
 * The seam between two slices, along the ring, in the view box's units.
 *
 * Slices that touched read as one band where two colors were near, as two
 * light series in the ink theme are. A dash a seam short leaves the track
 * showing between slices, which is the ring's own ground on any surface, and
 * a constant length on a circle is a constant angle, so the seam's sides are
 * radial as the slices' ends are. 0.8 is 1.8 pixels at the resting 224.
 */
export const DONUT_SEAM = 0.8

/**
 * The seam each slice leaves at either end, as a length along the ring: half
 * a `DONUT_SEAM`, and none where one slice is the whole.
 */
export const donutSeam = (shares: readonly SliceShare[]): number =>
  shares.filter((share) => share.fraction > 0).length > 1 ? DONUT_SEAM / 2 : 0

/**
 * How much of the radius the ring takes, by name.
 *
 * **The outer edge is fixed and the radius follows the thickness**, which is
 * what makes `none` a pie. The stroke sits astride its own radius, so a ring
 * drawn at a fixed `r` grows outward as well as inward: against a 100 box, a
 * fixed `r=40` has an unstated ceiling at a thickness of 20, and anything past
 * it crosses the view box and is cut with nothing to say so.
 *
 * Derived instead, `r = EDGE - thickness / 2`, the outer edge lands on `EDGE`
 * for every value and the inner edge is `EDGE - thickness`. A pie is where the
 * inner edge reaches the center, which solves to `thickness = EDGE`: the ring
 * is then drawn at `r = EDGE / 2` and its stroke spans the whole radius.
 *
 * `EDGE * 2` was the first answer and is the trap in this arithmetic. It gives
 * `r = 0`, and a circle of radius zero draws nothing at all, so a pie came out
 * as an empty box. The stroke reaches `thickness / 2` either side of `r`, not
 * `thickness`.
 */
export const DONUT_THICKNESS: Readonly<Record<string, number>> = {
  large: 8,
  medium: 16,
  none: DONUT_EDGE,
  small: 26,
}

/** The smallest share that takes a label: a twentieth of the ring. */
export const SMALLEST_LABELED = 0.05

/** One slice: its share of the whole, where it starts, and the row it was read from. */
export interface DonutShare {
  /** The slice's share of the whole, from 0 to 1. */
  fraction: number
  /** The table row the slice was read from, counting from zero. */
  row: number
  /** Where the slice starts, as a share of the whole. */
  start: number
}

/** A slice's place on the ring, as shares of the whole from 0 to 1. */
export interface SliceShare {
  /** How much of the ring the slice takes. */
  fraction: number
  /** Where the slice starts, as the share of the ring before it. */
  start: number
}

/** The ring a slice label is placed on, in the drawing's own units. */
export interface RingGeometry {
  /** The center, on both axes. */
  center: number
  /** Where the ring's turn starts, in radians: a quarter turn back is twelve o'clock. */
  origin: number
  /** The radius of the band's middle, where a label sits. */
  radius: number
  /** How much of a turn the ring takes: 1 for a ring, a half for an arc. */
  span: number
  /** How tall the box the labels are placed in is. */
  tall: number
  /** Where the top of that box is. */
  top: number
  /** How wide the drawing is. */
  width: number
}

/** The ring a donut draws: how thick, how far round, and the box it is cropped to. */
export interface DonutRing extends RingGeometry {
  /** Whether the ring is a half, opening downward. */
  half: boolean
  /** How thick the band is drawn, in the drawing's own units. */
  thickness: number
  /** The view box, cropped to what is drawn. */
  frame: string
}

/**
 * The ring for a `hole` and a `sweep`.
 *
 * **A half ring starts at nine o'clock and a whole one at twelve**, the turns
 * the web's sheet gives its circles. Anything drawn or placed by arithmetic
 * starts from the same place, or it describes a slice the ring is not showing
 * there.
 *
 * **The view box is cropped to what is drawn.** A full turn uses the square.
 * A half arc uses the band from the top of the ring down to the center line,
 * plus the half stroke its flat ends hang below that, and cropping to it is
 * the difference between a semi-donut and a semi-donut with an empty quarter
 * of the box under it.
 */
export const donutRing = (hole: string | undefined, sweep: string | undefined): DonutRing => {
  const half = sweep === 'half'
  const thickness = DONUT_THICKNESS[hole ?? 'medium'] ?? DONUT_THICKNESS.medium ?? 0
  return {
    center: DONUT_CENTER,
    frame: half
      ? `0 ${DONUT_CENTER - DONUT_EDGE} ${PLOT_WIDTH} ${DONUT_EDGE + thickness / 2}`
      : `0 0 ${PLOT_WIDTH} ${PLOT_HEIGHT}`,
    half,
    origin: half ? Math.PI : -Math.PI / 2,
    radius: DONUT_EDGE - thickness / 2,
    span: half ? 0.5 : 1,
    tall: half ? DONUT_EDGE + thickness / 2 : PLOT_HEIGHT,
    thickness,
    top: half ? DONUT_CENTER - DONUT_EDGE : 0,
    width: PLOT_WIDTH,
  }
}

/**
 * Each slice's share of the circle, where it starts, and the row it was read
 * from, for the amounts of a table's first column.
 *
 * **A value that is no amount, or one a legend hid, is none of the whole**, so
 * the others close over it: an arc cannot show a negative number. Empty where
 * nothing is left to share.
 */
export const donutShares = (
  points: readonly { at: number; value: number }[],
  shows: (index: number) => boolean = () => true,
): DonutShare[] => {
  const values = points.map((point, index) =>
    Number.isFinite(point.value) && point.value > 0 && shows(index) ? point.value : 0,
  )
  const total = values.reduce((sum, one) => sum + one, 0)
  if (total === 0) {
    return []
  }
  let start = 0
  return values.map((value, index) => {
    const fraction = value / total
    const at = start
    start += fraction
    return { fraction, row: points[index]?.at ?? index, start: at }
  })
}

/** A point at `radius` from the center, at `angle`, as a path writes it. */
const pointAt = (radius: number, angle: number): string =>
  `${(DONUT_CENTER + Math.cos(angle) * radius).toFixed(3)} ${(DONUT_CENTER + Math.sin(angle) * radius).toFixed(3)}`

/** Where a slice starts and ends, in radians from three o'clock, on `ring`. */
const anglesOf = (
  share: SliceShare,
  ring: DonutRing,
  seam = 0,
): readonly [from: number, to: number] => {
  const turn = 2 * Math.PI * ring.span
  /* The seam the dash leaves, as the angle it is on the dash's circle, so the
     edge and the slice it outlines end together. */
  const gap = Math.min(seam / ring.radius, share.fraction * turn * 0.5)
  return [
    share.start * turn + ring.origin + gap,
    (share.start + share.fraction) * turn + ring.origin - gap,
  ]
}

/**
 * The slice as a shape with an inside: the outer arc, a step inward, the inner
 * arc back, closed.
 *
 * **A stroked arc has no boundary to draw, which is why this exists.** The
 * slice is a dash on a circle: the mark *is* the edge, so there is nothing for
 * an outline to trace and nothing within it to fade. This is the slice as a
 * closed path for them.
 *
 * `inset` draws the wedge that much inside its own edge, which a phone strokes
 * where the web clips a stroke to the wedge: the half of a stroke that falls
 * inside a wedge is the stroke of a wedge a quarter of its width further in.
 */
export const donutEdge = (share: SliceShare, ring: DonutRing, inset = 0, seam = 0): string => {
  const [start, end] = anglesOf(share, ring, seam)
  const outer = DONUT_EDGE - inset
  const inner = DONUT_EDGE - ring.thickness + inset
  /* Each side steps in along the arc by the inset, as a line drawn that far
     inside the side would. */
  const from = inset === 0 ? start : start + inset / Math.max(inner, 1)
  const to = inset === 0 ? end : end - inset / Math.max(inner, 1)
  const wide = to - from > Math.PI ? 1 : 0
  /* A slice that is the whole ring starts and ends at one point, and an arc
     between a point and itself draws nothing. Split at the halfway angle so
     each half is a real arc. */
  const full = end - start >= 2 * Math.PI - 1e-6
  const mid = from + (to - from) / 2
  const outward = full
    ? `A ${outer} ${outer} 0 0 1 ${pointAt(outer, mid)} A ${outer} ${outer} 0 0 1 ${pointAt(outer, to)}`
    : `A ${outer} ${outer} 0 ${wide} 1 ${pointAt(outer, to)}`
  /* A pie has no inner arc: the radius solves to zero and the two ends meet at
     the middle, so the step back is a line to the center and not an arc of no
     size. */
  const homeward =
    inner <= inset
      ? `L ${DONUT_CENTER} ${DONUT_CENTER}`
      : full
        ? `L ${pointAt(inner, to)} A ${inner} ${inner} 0 0 0 ${pointAt(inner, mid)} A ${inner} ${inner} 0 0 0 ${pointAt(inner, from)}`
        : `L ${pointAt(inner, to)} A ${inner} ${inner} 0 ${wide} 0 ${pointAt(inner, from)}`
  return `M ${pointAt(outer, from)} ${outward} ${homeward} Z`
}

/**
 * The slice as an arc along the ring's radius, already turned to start where
 * the ring starts, which a phone strokes as thick as the band: the web's dash
 * on a turned circle, drawn with no transform.
 */
export const donutArc = (share: SliceShare, ring: DonutRing, seam = 0): string => {
  if (share.fraction <= 0) {
    return ''
  }
  const [from, to] = anglesOf(share, ring, seam)
  const r = ring.radius
  if (to - from >= 2 * Math.PI - 1e-6) {
    const mid = from + Math.PI
    return `M ${pointAt(r, from)} A ${r} ${r} 0 0 1 ${pointAt(r, mid)} A ${r} ${r} 0 0 1 ${pointAt(r, to)}`
  }
  const wide = to - from > Math.PI ? 1 : 0
  return `M ${pointAt(r, from)} A ${r} ${r} 0 ${wide} 1 ${pointAt(r, to)}`
}

/** The track under the slices, as an arc a phone strokes: the whole ring, or its half. */
export const donutTrack = (ring: DonutRing): string => donutArc({ fraction: 1, start: 0 }, ring)

/**
 * Where a slice's label goes, as percentages of the box from the left and the
 * top: the middle of its band at its mid-angle. Nothing for a slice under a
 * twentieth, whose label would not fit on it.
 */
export const sliceLabelAt = (
  share: SliceShare,
  ring: RingGeometry,
): { x: number; y: number } | undefined => {
  if (share.fraction < SMALLEST_LABELED) {
    return undefined
  }
  const angle = (share.start + share.fraction / 2) * 2 * Math.PI * ring.span + ring.origin
  return {
    x: ((ring.center + Math.cos(angle) * ring.radius) / ring.width) * 100,
    y: ((ring.center + Math.sin(angle) * ring.radius - ring.top) / ring.tall) * 100,
  }
}

/** Where the reading bubble points at a slice, and the side it prefers. */
export interface DonutBearing {
  /** Whether `x` is measured from the left in either direction, as a whole ring's is. */
  fixed: boolean
  /** The side the bubble prefers, which moves where it does not fit. */
  placement: 'bottom' | 'left' | 'right' | 'top'
  /** How far across the plot the point is, a percentage. */
  x: number
  /** How far down the plot the point is, a percentage. */
  y: number
}

/**
 * Where the bubble points at a slice: **outside the ring, on the slice's own
 * bearing**, rather than centered in the hole, which covers the data on a pie
 * and says in neither shape *which* slice it means.
 *
 * The mid-angle, from `origin`, at the outer edge. A half ring's box is
 * cropped to the band it draws, so the height is measured from the top of
 * that band.
 *
 * **A whole ring stays as drawn on a right-to-left page, and a half ring
 * turns.** Clockwise from twelve is a clock's convention, and a clock does not
 * run backwards in Arabic or Hebrew, so a whole ring's bearing is measured
 * from the left in either direction. A half ring is read across, the first
 * slice where a line of text starts, so its bearing is measured from the
 * inline start, with the side the bubble prefers turned to match.
 */
export const donutBearing = (
  share: SliceShare,
  ring: DonutRing,
  mirrored: boolean,
): DonutBearing => {
  const angle = (share.start + share.fraction / 2) * 2 * Math.PI * ring.span + ring.origin
  const x = DONUT_CENTER + Math.cos(angle) * DONUT_EDGE
  const y = ((DONUT_CENTER + Math.sin(angle) * DONUT_EDGE - ring.top) / ring.tall) * 100
  const turned = ring.half && mirrored
  const across = Math.cos(angle) > 0 !== turned
  /* The preferred side from the bearing's dominant axis, and the bubble moves
     if that side does not fit. A fixed side cannot express a bearing, so the
     arrow misses the ring; a preference plus flipping can. */
  const placement =
    Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle))
      ? across
        ? 'right'
        : 'left'
      : Math.sin(angle) > 0
        ? 'bottom'
        : 'top'
  return { fixed: !ring.half, placement, x, y }
}

/**
 * The slice under a point of the plot, by its angle about the center, or `-1`
 * where the point is off the band: in the hole, past the outer edge, or below
 * a half ring's line. `x` and `y` are fractions of the plot's box, from its
 * left and its top, as a finger finds them; a half ring's box is the band it
 * crops to. A slice of no share is never under a point.
 *
 * `slack` widens the band on both sides, in the drawing's units, as a finger
 * is wider than a pointer.
 */
export const sliceAtPoint = (
  x: number,
  y: number,
  shares: readonly SliceShare[],
  ring: DonutRing,
  slack = 0,
): number => {
  const dx = x * ring.width - DONUT_CENTER
  const dy = ring.top + y * ring.tall - DONUT_CENTER
  const distance = Math.hypot(dx, dy)
  const inner = DONUT_EDGE - ring.thickness
  if (distance > DONUT_EDGE + slack || distance < inner - slack) {
    return -1
  }
  const turn = 2 * Math.PI * ring.span
  /* How far round from where the ring starts, as a share of the whole. */
  const round = (Math.atan2(dy, dx) - ring.origin + 4 * Math.PI) % (2 * Math.PI)
  const share = round / turn
  if (share > 1) {
    return -1
  }
  return shares.findIndex(
    (one) => one.fraction > 0 && share >= one.start && share < one.start + one.fraction,
  )
}
