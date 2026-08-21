import { describe, expect, test } from 'bun:test'
import { linePath, type Point } from './line-path.js'

const points: Point[] = [
  [0, 20],
  [25, 4],
  [50, 24],
  [75, 12],
  [100, 16],
]

/** Every number in a path, in order, whatever the commands between them. */
const numbers = (path: string): number[] => (path.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number)

/** A cubic Bezier at t, for asking where a smoothed curve actually goes. */
const cubic = (a: number, b: number, c: number, d: number, t: number): number => {
  const u = 1 - t
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d
}

describe('a straight line', () => {
  test('joins the readings and claims nothing between them', () => {
    expect(linePath(points)).toBe('M0,20L25,4L50,24L75,12L100,16')
  })

  test('fewer than two points is nothing, rather than a path that draws nothing', () => {
    // `M0,0` alone is a path element that looks like it should be drawing.
    expect(linePath([[0, 0]])).toBe('')
    expect(linePath([])).toBe('')
  })
})

describe('a stepped line', () => {
  test('holds each reading and changes at the midpoint between them', () => {
    /* Neither neighbour has a better claim on the moment it moved, because a
       chart's x axis is an order rather than a clock. */
    expect(
      linePath(
        [
          [0, 10],
          [20, 30],
          [40, 20],
        ],
        'step',
      ),
    ).toBe('M0,10H10V30H20H30V20H40')
  })
})

describe('a smoothed line', () => {
  test('passes through every reading it was given', () => {
    // A curve that missed the data would be drawing a different series.
    const drawn = numbers(linePath(points, 'smooth'))
    for (const [x, y] of points.slice(1)) {
      const at = drawn.indexOf(x)
      expect(at).toBeGreaterThan(-1)
      expect(drawn[at + 1]).toBe(y)
    }
  })

  test('never leaves the band its own readings set, which is why it is monotone cubic', () => {
    /* A Catmull-Rom spline is shorter to write and free to bulge past the
       points between two of them: a series whose lowest reading is 4 draws a
       curve that dips below it, and every value on a curve is a claim about a
       measurement. Sampled rather than reasoned about, at eleven points across
       every segment. */
    const path = linePath(points, 'smooth')
    const drawn = numbers(path)
    const low = Math.min(...points.map(([, y]) => y))
    const high = Math.max(...points.map(([, y]) => y))
    // M x,y then four (Cx1,y1 x2,y2 x,y) runs of six numbers each.
    for (let segment = 0; segment < points.length - 1; segment += 1) {
      const base = 2 + segment * 6
      const from = segment === 0 ? (drawn[1] as number) : (drawn[base - 1] as number)
      const [c1, c2, end] = [drawn[base + 1], drawn[base + 3], drawn[base + 5]] as number[]
      for (let step = 0; step <= 10; step += 1) {
        const at = cubic(from, c1 as number, c2 as number, end as number, step / 10)
        expect(at).toBeGreaterThanOrEqual(low - 0.01)
        expect(at).toBeLessThanOrEqual(high + 0.01)
      }
    }
  })

  test('arrives level at a turning point rather than carrying on past it', () => {
    // The rule that does most of the work above: a flat tangent at a peak.
    const peak = linePath(
      [
        [0, 10],
        [50, 0],
        [100, 10],
      ],
      'smooth',
    )
    // Both control points either side of the peak sit at the peak's own height.
    expect(peak).toBe('M0,10C16.67,6.67 33.33,0 50,0C66.67,0 83.33,6.67 100,10')
  })
})
