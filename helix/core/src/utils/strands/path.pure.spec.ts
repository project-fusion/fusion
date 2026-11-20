import { describe, expect, test } from 'bun:test'
import {
  arcLengths,
  boxPath,
  catmull,
  lookup,
  MAX_POINTS,
  type PathPoint,
  type PlacedStop,
  pagePath,
  SPREAD,
  TURN,
  visibleRange,
} from './path.js'

/** The point a form is narrowest at, which for a bend is its apex. */
const narrowest = (points: readonly PathPoint[]): PathPoint =>
  points.reduce((one, two) => (two[2] < one[2] ? two : one))

/** The points a reader can see: lit, and inside the width. */
const lit = (points: readonly PathPoint[]): PathPoint[] =>
  points.filter(([x, , , brightness]) => brightness > 0 && x > 0 && x < 1)

/**
 * The radius of the tightest turn a reader can see, in pixels: the drawn
 * spline, sampled finely, where it is lit and inside the box.
 */
const tightest = (points: readonly PathPoint[], width: number, height: number): number => {
  const n = points.length
  const at = (k: number, c: number): number => points[Math.max(0, Math.min(n - 1, k))]?.[c] ?? 0
  const sample = (s: number): [number, number, number] => {
    const i = Math.min(Math.floor(s), n - 2)
    const f = s - i
    const along = (c: number): number =>
      catmull(at(i - 1, c), at(i, c), at(i + 1, c), at(i + 2, c), f)
    return [along(0) * width, along(1), along(3)]
  }
  let least = Number.POSITIVE_INFINITY
  for (let s = 0.02; s < n - 1.02; s += 0.02) {
    const [x0, y0] = sample(s - 0.02)
    const [x1, y1, glow] = sample(s)
    const [x2, y2] = sample(s + 0.02)
    if (glow < 0.15 || x1 < 0 || x1 > width || y1 < 0 || y1 > height) {
      continue
    }
    const area = Math.abs((x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0)) / 2
    const sides =
      Math.hypot(x1 - x0, y1 - y0) * Math.hypot(x2 - x1, y2 - y1) * Math.hypot(x2 - x0, y2 - y0)
    least = Math.min(least, area < 1e-9 ? Number.POSITIVE_INFINITY : sides / (4 * area))
  }
  return least
}

describe('strands box path', () => {
  test('a bend turns at its narrowest and brightest point, where `at` puts it, 58% down', () => {
    const points = boxPath('bend', 0.3, 400, 800)
    const bend = narrowest(points)
    expect(bend[0]).toBe(0.3)
    expect(bend[1]).toBeCloseTo(232)
    expect(bend[3]).toBe(Math.max(...points.map((one) => one[3])))
  })

  test("a bend's arms leave the box above and below its apex, opening to the right", () => {
    const points = boxPath('bend', undefined, 400, 800)
    const first = points[0] as PathPoint
    const last = points.at(-1) as PathPoint
    const bend = narrowest(points)
    expect(first[1]).toBeLessThan(0)
    expect(last[1]).toBeGreaterThan(400)
    expect(first[0]).toBeGreaterThan(bend[0])
    expect(last[0]).toBeGreaterThan(bend[0])
  })

  test('a bend in a narrow box stays where `at` puts it', () => {
    /* The narrow rule is for the viewport in `travel`. A box is the frame the
       consumer chose, so a box only a few hundred pixels wide must not push the
       bend to the edge, which is what an early version did. */
    expect(narrowest(boxPath('bend', 0.2, 300, 240))[0]).toBe(0.2)
  })

  test('a wave enters off one edge and leaves off the other, through the middle', () => {
    const points = boxPath('waves', undefined, 400, 800)
    const xs = points.map(([x]) => x)
    expect(Math.min(...xs)).toBeLessThan(0)
    expect(Math.max(...xs)).toBeGreaterThan(1)
    for (const [x, y] of points) {
      if (x >= 0 && x <= 1) {
        expect(Math.abs(y - 200)).toBeLessThanOrEqual(18)
      }
    }
  })

  test('no form turns tighter than half the box is tall, at any shape of box', () => {
    /* A bend's apex a few dozen pixels round folded the light, and a ribbon in
       a wide, short box crammed its swing into a tight curve. The spline is
       sampled, so a turn may read a few per cent under its true radius. */
    for (const [width, height] of [
      [1440, 500],
      [800, 400],
      [300, 400],
    ] as const) {
      for (const pattern of ['bend', 'ribbon', 'waves'] as const) {
        const points = boxPath(pattern, undefined, height, width)
        expect(tightest(points, width, height)).toBeGreaterThan(height * TURN * 0.9)
      }
    }
  })

  test("a bend's apex is its tightest turn, at exactly the floor", () => {
    expect(tightest(boxPath('bend', 0.4, 500, 1440), 1440, 500)).toBeCloseTo(250, -1)
  })

  test('a ribbon runs the full height of the box around `at`, with nothing unlit inside it', () => {
    const points = boxPath('ribbon', 0.6, 400, 800)
    const ys = points.map(([, y]) => y)
    expect(Math.min(...ys)).toBeLessThan(0)
    expect(Math.max(...ys)).toBeGreaterThan(400)
    const middle = points.filter(([, y]) => y >= 0 && y <= 400)
    for (const [x, , , brightness] of middle) {
      expect(Math.abs(x - 0.6)).toBeLessThanOrEqual(0.3 + 1e-9)
      expect(brightness).toBeGreaterThan(0)
    }
  })
})

