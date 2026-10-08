/**
 * The shape of the ribbon, as points the shader joins with a Catmull-Rom
 * spline.
 *
 * Pure, so `path.pure.spec.ts` can hold the geometry without a GPU: what a
 * shape is, where a stop puts it, and which stretch of a page-long path is on
 * screen are all arithmetic.
 */

/** The three forms the ribbon takes. */
export type StrandsVariant = 'bend' | 'ribbon' | 'waves'

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
 * The bend is the one loud thing, so it peaks at full strength. A ribbon runs
 * behind content for screens at a time, so it is dimmer, and a wave crosses
 * a gap between sections, between the two.
 */
const GLOW = { bend: 1, ribbon: 0.36, waves: 0.7 } as const

/**
 * The width of each form, as a share of the width, before `spread`.
 *
 * The ribbon's is the 0.24 it was drawn at before a `spread` of 1 came to
 * mean 1.35, which was tuned on the bend: carried to the ribbon, with depth
 * pushing the near strands further out, it ran most of half a page wide and
 * read as loose strands rather than a band.
 */
const WIDTH = { bend: 0.12, ribbon: 0.18, waves: 0.06 } as const

/** Where a bend's apex sits across its box, when `at` is not given. */
const BEND_AT = 0.5

/**
 * Where a bend's lower arm hands over to the ribbon after it, below the apex,
 * as a share of its height. Inside a box, where nothing follows, the arm runs
 * on out of the box.
 *
 * As far as the ribbon can follow: the arm's slope there, 0.6 across for each
 * pixel down, is one the ribbon's curve reaches. Further on, the arm ran
 * flatter than the ribbon ever does, and the strand bent to meet it.
 */
const BEND_EXIT = 0.3

/**
 * The tightest any form turns, as a share of the box's height: the radius of
 * its sharpest curve.
 *
 * Half the height. A bend's apex a few dozen pixels round kinked the strands
 * that ran along its inside, and read as a fold in the light where every form
 * is meant to be one sweep. `path.pure.spec.ts` measures it on every form.
 */
export const TURN = 0.5

/**
 * A bend: bright strands turning through one point, with their arms opening
 * toward the right.
 *
 * The apex sits at `at` across and at 58% of `height` down from `top`, and the
 * arms leave above and below it. The width narrows at the apex, which is what
 * makes the strands converge into one hot line there.
 *
 * **A parabola in pixels**, so the apex is the tightest point and its radius
 * is `TURN` of the height whatever the box's shape: drawn in shares of the
 * width, a wide box flattened the apex and a narrow one folded it.
 *
 * @param width The box's width, in CSS pixels, to draw the parabola in.
 * @param reach How far the lower arm runs below the apex, as a share of the
 *   height. It widens toward the ribbon's width on the way.
 */
const bend = (
  top: number,
  height: number,
  at: number,
  narrow: boolean,
  width: number,
  reach: number,
): PathPoint[] => {
  const x = narrow ? Math.max(at, 0.8) : at
  const y = top + height * 0.58
  /* Across, as a share of the width, at `down` heights from the apex. */
  const out = (down: number): number => x + (down * down * height) / (2 * TURN) / width
  /* Evenly spaced, because a spline through points spaced unevenly bends
     hardest where the spacing changes, which put a fold in the arm. The upper
     arm fades in from above the box; the lower one widens toward the
     ribbon's width and dims toward its brightness. */
  const points: PathPoint[] = []
  for (let step = -7; step * 0.15 <= reach + 1e-9; step++) {
    const down = step * 0.15
    const upper = down < 0
    const wide = upper
      ? 0.02 + (WIDTH.bend - 0.02) * Math.min(1, -down / 0.6)
      : 0.02 + (WIDTH.bend * 1.4 - 0.02) * (down / reach)
    const glow = upper ? Math.max(0, 1 + down * 1.07) : 1 - down * 0.73
    points.push([out(down), y + down * height, wide, GLOW.bend * glow])
  }
  return points
}

