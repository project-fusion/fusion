/**
 * The shape of the ribbon, as points the shader joins with a Catmull-Rom
 * spline.
 *
 * Pure, so `path.pure.spec.ts` can hold the geometry without a GPU: what a
 * shape is, where a stop puts it, and which stretch of a page-long path is on
 * screen are all arithmetic.
 */

/** The three forms the ribbon takes. */
export type StrandsVariant = 'fan' | 'ribbon' | 'waves'

/**
 * One point on the centerline: `x` as a share of the width, `y` in CSS pixels,
 * the ribbon's width as a share of the width, and its brightness from `0` to
 * `1`.
 *
 * **`x` as a share and `y` in pixels**, because the two ends of a page answer
 * differently to a resize: a reader widening the window wants the ribbon to
 * keep its place across the page, and a section's position down the page is
 * pixels the layout already decided.
 */
export type PathPoint = readonly [x: number, y: number, width: number, brightness: number]

/** A stop, resolved: the form it asks for, and the element it is pinned to. */
export interface PlacedStop {
  /** Where the shape sits across the page, as a share of the width. */
  at: number | undefined
  /** The target's height, in CSS pixels. */
  height: number
  /** The target's top, in page pixels. */
  top: number
  variant: StrandsVariant
}

/**
 * The most points a path may carry, which is the length of the shader's
 * uniform array.
 *
 * WebGL2 guarantees 256 vertex uniform vectors, and this takes 96 of them. A
 * page-long ribbon spends one point per half screen, so 96 covers a page more
 * than forty screens long; a longer one keeps its first 96 points and fades.
 */
export const MAX_POINTS = 96

/** Below this width the layout is a phone's, and every shape keeps to the edge. */
const NARROW = 760

/**
 * The brightness of each form, before `gain`.
 *
 * The fan is the one loud thing, so it peaks at full strength. A ribbon runs
 * behind content for screens at a time, so it is dimmer, and a wave crosses
 * a gap between sections, between the two.
 */
const GLOW = { fan: 1, ribbon: 0.36, waves: 0.7 } as const

/** The width of each form, as a share of the width, before `spread`. */
const WIDTH = { fan: 0.07, ribbon: 0.24, waves: 0.06 } as const

/** Where a fan's bend sits across its box, when `at` is not given. */
const FAN_AT = 0.4

/**
 * A fan: a tight, bright bend with its arms opening toward the right.
 *
 * The bend sits at `at` across and at 58% of `height` down from `top`, and the
 * arms leave above and below it. The width narrows to almost nothing at the
 * bend, which is what makes the strands converge into one hot line there.
 */
const fan = (top: number, height: number, at: number, narrow: boolean): PathPoint[] => {
  const x = narrow ? Math.max(at, 0.8) : at
  const y = top + height * 0.58
  const arm = narrow ? 0.12 : 0.15
  return [
    [x + 0.38, y - height * 0.73, WIDTH.fan, 0.2],
    [x + arm, y - height * 0.3, WIDTH.fan * 0.5, 0.9],
    [x, y, 0.005, GLOW.fan],
    [x + arm, y + height * 0.3, WIDTH.fan * 0.5, 0.9],
    [x + 0.45, y + height * 0.54, WIDTH.fan * 1.15, 0.7],
  ]
}

/**
 * A wave: sharp strands crossing the full width, from off one edge to off the
 * other, with a gentle rise and fall on the way.
 *
 * `fromRight` says which side it enters from, so consecutive waves alternate
 * and the ribbon turns off screen between them.
 */
const wave = (y: number, height: number, fromRight: boolean, narrow: boolean): PathPoint[] => {
  const w = narrow ? WIDTH.waves * 2 : WIDTH.waves
  const glow = narrow ? GLOW.waves * 0.65 : GLOW.waves
  const side = (share: number): number => (fromRight ? 1 - share : share)
  return [
    [side(-0.15), y - height * 0.35, w, 0],
    [side(-0.05), y, w, glow * 0.6],
    [side(0.3), y + 18, w, glow],
    [side(0.7), y - 18, w, glow],
    [side(1.05), y, w, glow * 0.6],
    [side(1.15), y + height * 0.35, w, 0],
  ]
}