describe('strands page path', () => {
  const view = { height: 800, width: 1280 }
  const stop = (top: number, pattern: PlacedStop['pattern'], at?: number): PlacedStop => ({
    at,
    height: 700,
    pattern,
    top,
  })

  test('places the stops in page order, whatever order they were written in', () => {
    const written = [stop(4000, 'waves'), stop(0, 'bend'), stop(5200, 'waves')]
    const points = pagePath(written, 'ribbon', view.width, view.height, 6400)
    const bend = narrowest(points)
    expect(bend[1]).toBeLessThan(800)
    /* Each wave rises and falls by a few pixels on its own, so what is ordered
       is the waves, not their points: the whole first one comes first. */
    const index = (near: number): number[] =>
      points.flatMap(([, y, width, brightness], i) =>
        width === 0.06 && brightness > 0 && Math.abs(y - near) < 100 ? [i] : [],
      )
    const first = index(4000)
    const second = index(5200)
    expect(first.length).toBeGreaterThan(0)
    expect(second.length).toBeGreaterThan(0)
    expect(Math.max(...first)).toBeLessThan(Math.min(...second))
  })

  test('turns off screen between two waves a screen apart, so each reads alone', () => {
    const points = pagePath(
      [stop(0, 'bend'), stop(4000, 'waves'), stop(5200, 'waves')],
      'ribbon',
      view.width,
      view.height,
      6400,
    )
    /* The first wave sweeps down a fifth of a screen as it crosses. */
    const between = lit(points).filter(([, y]) => y > 4000 + 160 && y < 5200 - 60)
    expect(between).toEqual([])
  })

  test('carries the ribbon on out of a wave it led into, lit, with no dark stretch', () => {
    /* The wave ran off the far edge while the ribbon came back in unlit from
       the near one, so the page went dark for a screen in the middle. */
    const points = pagePath(
      [stop(0, 'bend', 0.86), stop(4000, 'waves'), stop(7600, 'waves')],
      'ribbon',
      view.width,
      view.height,
      8400,
    )
    const shown = lit(points)
      .map(([, y]) => y)
      .filter((y) => y > 4000 && y < 7600)
      .sort((one, two) => one - two)
    const gaps = shown.slice(1).map((y, i) => y - (shown[i] ?? y))
    expect(shown[0]).toBeLessThan(4000 + view.height * 0.5)
    expect(Math.max(...gaps)).toBeLessThan(view.height * 0.5)
  })

  test('brings the ribbon back across a longer gap between two waves', () => {
    const points = pagePath(
      [stop(0, 'bend'), stop(3000, 'waves'), stop(7000, 'waves')],
      'ribbon',
      view.width,
      view.height,
      8000,
    )
    const between = lit(points).filter(([, y]) => y > 3600 && y < 6200)
    expect(between.length).toBeGreaterThan(2)
    /* Ribbon, not wave: wider than a wave everywhere. The ribbon's width
       breathes down to half of its 0.18, so twice a wave's was a floor the
       narrower ribbon no longer clears at the bottom of its breath. */
    for (const [, , width] of between) {
      expect(width).toBeGreaterThan(0.06 * 1.4)
    }
  })

  test('never turns tight where it is lit, from the bend through the waves and back', () => {
    /* Each hand-over used to meet in a corner: the bend's arm and the ribbon
       in a hook, a ribbon heading out to its side and the wave it doubled
       back to reach, and a ribbon coming back across after a wave. A tenth of
       the screen's height is generous; on a page a hand-over now turns
       through more than a quarter of it. */
    const layouts: [number, number, PlacedStop[], number][] = [
      [1440, 900, [stop(57, 'bend', 0.47), stop(5379, 'waves'), stop(8345, 'waves')], 9068],
      [1280, 800, [stop(0, 'bend'), stop(3000, 'waves'), stop(7000, 'waves')], 8000],
      [390, 844, [stop(57, 'bend', 0.47), stop(7207, 'waves'), stop(12200, 'waves')], 13409],
    ]
    for (const [width, height, stops, page] of layouts) {
      const points = pagePath(stops, 'ribbon', width, height, page)
      expect(tightest(points, width, page)).toBeGreaterThan(0.25 * Math.min(width, height))
    }
  })

  test('ends on the last wave rather than bringing the ribbon back', () => {
    const points = pagePath(
      [stop(0, 'bend'), stop(4000, 'waves')],
      'ribbon',
      view.width,
      view.height,
      6400,
    )
    expect(lit(points).filter(([, y]) => y > 4000 + 160)).toEqual([])
  })

  test('fills the gap between a bend and a wave with soft ribbon', () => {
    const points = pagePath(
      [stop(0, 'bend'), stop(4000, 'waves')],
      'ribbon',
      view.width,
      view.height,
      6400,
    )
    const filled = lit(points).filter(([, y]) => y > 1200 && y < 3400)
    expect(filled.length).toBeGreaterThan(2)
    /* Soft is wide: every point of the fill is at least twice a wave's width. */
    for (const [, , width] of filled) {
      expect(width).toBeGreaterThan(0.06 * 2)
    }
  })

  test('without stops, the root pattern runs the length of the page', () => {
    const ribbon = pagePath([], 'ribbon', view.width, view.height, 8000)
    expect(Math.max(...lit(ribbon).map(([, y]) => y))).toBeGreaterThan(7000)
    const waves = pagePath([], 'waves', view.width, view.height, 8000)
    expect(waves.filter(([x]) => x < 0).length).toBeGreaterThan(3)
    const bend = pagePath([], 'bend', view.width, view.height, 8000)
    expect(narrowest(bend)[1]).toBeLessThan(800)
  })

  test('on a phone, a bend keeps to the right edge, clear of the text', () => {
    const points = pagePath([stop(0, 'bend', 0.3)], 'ribbon', 390, 844, 4000)
    expect(narrowest(points)[0]).toBeGreaterThanOrEqual(0.8)
  })

  test('never carries more points than the shader holds', () => {
    const points = pagePath([], 'ribbon', view.width, view.height, 800 * 200)
    expect(points.length).toBeLessThanOrEqual(MAX_POINTS)
  })
})

