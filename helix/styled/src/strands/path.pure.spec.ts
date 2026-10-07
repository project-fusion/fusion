import { describe, expect, test } from 'bun:test'
import {
  boxPath,
  catmull,
  lookup,
  MAX_POINTS,
  type PathPoint,
  type PlacedStop,
  pagePath,
  visibleRange,
} from './path.js'

/** The point a form is narrowest at, which for a fan is its bend. */
const narrowest = (points: readonly PathPoint[]): PathPoint =>
  points.reduce((one, two) => (two[2] < one[2] ? two : one))

/** The points a reader can see: lit, and inside the width. */
const lit = (points: readonly PathPoint[]): PathPoint[] =>
  points.filter(([x, , , brightness]) => brightness > 0 && x > 0 && x < 1)

describe('strands box path', () => {
  test('a fan bends at its narrowest and brightest point, where `at` puts it, 58% down', () => {
    const points = boxPath('fan', 0.3, 400)
    const bend = narrowest(points)
    expect(bend[0]).toBe(0.3)
    expect(bend[1]).toBeCloseTo(232)
    expect(bend[3]).toBe(Math.max(...points.map((one) => one[3])))
  })

  test("a fan's arms leave the box above and below the bend, opening to the right", () => {
    const points = boxPath('fan', undefined, 400)
    const first = points[0] as PathPoint
    const last = points.at(-1) as PathPoint
    const bend = narrowest(points)
    expect(first[1]).toBeLessThan(0)
    expect(last[1]).toBeGreaterThan(400)
    expect(first[0]).toBeGreaterThan(bend[0])
    expect(last[0]).toBeGreaterThan(bend[0])
  })

  test('a fan in a narrow box stays where `at` puts it', () => {
    /* The narrow rule is for the viewport in `travel`. A box is the frame the
       consumer chose, so a box only a few hundred pixels wide must not push the
       bend to the edge, which is what an early version did. */
    expect(narrowest(boxPath('fan', 0.2, 300))[0]).toBe(0.2)
  })

  test('a wave enters off one edge and leaves off the other, through the middle', () => {
    const points = boxPath('waves', undefined, 400)
    const xs = points.map(([x]) => x)
    expect(Math.min(...xs)).toBeLessThan(0)
    expect(Math.max(...xs)).toBeGreaterThan(1)
    for (const [, y, , brightness] of points) {
      if (brightness > 0) {
        expect(Math.abs(y - 200)).toBeLessThanOrEqual(18)
      }
    }
  })

  test('a ribbon runs the full height of the box around `at`, with nothing unlit inside it', () => {
    const points = boxPath('ribbon', 0.6, 400)
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
  const stop = (top: number, variant: PlacedStop['variant'], at?: number): PlacedStop => ({
    at,
    height: 700,
    top,
    variant,
  })

  test('places the stops in page order, whatever order they were written in', () => {
    const written = [stop(4000, 'waves'), stop(0, 'fan'), stop(5200, 'waves')]
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
      [stop(0, 'fan'), stop(4000, 'waves'), stop(5200, 'waves')],
      'ribbon',
      view.width,
      view.height,
      6400,
    )
    /* The first wave sweeps down a fifth of a screen as it crosses. */
    const between = lit(points).filter(([, y]) => y > 4000 + 160 && y < 5200 - 60)
    expect(between).toEqual([])
  })

  test('brings the ribbon back across a longer gap between two waves', () => {
    const points = pagePath(
      [stop(0, 'fan'), stop(3000, 'waves'), stop(7000, 'waves')],
      'ribbon',
      view.width,
      view.height,
      8000,
    )
    const between = lit(points).filter(([, y]) => y > 3600 && y < 6200)
    expect(between.length).toBeGreaterThan(2)
    for (const [, , width] of between) {
      expect(width).toBeGreaterThan(0.06 * 2)
    }
  })

  test("hands a fan's lower arm to the ribbon without turning back", () => {
    /* The arm used to run out to the side, and the ribbon started back toward
       the middle, so the two met in a hook at the edge of the hero. */
    const points = pagePath([stop(0, 'fan')], 'ribbon', view.width, view.height, 6400)
    const bend = points.indexOf(narrowest(points))
    const exit = points[bend + 2] as PathPoint
    const next = points[bend + 3] as PathPoint
    expect(next[1]).toBeGreaterThan(exit[1])
    expect(Math.abs(next[0] - exit[0])).toBeLessThan(0.1)
    /* And at the ribbon's width or near it, which used to triple at once. */
    expect(next[2] / exit[2]).toBeLessThan(1.7)
  })

  test('leans a ribbon into a wave from the side the ribbon is on', () => {
    const points = pagePath(
      [stop(0, 'fan'), stop(4000, 'waves')],
      'ribbon',
      view.width,
      view.height,
      6400,
    )
    const lead = points.findIndex(([, y, width]) => width < 0.2 && y > 3000)
    const ribbon = points[lead - 1] as PathPoint
    const into = points[lead] as PathPoint
    expect(into[0] > 0.5).toBe(ribbon[0] > 0.5)
    /* The turn is spread over most of a screen, not taken in a corner. */
    expect(into[1] - ribbon[1]).toBeGreaterThan(view.height * 0.5)
  })

  test('ends on the last wave rather than bringing the ribbon back', () => {
    const points = pagePath(
      [stop(0, 'fan'), stop(4000, 'waves')],
      'ribbon',
      view.width,
      view.height,
      6400,
    )
    expect(lit(points).filter(([, y]) => y > 4000 + 160)).toEqual([])
  })

  test('fills the gap between a fan and a wave with soft ribbon', () => {
    const points = pagePath(
      [stop(0, 'fan'), stop(4000, 'waves')],
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

  test('without stops, the root variant runs the length of the page', () => {
    const ribbon = pagePath([], 'ribbon', view.width, view.height, 8000)
    expect(Math.max(...lit(ribbon).map(([, y]) => y))).toBeGreaterThan(7000)
    const waves = pagePath([], 'waves', view.width, view.height, 8000)
    expect(waves.filter(([x]) => x < 0).length).toBeGreaterThan(3)
    const fan = pagePath([], 'fan', view.width, view.height, 8000)
    expect(narrowest(fan)[1]).toBeLessThan(800)
  })

  test('on a phone, a fan keeps to the right edge, clear of the text', () => {
    const points = pagePath([stop(0, 'fan', 0.3)], 'ribbon', 390, 844, 4000)
    expect(narrowest(points)[0]).toBeGreaterThanOrEqual(0.8)
  })

  test('never carries more points than the shader holds', () => {
    const points = pagePath([], 'ribbon', view.width, view.height, 800 * 200)
    expect(points.length).toBeLessThanOrEqual(MAX_POINTS)
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