/**
 * A wave: sharp strands crossing the full width, from off one edge to off the
 * other, with a gentle rise and fall on the way.
 *
 * `fromRight` says which side it enters from, so consecutive waves alternate
 * and the ribbon turns off screen between them.
 *
 * **A wave the ribbon leads into sweeps down across the page from where the
 * ribbon left off**, gathering from the ribbon's width, so the ribbon leans
 * into it. A flat wave entered from off screen met a ribbon running down the
 * page at a right angle, and one that started at a fixed place made a ribbon
 * that ended elsewhere double back to reach it.
 *
 * A flat wave drops in and climbs out a box's height beyond each edge,
 * so its turns happen off screen at any shape of box: a fixed share of the
 * width put them just inside a narrow box.
 *
 * @param width The box's width, in CSS pixels.
 * @param from Where the ribbon before it ended, as a share of the width, or
 *   `undefined` where no ribbon leads into it.
 */
const wave = (
  y: number,
  height: number,
  fromRight: boolean,
  narrow: boolean,
  width: number,
  from?: number,
): PathPoint[] => {
  const w = narrow ? WIDTH.waves * 2 : WIDTH.waves
  const glow = narrow ? GLOW.waves * 0.65 : GLOW.waves
  const side = (share: number): number => (fromRight ? 1 - share : share)
  if (from !== undefined) {
    /* Each point a share of the way from the ribbon to the far edge. */
    const across = (share: number): number => from + ((fromRight ? 0 : 1) - from) * share
    return [
      [across(0.03), y - height * 0.62, WIDTH.ribbon * 0.7, GLOW.ribbon],
      [across(0.12), y - height * 0.36, WIDTH.ribbon * 0.5, glow * 0.55],
      [across(0.38), y - height * 0.1, w, glow],
      [across(0.66), y + height * 0.04, w, glow],
      [across(1), y + height * 0.14, w, glow * 0.6],
      [across(1.5), y + height * 0.3, w, 0],
    ]
  }
  /* One smooth line sampled at even steps: a rise and fall across the box,
     scaled to the width it spans up to 18 pixels, and a curve in and out of
     a parabola beyond each edge. Points placed by hand were spaced unevenly,
     and the spline bent hardest where the spacing changed. */
  const beyond = height / width
  const rise = Math.min(18, width / 80)
  const span = 1 + 2 * beyond
  const steps = Math.ceil(span / ((height * 0.45) / width))
  const points: PathPoint[] = []
  for (let k = 0; k <= steps; k++) {
    const share = -beyond + (k / steps) * span
    const out = share < 0 ? -share / beyond : share > 1 ? (share - 1) / beyond : 0
    const lift = share < 0 ? -out * out : out * out
    const ripple = share >= 0 && share <= 1 ? rise * Math.sin(2 * Math.PI * share) : 0
    points.push([
      side(share),
      y + lift * height * 0.35 + ripple,
      w,
      glow * Math.max(0, 1 - out * 1.6),
    ])
  }
  return points
}

/** How far a ribbon swings either side of its axis, as a share of the width. */
const swingOf = (height: number, width: number, narrow: boolean): number =>
  Math.min(narrow ? 0.26 : 0.3, (height * TURN) / width)

/** How far apart a ribbon's points are, as a share of the height. */
const RIBBON_STEP = 0.35

/**
 * Points on the line from `from` to `to`, both ends left out, spaced from
 * `first` apart at `from` to `last` apart at `to`, a third more each step.
 *
 * **Graded, because the spline is uniform.** It gives every span between two
 * points the same share of its parameter, so where one span is far longer
 * than the next, the curve bends hardest at the point between them. A bend's
 * points are close and a ribbon's far apart, and each change of spacing
 * folded the strand where the two met.
 */