describe('strands reach', () => {
  test('no lit turn on the screen is tighter than its strands reach to either side', () => {
    /* The strands are the centerline moved sideways by up to the ribbon's
       breadth, so on the inside of a turn tighter than that they fold back
       over themselves. Measured with the same reach the path is laid by, at
       the default spread, on a page whose bend sits far to the right, which
       is what folded the hand-over into the ribbon. */
    const stop = (top: number, pattern: PlacedStop['pattern'], at?: number): PlacedStop => ({
      at,
      height: 900,
      pattern,
      top,
    })
    for (const [width, height] of [
      [1440, 900],
      [2000, 1150],
    ] as const) {
      const points = pagePath(
        [stop(0, 'bend', 0.86), stop(3700, 'waves'), stop(7000, 'waves')],
        'ribbon',
        width,
        height,
        7600,
      )
      const n = points.length
      const at = (k: number, c: number): number => points[Math.max(0, Math.min(n - 1, k))]?.[c] ?? 0
      for (let s = 0.05; s < n - 1.05; s += 0.05) {
        const i = Math.min(Math.floor(s), n - 2)
        const curve = (f: number, c: number): number =>
          catmull(at(i - 1, c), at(i, c), at(i + 1, c), at(i + 2, c), f)
        const point = (f: number): [number, number] => [curve(f, 0) * width, curve(f, 1)]
        const f = s - i
        const [ax, ay] = point(Math.max(0, f - 0.04))
        const [bx, by] = point(f)
        const [cx, cy] = point(Math.min(1, f + 0.04))
        const glow = curve(f, 3)
        const area = Math.abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax)) / 2
        if (glow < 0.1 || bx < 0 || bx > width || area < 1e-6) {
          continue
        }
        const radius =
          (Math.hypot(bx - ax, by - ay) *
            Math.hypot(cx - bx, cy - by) *
            Math.hypot(cx - ax, cy - ay)) /
          (4 * area)
        const reach = Math.max(0, curve(f, 2)) * SPREAD * width * 1.3 + 40
        expect(radius).toBeGreaterThan(reach * 0.85)
      }
    }
  })
})

