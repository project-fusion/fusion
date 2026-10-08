/**
 * The shape of the ribbon, as points the shader joins with a Catmull-Rom
 * spline.
 *
 * Pure, so `path.pure.spec.ts` can hold the geometry without a GPU: what a
 * shape is, where a stop puts it, and which stretch of a page-long path is on
 * screen are all arithmetic.
 */

/** The three forms the ribbon takes. */
export type StrandsVariant = 'bend' | 'ribbon' | 'sweep' | 'waves'

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
  /** The target's left edge, as a share of the width, where it is known. */
  left?: number | undefined
  /** The target's right edge, as a share of the width, where it is known. */
  right?: number | undefined
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
const GLOW = { bend: 1, ribbon: 0.36, sweep: 0.8, waves: 0.7 } as const

/**
 * The width of each form, as a share of the width, before `spread`.
 *
 * The ribbon's is the 0.24 it was drawn at before a `spread` of 1 came to
 * mean 1.35, which was tuned on the bend: carried to the ribbon, with depth
 * pushing the near strands further out, it ran most of half a page wide and
 * read as loose strands rather than a band.
 */
const WIDTH = { bend: 0.12, ribbon: 0.18, sweep: 0.16, waves: 0.06 } as const

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
     ribbon's width and dims toward its brightness.

     **The pinch is a bell, not a V.** Every strand sits at a share of the
     width from the centerline, so where the width bends, every strand off
     the center bends with it. Narrowed in straight lines to a point, from
     0.094 one point below the apex to 0.02 at it, the outer strands turned a
     corner about 70 pixels round at the pinch. A Gaussian narrows them over
     a third of the height with no corner anywhere. */
  const pinch = (down: number): number => 1 - Math.exp(-((down / 0.32) ** 2))
  const points: PathPoint[] = []
  for (let step = -7; step * 0.15 <= reach + 1e-9; step++) {
    const down = step * 0.15
    const upper = down < 0
    const far = upper ? WIDTH.bend : WIDTH.bend + WIDTH.bend * 0.4 * (down / reach)
    const wide = 0.02 + (far - 0.02) * pinch(down)
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

/**
 * The ribbon's width over each form's own at a `spread` of `1`, which the
 * renderer multiplies in. Here so the path can know how far its strands reach.
 */
export const SPREAD = 1.35

/**
 * How far the strands reach either side of the centerline, as a multiple of
 * the ribbon's breadth: the strand's place across the ribbon, its depth, and
 * the breath of the ribbon's width together. A few strands reach further,
 * and the shader eases those in a turn rather than folding them.
 */
const REACH = 1.3

/** What the shader's sway and wave add to a strand's reach, in pixels. */
const WOBBLE = 40

/**
 * How far a strand of a form this wide can sit from the centerline, in
 * pixels, at the default spread.
 */
const reachOf = (wide: number, width: number): number => wide * SPREAD * width * REACH + WOBBLE

/** How many screen heights the ribbon takes for one S, from one crest to the next. */
const PERIOD = 1.7

/**
 * The shape of the ribbon down a page, each as a multiplier or a share of the
 * width, so a page can try another without the path's arithmetic changing.
 */
export interface PathShape {
  /** How far the ribbon swings side to side, over the most its turns allow. */
  swing: number
  /** How long one S takes, over `PERIOD` screens. */
  period: number
  /** How far the ribbon's axis sits from the middle, as a share of the width; positive is right. */
  lean: number
  /** How far from the middle a wave's sweep lands, as a share of the width. */
  sweep: number
}

/**
 * The shape a page draws unless it asks for another: calm, the ribbon
 * swinging six tenths of the most its turns allow over S curves 2.4 screens
 * long, resting a tenth of the width right of the middle. Compared down the
 * whole landing page against wider, quicker, and leaning shapes, this one
 * read as one long current rather than a ribbon zigzagging between cards.
 */
export const SHAPE: PathShape = { lean: 0.1, period: 1.4, sweep: 0.4, swing: 0.6 }

/**
 * How far a ribbon swings either side of its axis, as a share of the width.
 *
 * **No crest turns tighter than the strands reach.** A strand is the
 * centerline moved sideways, so on the inside of a turn whose radius is less
 * than that move, it has nowhere to go but back over itself. The swing that
 * keeps a crest's radius, `(PERIOD * height)^2 / (pi^2 * swing)`, above the
 * reach of the ribbon's widest strands is the most it may take, and on a wide
 * screen, where the ribbon is wider, it swings less.
 */
const swingOf = (
  height: number,
  width: number,
  narrow: boolean,
  shape: PathShape = SHAPE,
): number => {
  const reach = reachOf((narrow ? 0.45 : WIDTH.ribbon) * 1.1, width)
  const gentle = (PERIOD * shape.period * height) ** 2 / (Math.PI ** 2 * reach * 1.15)
  return Math.min((narrow ? 0.26 : 0.3) * shape.swing, (height * TURN) / width, gentle / width)
}

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
  shape: PathShape = SHAPE,
): { phase: number; points: PathPoint[] } => {
  const points: PathPoint[] = []
  const step = height * RIBBON_STEP
  const swing = swingOf(height, width, narrow, shape)
  const wide = narrow ? 0.45 : WIDTH.ribbon
  const glow = narrow ? GLOW.ribbon * 0.65 : GLOW.ribbon
  let a = phase
  for (let y = from; y < to; y += step) {
    a += (step / (PERIOD * shape.period * height)) * Math.PI
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
  if (variant === 'sweep') {
    /* From above the corner `at` names to the far side below the box. */
    return pagePath(
      [{ at, height: height * 0.6, left: 0.08, right: 0.92, top: height * 0.4, variant: 'sweep' }],
      'ribbon',
      width,
      height,
      height,
    )
  }
  const start = -height * 0.4
  const lead: PathPoint = [at ?? 0.5, start - height * 0.4, WIDTH.ribbon, 0]
  const body = ribbon(start, height * 1.4, height, at ?? 0.5, 0, narrow, width).points.map(
    ([x, y, w]): PathPoint => [x, y, w, narrow ? GLOW.ribbon * 0.65 * 1.4 : GLOW.ribbon * 1.4],
  )
  return [lead, ...body]
}

/**
 * The tightest turn the drawn spline makes between two points where a reader
 * can see it, lit and on the screen or near it, as the radius in pixels,
 * sampled at eight places, and the reach of its strands there.
 */
const tightestIn = (
  points: readonly PathPoint[],
  i: number,
  width: number,
): { radius: number; reach: number } => {
  const n = points.length
  const at = (k: number, c: number): number => points[Math.max(0, Math.min(n - 1, k))]?.[c] ?? 0
  const sample = (f: number): [number, number, number, number] => {
    const along = (c: number): number =>
      catmull(at(i - 1, c), at(i, c), at(i + 1, c), at(i + 2, c), f)
    return [along(0) * width, along(1), along(2), along(3)]
  }
  let radius = Number.POSITIVE_INFINITY
  let reach = 0
  for (let k = 1; k < 8; k++) {
    const [ax, ay] = sample((k - 0.5) / 8)
    const [bx, by, wide, glow] = sample(k / 8)
    const [cx, cy] = sample((k + 0.5) / 8)
    /* An unlit turn, or one off the screen, is where the ribbon turns
       round out of sight on purpose: off the edge between two waves. */
    if (glow < 0.1 || bx < -0.1 * width || bx > 1.1 * width) {
      continue
    }
    const area = Math.abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax)) / 2
    const r =
      area < 1e-6
        ? Number.POSITIVE_INFINITY
        : (Math.hypot(bx - ax, by - ay) *
            Math.hypot(cx - bx, cy - by) *
            Math.hypot(cx - ax, cy - ay)) /
          (4 * area)
    if (r < radius) {
      radius = r
      reach = reachOf(Math.max(0, wide), width)
    }
  }
  return { radius, reach }
}