const bridge = (from: PathPoint, to: PathPoint, first: number, last: number): PathPoint[] => {
  const length = to[1] - from[1]
  const gaps: number[] = []
  let gap = first
  let sum = 0
  while (sum + Math.min(gap, last) * 1.5 < length) {
    gaps.push(Math.min(gap, last))
    sum += Math.min(gap, last)
    gap *= 1.33
  }
  const scale = length / (sum + Math.min(gap, last))
  const out: PathPoint[] = []
  let at = 0
  for (const one of gaps) {
    at += one * scale
    const f = at / length
    out.push([
      from[0] + (to[0] - from[0]) * f,
      from[1] + (to[1] - from[1]) * f,
      from[2] + (to[2] - from[2]) * f,
      from[3] + (to[3] - from[3]) * f,
    ])
  }
  return out
}

/**
 * A stretch of soft ribbon from `from` to `to`, in long S-curves around `at`.
 *
 * `phase` continues the curve from where the last stretch left it, so two
 * stretches meet as one.
 *
 * **The swing is capped in pixels.** It is a share of the width and its
 * length a share of the height, so a wide, short box crammed a wide swing
 * into a short curve and turned it tight. Half the height across, at most,
 * keeps each crest's radius above `TURN`.
 */
const ribbon = (
  from: number,
  to: number,
  height: number,
  at: number,
  phase: number,
  narrow: boolean,
  width: number,
): { phase: number; points: PathPoint[] } => {
  const points: PathPoint[] = []
  const step = height * RIBBON_STEP
  const swing = swingOf(height, width, narrow)
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
 * @param height The box's height, in CSS pixels.
 * @param width The box's width, in CSS pixels. `x` is a share of it, and a
 *   bend's apex is drawn in pixels so it keeps its radius at any shape.
 */
export const boxPath = (
  variant: StrandsVariant,
  at: number | undefined,
  height: number,
  width: number,
): PathPoint[] => {
  /* **A box is never narrow.** The narrow layout keeps a phone's text clear by
     pushing each form to the edge of the viewport; a box is the frame the
     consumer chose, so its form stays where `at` puts it at any width. */
  const narrow = false
  if (variant === 'bend') {
    return bend(0, height, at ?? BEND_AT, narrow, width, 0.6)
  }
  if (variant === 'waves') {
    return wave(height * 0.5, height, false, narrow, width)
  }
  const start = -height * 0.4
  const lead: PathPoint = [at ?? 0.5, start - height * 0.4, WIDTH.ribbon, 0]
  const body = ribbon(start, height * 1.4, height, at ?? 0.5, 0, narrow, width).points.map(
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
 * between two waves less than a screen and a half apart, where it turns off
 * screen so each wave reads alone.
 * Without stops, `fill` runs the length of the page: a bend opens the page and
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
    } else if (fill === 'bend') {
      placed.push({ at: undefined, height, top: 0, variant: 'bend' })
    }
  }

  const points: PathPoint[] = [[0.6, -height * 0.9, WIDTH.ribbon, 0]]
  /* How far the ribbon's curve turns between two of its points. */
  const turn = (RIBBON_STEP / 1.7) * Math.PI
  let phase = 1.2
  let cursor = 0
  let fromRight = true
  let previous: StrandsVariant | undefined
  /* Where the ribbon last laid down ended, which a wave then leans out of. */
  let joined: number | undefined

  const gap = (to: number, next: StrandsVariant | undefined): void => {
    if (to - cursor < height * 0.7) {
      return
    }
    /* Waves a screen or so apart read as a set, each alone. Across a longer
       gap the ribbon comes back, so the page holds one strand from top to
       bottom and the next wave does not arrive from nowhere. */
    if (previous === 'waves' && next === 'waves' && to - cursor < height * 1.5) {
      return
    }
    const end = next === 'waves' ? to - height * 0.95 : to - height * 0.45
    const stretch = ribbon(cursor + height * 0.2, end, height, 0.5, phase, narrow, width)
    phase = stretch.phase
    let run = stretch.points
    /* Before a wave, the ribbon ends at a crest, where it runs straight down,
       and the wave sweeps away from that side. Ended anywhere else, it was
       either heading out to its side, and doubled back to cross, or crossing
       at its steepest, and bent hard into the line down to the wave. */
    /* With no crest to end at, the wave sweeps the way the ribbon is heading. */
    let heading: boolean | undefined
    if (next === 'waves') {
      for (let k = run.length - 2; k > 0; k--) {
        const [one, two, three] = run.slice(k - 1, k + 2) as [PathPoint, PathPoint, PathPoint]
        if ((two[0] - one[0]) * (three[0] - two[0]) <= 0) {
          run = run.slice(0, k + 1)
          break
        }
        if (k === 1) {
          heading = three[0] < two[0]
        }
      }
    }
    /* After a wave, the ribbon comes back on the side the wave came in from
       and lights up as it comes. The stretch from the wave's far edge back
       across is unlit, so the strand never visibly doubles back. */
    if (previous === 'waves' && run.length > 1) {
      run = run.map(
        (point, k): PathPoint =>
          k < 3 ? [point[0], point[1], point[2], point[3] * Math.max(0, k - 1) * 0.5] : point,
      )
    }
    points.push(...run)
    const last = run.at(-1)
    if (last) {
      fromRight = heading ?? last[0] > 0.5
      joined = last[0]
    }
  }

  for (const stop of placed) {
    joined = undefined
    gap(stop.top, stop.variant)
    if (stop.variant === 'bend') {
      const span = Math.min(stop.height, height)
      const at = stop.at ?? BEND_AT
      /* The ribbon takes over where its curve runs at the arm's slope, and
         the two meet in even steps along that slope. On a phone the apex
         sits at the right edge and the ribbon cannot run that way, so the
         arm runs off the screen and the ribbon comes back in at its crest. */
      const slope = BEND_EXIT / TURN
      const swing = swingOf(height, width, narrow)
      const steepest = (swing * width * Math.PI) / (1.7 * height)
      const a = Math.acos(Math.min(1, slope / steepest))
      const x = 0.5 + swing * Math.sin(a)
      const bent = bend(stop.top, span, at, narrow, width, narrow ? 0.6 : BEND_EXIT)
      const exit = bent.at(-1) as PathPoint
      points.push(...bent)
      if (!narrow && x > exit[0]) {
        const drop = Math.max(height * 0.3, ((x - exit[0]) * width) / slope)
        const start: PathPoint = [x, exit[1] + drop, WIDTH.ribbon, GLOW.ribbon]
        points.push(...bridge(exit, start, span * 0.15, height * RIBBON_STEP))
        cursor = start[1] - height * 0.2
        phase = a - turn
      } else {
        cursor = exit[1] + height * 0.1
        phase = Math.PI / 2 - turn
      }
      fromRight = true
    } else if (stop.variant === 'waves') {
      const crossing = wave(stop.top, height, fromRight, narrow, width, joined)
      /* A ribbon that ended at its crest well above the wave reaches it in
         even steps. One long span beside the wave's short ones bent the
         spline hardest where the spacing changed. */
      const end = points.at(-1)
      const lead = crossing[0]
      if (joined !== undefined && end && lead) {
        points.push(...bridge(end, lead, height * RIBBON_STEP, height * 0.26))
      }
      points.push(...crossing)
      /* A ribbon after a wave it led into comes back on the side the wave
         came in from, at the crest of its curve there. After a flat wave, it
         comes back in on the side the wave left by. */
      phase =
        joined === undefined
          ? (fromRight ? Math.PI * 1.5 : Math.PI / 2) - turn
          : (fromRight ? Math.PI / 2 : Math.PI * 1.5) - turn
      fromRight = joined === undefined ? !fromRight : fromRight
      cursor = stop.top + height * (joined === undefined ? 0.35 : 0.5)
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
  /* The path ends the way it was heading, then below the page. Dropped
     straight from its last point, the spline bent toward the drop before the
     last point, at the edge of the screen. */
  const last = points.at(-1) ?? [0.5, page, WIDTH.ribbon, 0]
  const before = points.at(-2) ?? last
  const on: PathPoint = [2 * last[0] - before[0], 2 * last[1] - before[1], last[2], 0]
  points.push(on, [on[0], Math.max(on[1], page) + height, last[2], 0])
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