describe('strands sweep', () => {
  /* The first card below a hero: a sweep lands on its top left corner. */
  const card: PlacedStop = {
    at: 0.9,
    height: 600,
    left: 0.06,
    pattern: 'sweep',
    right: 0.94,
    top: 1000,
  }
  const points = pagePath([card], 'ribbon', 1440, 900, 6000)
  const shown = points.filter(([, y, , brightness]) => brightness > 0 && y > 0)

  test('comes in at the top right corner and crosses in one diagonal', () => {
    /* At the top of the page it is near the right edge, and from there it
       only heads left until it lands, so it never doubles back. */
    const top = shown.find(([, y]) => y >= 0)
    expect(top?.[0]).toBeGreaterThan(0.8)
    const crossing = shown.filter(([, y]) => y <= card.top)
    crossing.forEach(([x], i) => {
      expect(x).toBeLessThanOrEqual((crossing[i - 1]?.[0] ?? 1) + 1e-6)
    })
  })

  test('is at its full width through the middle of the diagonal', () => {
    const middle = shown.find(([, y]) => y > card.top * 0.4)
    expect(middle?.[2]).toBeCloseTo(0.16, 2)
  })

  test("lands on the target's top left corner, heading down", () => {
    const landing = shown.find(([x, y]) => Math.abs(y - card.top) < 2 && x < 0.1)
    expect(landing?.[0]).toBeCloseTo(0.06, 2)
  })
})

describe('strands arc length', () => {
  const grows = (lengths: Float32Array): boolean =>
    lengths.every((one, i) => i === 0 || one > (lengths[i - 1] ?? 0))

  test("only grows along a bend's upper arm, which heads left faster than down", () => {
    /* The sum of y and x the shader used ran backward there, and the strands'
       twist turned a corner. */
    expect(grows(arcLengths(boxPath('bend', 0.5, 600, 1440), 1440))).toBe(true)
  })

  test('only grows across a wave that sweeps left', () => {
    const stop = (top: number, pattern: PlacedStop['pattern']): PlacedStop => ({
      at: undefined,
      height: 700,
      pattern,
      top,
    })
    const points = pagePath([stop(0, 'bend'), stop(3000, 'waves')], 'ribbon', 1280, 800, 6000)
    expect(grows(arcLengths(points, 1280))).toBe(true)
  })

  test('measures the drawn spline in pixels', () => {
    /* A straight run down the page is as long as it is tall. */
    const straight: PathPoint[] = [
      [0.5, 0, 0.2, 1],
      [0.5, 100, 0.2, 1],
      [0.5, 200, 0.2, 1],
    ]
    expect(arcLengths(straight, 1000).at(-1)).toBeCloseTo(200, 3)
  })
})

describe('strands visible range', () => {
  const points = pagePath([], 'ribbon', 1280, 800, 6400)
  const table = lookup(points)

  test('passes through each point, as the shader does', () => {
    expect(catmull(1, 2, 3, 4, 0)).toBe(2)
    expect(catmull(1, 2, 3, 4, 1)).toBe(3)
  })

  test('covers the window and not the whole page', () => {
    const [low, high] = visibleRange(table, 2000, 3200)
    expect(low).toBeGreaterThan(0)
    expect(high).toBeLessThan(1)
    expect(high).toBeGreaterThan(low)
  })

  test('moves down the path as the window does', () => {
    const [early] = visibleRange(table, 1000, 2200)
    const [late] = visibleRange(table, 4000, 5200)
    expect(late).toBeGreaterThan(early)
  })

  test('is empty for a window the path never reaches', () => {
    expect(visibleRange(table, 100_000, 101_200)).toEqual([0, 0])
  })
})