/**
 * The path with every turn eased until it is wider than the strands on it
 * reach.
 *
 * **One rule at every join, after the forms are laid down.** Each form keeps
 * its own turns gentle, and each hand-over between two of them, a bend into
 * the ribbon, the ribbon into a wave, a wave back into the ribbon, met in a
 * turn its own arithmetic did not see: on a wide screen, where the ribbon is
 * wider in pixels, a join a few hundred pixels round held strands that
 * reached six hundred, and the inside ones folded. Measured on the drawn
 * spline between each pair of points, since a curve through points a third of
 * a screen apart turns far tighter between them than the points themselves
 * say. Where a lit stretch turns tighter than its reach, or than a quarter of
 * the screen's shorter side, its two ends move a quarter of the way across
 * toward their neighbors, and the pass runs again until none does, or for
 * eighty passes.
 *
 * Across only: a point keeps its place down the page, so a form keeps the
 * section it was pinned to. A form whose turns are tight by design, a sweep
 * landing on a corner, names its points in `kept`: they hold the reach rule
 * by narrowing, and easing them would move the corner they land on.
 */
const relax = (
  points: PathPoint[],
  width: number,
  height: number,
  kept: ReadonlySet<number>,
): PathPoint[] => {
  const out = points.map((point): PathPoint => [...point])
  const floor = 0.3 * Math.min(width, height)
  const ease = (i: number): void => {
    const a = out[i - 1]
    const b = out[i]
    const c = out[i + 1]
    if (a && b && c) {
      out[i] = [b[0] + ((a[0] + c[0]) / 2 - b[0]) / 4, b[1], b[2], b[3]]
    }
  }
  for (let pass = 0; pass < 80; pass++) {
    let eased = false
    for (let i = 1; i < out.length - 2; i++) {
      if (kept.has(i) || kept.has(i + 1)) {
        continue
      }
      const { radius, reach } = tightestIn(out, i, width)
      if (radius < Math.max(reach * 1.1, floor)) {
        ease(i)
        ease(i + 1)
        eased = true
      }
    }
    if (!eased) {
      break
    }
  }
  return out
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
 * @param shape The ribbon's shape down the page.
 */
export const pagePath = (
  stops: readonly PlacedStop[],
  fill: StrandsVariant,
  width: number,
  height: number,
  page: number,
  shape: PathShape = SHAPE,
): PathPoint[] => {
  const period = PERIOD * shape.period
  /* Where the ribbon's axis rests between the forms that move it. */
  const home = 0.5 + shape.lean
  const narrow = width < NARROW
  const placed = [...stops].sort((one, two) => one.top - two.top)
  if (placed.length === 0) {
    if (fill === 'waves') {
      for (let y = height * 0.6; y < page; y += height * 1.3) {
        placed.push({ at: undefined, height, top: y, variant: 'waves' })
      }
    } else if (fill === 'bend' || fill === 'sweep') {
      placed.push({ at: undefined, height, top: 0, variant: fill })
    }
  }

  const points: PathPoint[] = [[0.6, -height * 0.9, WIDTH.ribbon, 0]]
  /* How far the ribbon's curve turns between two of its points. */
  const turn = (RIBBON_STEP / period) * Math.PI
  let phase = 1.2
  let cursor = 0
  let fromRight = true
  let previous: StrandsVariant | undefined
  /* Where the ribbon last laid down ended, which a wave then leans out of. */
  let joined: number | undefined
  /* The axis the next stretch of ribbon swings about, which a bend sets so the
     ribbon picks up where its arm leaves off. */
  let axis = home
  /* Whether the ribbon carries on out of the wave before it, lit, rather
     than coming back in from the edge. */
  let carried = false
  /* Points a form laid with tight turns on purpose, which `relax` leaves. */
  const kept = new Set<number>()

  const gap = (to: number, next: StrandsVariant | undefined): void => {
    /* **A ribbon a wave carried on runs on to the next form**, however near
       it is: the wave has already turned down into it, and dropping it left
       the strand ending in the middle of the page. */
    if (to - cursor < height * (carried ? 0.4 : 0.7)) {
      return
    }
    /* Waves a screen or so apart read as a set, each alone. Across a longer
       gap the ribbon comes back, so the page holds one strand from top to
       bottom and the next wave does not arrive from nowhere. */
    if (previous === 'waves' && next === 'waves' && !carried && to - cursor < height * 1.5) {
      return
    }
    const end = next === 'waves' ? to - height * 0.95 : to - height * 0.45
    const stretch = ribbon(cursor + height * 0.2, end, height, axis, phase, narrow, width, shape)
    axis = home
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
    if (previous === 'waves' && !carried && run.length > 1) {
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

  /**
   * The ribbon carrying on from the crest a sweep ended at, the last point
   * laid, heading `way` across the page: its first points lie on its own
   * curve from the crest, spaced as the sweep's are and growing a third a
   * step to its own spacing, widening from `from` to the ribbon as they go,
   * because the spline bends hardest where the spacing jumps.
   */
  const carryFrom = (way: number, from: number, light: number, spacing: number): void => {
    const bottom = points.at(-1) as PathPoint
    const swing = swingOf(height, width, narrow, shape)
    const wide = narrow ? 0.45 : WIDTH.ribbon
    axis = bottom[0] - way * swing
    let phaseAt = way > 0 ? Math.PI / 2 : Math.PI * 1.5
    let y = bottom[1]
    let gap = spacing
    const ramp = Math.ceil(Math.log((height * RIBBON_STEP) / spacing) / Math.log(1.33))
    let k = 0
    while (gap < height * RIBBON_STEP) {
      y += gap
      phaseAt += (gap / (period * height)) * Math.PI
      k += 1
      const f = Math.min(1, k / Math.max(ramp, 1))
      points.push([
        axis + swing * Math.sin(phaseAt),
        y,
        from + (wide - from) * f,
        light + (GLOW.ribbon - light) * f,
      ])
      gap *= 1.33
    }
    phase = phaseAt
    cursor = y + height * RIBBON_STEP - height * 0.2
    fromRight = way > 0
    carried = true
  }

  /* Whether a ribbon is laid between a stop that ends at `from` and the stop
     after it, by the same rule `gap` keeps. */
  const ribbonAfter = (from: number, next: PlacedStop | undefined): boolean =>
    next !== undefined &&
    next.top - from >= height * 0.7 &&
    !(next.variant === 'waves' && next.top - from < height * 1.5)

  for (const [index, stop] of placed.entries()) {
    joined = undefined
    /* A sweep comes in from the page's top corner, so no ribbon leads to it. */
    if (stop.variant !== 'sweep') {
      gap(stop.top, stop.variant)
    }
    carried = false
    if (stop.variant === 'bend') {
      const span = Math.min(stop.height, height)
      const at = stop.at ?? BEND_AT
      /* The ribbon takes over where its curve runs at the arm's slope, and
         the two meet in even steps along that slope. **Its axis moves to
         meet the arm**, so wherever `at` puts the apex, the ribbon picks up
         beside the arm's end and carries on the way it was heading: with the
         axis held in the middle, an apex right of the ribbon's reach left the
         ribbon to turn back across in a quarter of a screen, tighter than
         the strands were wide. On a phone the apex sits at the right edge
         and the ribbon cannot run that way, so the arm runs off the screen
         and the ribbon comes back in at its crest. */
      /* **The arm ends no steeper than the ribbon can run.** Its slope grows
         as it leaves the apex, and a calm ribbon, swinging little over long
         curves, is never as steep as the arm at `BEND_EXIT`: the two met at an
         angle. The arm stops at the last of its points whose slope the
         ribbon's curve reaches, so the curve picks it up at that slope. */
      const swing = swingOf(height, width, narrow, shape)
      const steepest = (swing * width * Math.PI) / (period * height)
      const reach = Math.max(0.15, Math.floor(Math.min(BEND_EXIT, steepest * TURN) / 0.15) * 0.15)
      const slope = reach / TURN
      const a = Math.acos(Math.min(1, slope / steepest))
      const bent = bend(stop.top, span, at, narrow, width, narrow ? 0.6 : reach)
      const exit = bent.at(-1) as PathPoint
      points.push(...bent)
      if (!narrow) {
        /* **The ribbon's own curve starts at the arm's end**, where its slope
           is the arm's, with its axis moved so the two meet: one line from
           the arm into the ribbon, with no straight piece and no turn at the
           join. Its first points are spaced as the bend's are and grow a
           third a step to the ribbon's own spacing, because the spline is
           uniform and bends hardest where the spacing jumps.

           The axis may put a crest a little past the edge: strands partly
           off the screen read as the ribbon passing by. Where it would have
           to go further it stops there, and the curve starts as near the
           arm's slope as that axis allows. A bridge dropped straight down
           from the arm, or a ribbon started short of it, turned a corner
           there tighter than the strands reach. */
        axis = Math.min(1.08 - swing, Math.max(swing - 0.08, exit[0] - swing * Math.sin(a)))
        let phaseAt = Math.asin(Math.max(-1, Math.min(1, (exit[0] - axis) / swing)))
        phaseAt = Math.max(phaseAt, Math.min(a, Math.PI / 2))
        let y = exit[1]
        let spacing = span * 0.15
        let k = 0
        const steps = Math.ceil(Math.log((height * RIBBON_STEP) / spacing) / Math.log(1.33))
        while (spacing < height * RIBBON_STEP) {
          y += spacing
          phaseAt += (spacing / (period * height)) * Math.PI
          k += 1
          const f = Math.min(1, k / Math.max(steps, 1))
          points.push([
            axis + swing * Math.sin(phaseAt),
            y,
            exit[2] + (WIDTH.ribbon - exit[2]) * f,
            exit[3] + (GLOW.ribbon - exit[3]) * f,
          ])
          spacing *= 1.33
        }
        /* The ribbon lays its first point one step on, which is where `gap`
           starts it from `cursor`. */
        cursor = y + height * RIBBON_STEP - height * 0.2
        phase = phaseAt
      } else {
        cursor = exit[1] + height * 0.1
        phase = Math.PI / 2 - turn
      }
      fromRight = true
    } else if (stop.variant === 'sweep') {
      /* **A sweep crosses the page in one diagonal**, half a sine from a crest
         above the page's top corner on the side `at` is nearer to a crest
         at its target's far top corner, where the ribbon carries on down the
         page. Point it at the section it lands on. The upper crest sits a
         third of a screen above the page, so the strand comes in at the corner
         already heading across. To keep words over it legible, name them in
         the root's `quiet`, and the light dims behind them.

         **Full where it runs straight, narrower where it turns.** Its width
         at each point is the most the turn there allows, so the band is at
         full breadth through the long middle of the diagonal and narrows only
         into the crest it lands on. */
      const right = (stop.at ?? 0.9) >= 0.5
      const way = right ? -1 : 1
      const from = right ? 0.98 : 0.02
      const land = right ? (stop.left ?? 0.06) : (stop.right ?? 0.94)
      const full = narrow ? 0.3 : WIDTH.sweep
      const glow = narrow ? GLOW.sweep * 0.65 : GLOW.sweep
      const begins = Math.min(stop.top, 0) - height * 0.35
      const descent = stop.top - begins
      const across = (land - from) * width
      const allowed = (radius: number): number =>
        Math.max(0.006, Math.min(full, (radius / 1.15 - WOBBLE) / (SPREAD * width * REACH)))
      const radiusAt = (f: number): number => {
        const slope = ((across * Math.PI) / (2 * descent)) * Math.sin(Math.PI * f)
        const bend = Math.abs(
          ((across * Math.PI ** 2) / (2 * descent ** 2)) * Math.cos(Math.PI * f),
        )
        return bend < 1e-9 ? Number.POSITIVE_INFINITY : (1 + slope * slope) ** 1.5 / bend
      }
      const spacing = height * 0.08
      const count = Math.max(8, Math.ceil(descent / spacing))
      points.push([from, begins - height * 0.4, allowed(radiusAt(0)), 0])
      for (let k = 0; k <= count; k++) {
        const f = k / count
        kept.add(points.length)
        points.push([
          from + ((land - from) * (1 - Math.cos(Math.PI * f))) / 2,
          begins + descent * f,
          allowed(radiusAt(f)),
          glow * Math.min(1, (k + 1) / 3),
        ])
      }
      carryFrom(way, allowed(radiusAt(1)), glow, descent / count)
    } else if (stop.variant === 'waves') {
      const carries =
        joined !== undefined && ribbonAfter(stop.top + height * 0.5, placed[index + 1])
      const end = points.at(-1)
      if (carries && end) {
        /* **A wave the ribbon carries on out of is one sweep across the
           page**, half a sine from a crest on one side to a crest a tenth of
           the screen in from the other, centered on the wave's height. The
           ribbon narrows to the wave's width on the way into it and widens
           again on the way out, and carries on from the far crest with its
           axis moved to meet it.

           **A sine, because its curvature never jumps.** Built from quarter
           circles and a straight run, every joint went from no curvature to
           a circle's at once, and the spline overshot there to twice the
           circle's. The sweep descends far enough that its crests, its
           tightest places, are wider than a wave's strands reach.

           It used to run off the far edge while the ribbon came back in from
           the near one, unlit for its first screen, so the page went dark for
           a screen in the middle. Waves close together still each run off the
           edge, so each reads alone. */
        const way = end[0] < 0.5 ? 1 : -1
        const thin = narrow ? WIDTH.waves * 2 : WIDTH.waves
        const glow = narrow ? GLOW.waves * 0.65 : GLOW.waves
        const blend = (a: number, b: number, f: number): number => a + (b - a) * f
        const from = end[0]
        const to = 0.5 + way * shape.sweep
        /* Half the crossing, in pixels, and the descent that keeps each
           crest's radius, `descent^2 / (pi^2 * amplitude)`, wider than the
           strands reach. */
        const amplitude = (Math.abs(to - from) * width) / 2
        const radius = Math.max(reachOf(thin, width), 0.3 * Math.min(width, height)) * 1.15
        const descent = Math.PI * Math.sqrt(radius * amplitude)
        const begins = Math.max(end[1] + height * 0.3, stop.top - descent / 2)
        const spacing = height * 0.12
        /* Straight down from the ribbon's crest to where the sweep begins,
           narrowing to the wave as it goes, spaced from the ribbon's step
           down to the sweep's. */
        const top: PathPoint = [from, begins, thin, glow * 0.7]
        const mirror = ([x, y, w, g]: PathPoint): PathPoint => [x, -y, w, g]
        points.push(
          ...bridge(mirror(top), mirror(end), spacing, height * RIBBON_STEP)
            .map(mirror)
            .reverse(),
          top,
        )
        const count = Math.max(4, Math.ceil(descent / spacing))
        for (let k = 1; k <= count; k++) {
          const f = k / count
          points.push([
            from + ((to - from) * (1 - Math.cos(Math.PI * f))) / 2,
            begins + descent * f,
            thin,
            blend(glow * 0.7, glow, Math.sin(Math.PI * f)),
          ])
        }
        carryFrom(way, thin, glow * 0.7, spacing)
      } else {
        const crossing = wave(stop.top, height, fromRight, narrow, width, joined)
        /* A ribbon that ended at its crest well above the wave reaches it in
           even steps. One long span beside the wave's short ones bent the
           spline hardest where the spacing changed. */
        const lead = crossing[0]
        if (joined !== undefined && end && lead) {
          points.push(...bridge(end, lead, height * RIBBON_STEP, height * 0.26))
        }
        points.push(...crossing)
        /* A ribbon after a wave it led into comes back on the side the wave
           came in from, at the crest of its curve there. After a flat wave,
           it comes back in on the side the wave left by. */
        phase =
          joined === undefined
            ? (fromRight ? Math.PI * 1.5 : Math.PI / 2) - turn
            : (fromRight ? Math.PI / 2 : Math.PI * 1.5) - turn
        fromRight = joined === undefined ? !fromRight : fromRight
        cursor = stop.top + height * (joined === undefined ? 0.35 : 0.5)
      }
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
  return relax(points.slice(0, MAX_POINTS), width, height, kept)
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
 * How far along the drawn centerline each point is, in CSS pixels, for the
 * shader to set every frequency by.
 *
 * **Arc length, which only grows.** The shader used the sum of a point's `y`
 * and its `x` in pixels, which grows down a page and across a wave heading
 * right, and runs backward wherever the path heads left faster than it heads
 * down: on a bend's upper arm, and across a wave sweeping left. There the
 * strands' twist and waves ran in reverse, and every strand turned a corner
 * at the same place.
 *
 * Sixteen samples a segment of the same spline the shader draws.
 *
 * @param points The path.
 * @param width The box's width, in CSS pixels, which `x` is a share of.
 */
export const arcLengths = (points: readonly PathPoint[], width: number): Float32Array => {
  const n = points.length
  const out = new Float32Array(n)
  const at = (i: number, c: number): number => points[Math.max(0, Math.min(n - 1, i))]?.[c] ?? 0
  let total = 0
  for (let i = 0; i < n - 1; i++) {
    let x = at(i, 0) * width
    let y = at(i, 1)
    for (let k = 1; k <= 16; k++) {
      const f = k / 16
      const nx = catmull(at(i - 1, 0), at(i, 0), at(i + 1, 0), at(i + 2, 0), f) * width
      const ny = catmull(at(i - 1, 1), at(i, 1), at(i + 1, 1), at(i + 2, 1), f)
      total += Math.hypot(nx - x, ny - y)
      x = nx
      y = ny
    }
    out[i + 1] = total
  }
  return out
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