/**
 * A stretch of soft ribbon from `from` to `to`, in long S-curves around `at`.
 *
 * `phase` continues the curve from where the last stretch left it, so two
 * stretches meet as one.
 */
const ribbon = (
  from: number,
  to: number,
  height: number,
  at: number,
  phase: number,
  narrow: boolean,
): { phase: number; points: PathPoint[] } => {
  const points: PathPoint[] = []
  const step = height * 0.55
  const swing = narrow ? 0.26 : 0.3
  const wide = narrow ? 0.45 : WIDTH.ribbon
  const glow = narrow ? GLOW.ribbon * 0.65 : GLOW.ribbon
  let a = phase
  for (let y = from; y < to; y += step) {
    a += (step / (1.7 * height)) * Math.PI
    points.push([at + swing * Math.sin(a), y, wide * (0.8 + 0.3 * Math.sin(a * 0.63 + 0.4)), glow])
  }
  return { phase: a, points }
}

/**
 * The ribbon drawn inside its own box, which is what an element without
 * `travel` shows.
 *
 * @param variant The form to draw.
 * @param at Where it sits across the box, as a share of the width. A wave
 *   crosses the whole width and does not read it.
 * @param height The box's height, in CSS pixels. Its width needs no
 *   argument: `x` is a share of it.
 */
export const boxPath = (
  variant: StrandsVariant,
  at: number | undefined,
  height: number,
): PathPoint[] => {
  /* **A box is never narrow.** The narrow layout keeps a phone's text clear by
     pushing each form to the edge of the viewport; a box is the frame the
     consumer chose, so its form stays where `at` puts it at any width. */
  const narrow = false
  if (variant === 'fan') {
    return fan(0, height, at ?? FAN_AT, narrow)
  }
  if (variant === 'waves') {
    return wave(height * 0.5, height, false, narrow)
  }
  const start = -height * 0.4
  const lead: PathPoint = [at ?? 0.5, start - height * 0.4, WIDTH.ribbon, 0]
  const body = ribbon(start, height * 1.4, height, at ?? 0.5, 0, narrow).points.map(
    ([x, y, w]): PathPoint => [x, y, w, narrow ? GLOW.ribbon * 0.65 * 1.4 : GLOW.ribbon * 1.4],
  )
  return [lead, ...body]
}

/**
 * The ribbon laid down a whole page, which is what an element with `travel`
 * shows.
 *
 * Each stop places its form at its target, in page order. Between two stops
 * the ribbon fills the gap with soft S-curves in `fill`'s place, except
 * between two waves, where it turns off screen so each wave reads alone.
 * Without stops, `fill` runs the length of the page: a fan opens the page and
 * a ribbon follows it, waves cross every screen and a third, and a ribbon
 * meanders the whole way. After a last wave the ribbon does not come back, so
 * the page ends on the wave.
 *
 * @param stops The resolved stops, in any order.
 * @param fill The root's own form, for the stretches no stop claims.
 * @param width The viewport's width, in CSS pixels.
 * @param height The viewport's height, in CSS pixels.
 * @param page The page's height, in CSS pixels.
 */
export const pagePath = (
  stops: readonly PlacedStop[],
  fill: StrandsVariant,
  width: number,
  height: number,
  page: number,
): PathPoint[] => {
  const narrow = width < NARROW
  const placed = [...stops].sort((one, two) => one.top - two.top)
  if (placed.length === 0) {
    if (fill === 'waves') {
      for (let y = height * 0.6; y < page; y += height * 1.3) {
        placed.push({ at: undefined, height, top: y, variant: 'waves' })
      }
    } else if (fill === 'fan') {
      placed.push({ at: undefined, height, top: 0, variant: 'fan' })
    }
  }

  const points: PathPoint[] = [[0.6, -height * 0.9, WIDTH.ribbon, 0]]
  let phase = 1.2
  let cursor = 0
  let fromRight = true
  let previous: StrandsVariant | undefined

  const gap = (to: number, next: StrandsVariant | undefined): void => {
    if (to - cursor < height * 0.7) {
      return
    }
    if (previous === 'waves' && next === 'waves') {
      return
    }
    const stretch = ribbon(cursor + height * 0.2, to - height * 0.45, height, 0.5, phase, narrow)
    phase = stretch.phase
    points.push(...stretch.points)
    const last = stretch.points.at(-1)
    if (last) {
      fromRight = last[0] > 0.5
    }
  }

  for (const stop of placed) {
    gap(stop.top, stop.variant)
    if (stop.variant === 'fan') {
      const span = Math.min(stop.height, height)
      points.push(...fan(stop.top, span, stop.at ?? FAN_AT, narrow))
      cursor = stop.top + span * 1.12
      fromRight = true
    } else if (stop.variant === 'waves') {
      points.push(...wave(stop.top, height, fromRight, narrow))
      fromRight = !fromRight
      cursor = stop.top + height * 0.35
    } else {
      const y = stop.top + Math.min(stop.height, height) / 2
      points.push([stop.at ?? 0.5, y, WIDTH.ribbon, GLOW.ribbon])
      cursor = y
    }
    previous = stop.variant
  }
  if (previous !== 'waves') {
    gap(page + height * 0.4, undefined)
  }
  const last = points.at(-1) ?? [0.5, page, WIDTH.ribbon, 0]
  points.push([last[0], Math.max(last[1], page) + height, last[2], 0])
  return points.slice(0, MAX_POINTS)
}

/** One coordinate of a uniform Catmull-Rom segment, the same one the shader runs. */
export const catmull = (p0: number, p1: number, p2: number, p3: number, f: number): number => {
  const f2 = f * f
  const f3 = f2 * f
  return (
    0.5 *
    (2 * p1 +
      (-p0 + p2) * f +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * f2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * f3)
  )
}

/**
 * The centerline's `y` at even steps of its parameter, for finding which
 * stretch is on screen.
 *
 * Twenty-four samples a segment, which is finer than any segment is tall on a
 * screen, and computed once a layout rather than once a frame.
 */
export const lookup = (points: readonly PathPoint[]): Float32Array => {
  const n = points.length
  const samples = Math.max(1, (n - 1) * 24)
  const out = new Float32Array(samples + 1)
  const y = (i: number): number => points[Math.max(0, Math.min(n - 1, i))]?.[1] ?? 0
  for (let j = 0; j <= samples; j++) {
    const s = (j / samples) * (n - 1)
    const i = Math.min(Math.floor(s), n - 2)
    out[j] = n < 2 ? y(0) : catmull(y(i - 1), y(i), y(i + 1), y(i + 2), s - i)
  }
  return out
}

/**
 * The stretch of the path that lies between `top` and `bottom`, as a range of
 * its parameter.
 *
 * Drawing only that stretch is what keeps a page-long ribbon as fine as a
 * screen-sized one: the same number of segments, spent where a reader looks.
 * A path that does not reach the window answers an empty range.
 */
export const visibleRange = (
  table: Float32Array,
  top: number,
  bottom: number,
): readonly [number, number] => {
  const last = table.length - 1
  let low = Number.POSITIVE_INFINITY
  let high = Number.NEGATIVE_INFINITY
  for (let j = 0; j <= last; j++) {
    const y = table[j] ?? 0
    if (y >= top && y <= bottom) {
      low = Math.min(low, j)
      high = Math.max(high, j)
    }
  }
  if (high < low || last < 1) {
    return [0, 0]
  }
  return [Math.max(0, (low - 1) / last), Math.min(1, (high + 1) / last)]
}
