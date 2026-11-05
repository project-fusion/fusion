import { describe, expect, test } from 'bun:test'
import { hullOf, type PagePoint, projectionOf } from '../projection/projection.js'
import { type BoxAxisText, type BoxLabel, boxLabels } from './box-labels.js'

const SIZES = { gap: 0.06, name: 0.15, tick: 0.13, wide: 0.58 }

const axis = (name: string): BoxAxisText => ({
  name,
  ticks: [-1, -0.5, 0, 0.5, 1].map((at, index) => ({ at, text: String(index * 25) })),
})

const AXES = { x: axis('Age'), y: axis('Yearly spend'), z: axis('Visits a month') }

/** The labels for the box seen from `turn` and `tilt`, as the SVG drawing sees it, and the box's outline on the page. */
const seenFrom = (
  turn: number,
  tilt: number,
  axes = AXES,
): { hull: PagePoint[]; labels: BoxLabel[] } => {
  const projection = projectionOf({ tilt, turn })
  const seen = ([x, y, z]: readonly [number, number, number]) => ({
    ...projection.at(x, -z, y),
    depth: projection.depth(x, -z),
  })
  const corners: PagePoint[] = []
  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      for (const z of [-1, 1]) {
        corners.push(seen([x, y, z]))
      }
    }
  }
  return { hull: hullOf(corners), labels: boxLabels(seen, axes, SIZES) }
}

/** Whether a point is inside a convex outline, by more than `margin`. */
const inside = (hull: readonly PagePoint[], point: PagePoint, margin = 1e-3): boolean =>
  hull.every((from, index) => {
    const to = hull[(index + 1) % hull.length] as PagePoint
    const cross = (to.x - from.x) * (point.y - from.y) - (to.y - from.y) * (point.x - from.x)
    return cross > margin
  }) ||
  hull.every((from, index) => {
    const to = hull[(index + 1) % hull.length] as PagePoint
    const cross = (to.x - from.x) * (point.y - from.y) - (to.y - from.y) * (point.x - from.x)
    return cross < -margin
  })

const VIEWS = [15, 35, 60].flatMap((tilt) =>
  Array.from({ length: 24 }, (_, step) => ({ tilt, turn: step * 15 })),
)

describe('the box labels', () => {
  test('from every side, no label stands inside the box', () => {
    for (const { tilt, turn } of VIEWS) {
      const { hull, labels } = seenFrom(turn, tilt)
      for (const label of labels) {
        expect({ label: label.text, tilt, turn, within: inside(hull, label) }).toEqual({
          label: label.text,
          tilt,
          turn,
          within: false,
        })
      }
    }
  })

  test('from every side, no two numbers stand on one another', () => {
    for (const { tilt, turn } of VIEWS) {
      const ticks = seenFrom(turn, tilt).labels.filter((label) => !label.name)
      for (const [index, one] of ticks.entries()) {
        for (const other of ticks.slice(index + 1)) {
          const apart =
            Math.abs(one.x - other.x) >=
              (one.text.length + other.text.length) * 0.13 * 0.58 * 0.5 ||
            Math.abs(one.y - other.y) >= 0.13 * 0.8
          expect({ apart, tilt, turn }).toEqual({ apart: true, tilt, turn })
        }
      }
    }
  })

  test('a turn moves the numbers to the edges that face the reader', () => {
    /* Across is written along the floor's edge in depth nearer the reader:
       the front from the starting view, and the back half a turn round. */
    const nearest = (turn: number): number => {
      const projection = projectionOf({ tilt: 25, turn })
      const name = seenFrom(turn, 25).labels.find((label) => label.text === 'Age') as BoxLabel
      const [front, back] = [projection.at(0, -1, -1), projection.at(0, 1, -1)]
      return Math.hypot(name.x - front.x, name.y - front.y) <
        Math.hypot(name.x - back.x, name.y - back.y)
        ? 1
        : -1
    }
    expect(nearest(42)).toBe(1)
    expect(nearest(222)).toBe(-1)
  })

  test('every name is kept, and the up axis is left out where its edge is seen end on', () => {
    const names = (turn: number, tilt: number): string[] =>
      seenFrom(turn, tilt)
        .labels.filter((label) => label.name)
        .map((label) => label.text)
        .sort()
    expect(names(42, 25)).toEqual(['Age', 'Visits a month', 'Yearly spend'])
    expect(names(42, 90)).toEqual(['Age', 'Visits a month'])
  })

  test("the up axis' name stands over its top number, which keeps its place", () => {
    const axes = {
      ...AXES,
      y: { ...AXES.y, ticks: AXES.y.ticks.map((tick, index) => ({ ...tick, text: `${index}k` })) },
    }
    for (const { tilt, turn } of VIEWS.filter((view) => view.tilt < 60)) {
      const texts = seenFrom(turn, tilt, axes).labels.map((label) => label.text)
      if (texts.includes('Yearly spend')) {
        expect(texts).toContain('4k')
      }
    }
  })

  test('a category is left out only where its ink meets another label', () => {
    const place = (category: boolean): string[] => {
      const row = (at: number, text: string) => ({ at, category, text })
      const y = { name: '', ticks: [row(-1, 'North'), row(0, 'South')] }
      const seen = ([, up]: readonly number[]) => ({ depth: 0, x: 0, y: -(up ?? 0) * 0.112 })
      return boxLabels(seen, { x: { name: '', ticks: [] }, y, z: { name: '', ticks: [] } }, SIZES)
        .map((label) => label.text)
        .sort()
    }
    expect(place(true)).toEqual(['North', 'South'])
    expect(place(false)).toEqual(['North'])
  })

  test('names a step apart down a slanted edge are moved clear and every one is kept', () => {
    /* Four series 11.5 pixels apart at 12, as a ribbon chart's were at 342 wide:
       0.0125 of a box a pixel, so a step of 0.144 for names 0.15 tall. */
    const row = (at: number, text: string) => ({ at, category: true, text })
    const z = {
      name: '',
      ticks: [
        row(-1, 'Frankfurt (ms)'),
        row(-1 / 3, 'Virginia (ms)'),
        row(1 / 3, 'Singapore (ms)'),
        row(1, 'São Paulo (ms)'),
      ],
    }
    const seen = ([, , depth]: readonly number[]) => ({
      depth: 0,
      x: (depth ?? 0) * 0.3,
      y: -(depth ?? 0) * 0.216,
    })
    const labels = boxLabels(
      seen,
      { x: { name: '', ticks: [] }, y: { name: '', ticks: [] }, z },
      { ...SIZES, tick: 0.15 },
    )
    expect(labels.map((label) => label.text).sort()).toEqual([
      'Frankfurt (ms)',
      'Singapore (ms)',
      'São Paulo (ms)',
      'Virginia (ms)',
    ])
    /* Each name's descenders, 0.44 of its height under a `g` or a `p` and
       0.38 under a parenthesis, clear the next one's capitals, 0.48, by an
       eighth of a line. */
    const down = (text: string): number => (/[gjpqy]/.test(text) ? 0.44 : 0.38)
    const sorted = [...labels].sort((one, other) => one.y - other.y)
    for (const [index, below] of sorted.slice(1).entries()) {
      const above = sorted[index] as BoxLabel
      expect(below.y - above.y).toBeGreaterThanOrEqual(
        0.15 * (down(above.text) + 0.48 + 0.125) - 1e-4,
      )
    }
  })

  test('a wide name off a slanted edge stands clear of the edge at its nearest corner', () => {
    const row = (at: number, text: string) => ({ at, category: true, text })
    const z = { name: '', ticks: [row(0, 'Singapore (ms)')] }
    /* An edge rising to the right at about 25 degrees, with the box above it. */
    const seen = ([across, up, depth]: readonly number[]) => ({
      depth: 0,
      x: (depth ?? 0) * 0.9 + (across ?? 0) * 0.1,
      y: -(depth ?? 0) * 0.42 - (up ?? 0) * 0.5 - (across ?? 0) * 0.1,
    })
    const [label] = boxLabels(
      seen,
      { x: { name: '', ticks: [] }, y: { name: '', ticks: [] }, z },
      SIZES,
    )
    const at = seen([1, -1, 0])
    const along = { x: 0.9, y: -0.42 }
    const length = Math.hypot(along.x, along.y)
    const out = { x: 0.42 / length, y: 0.9 / length }
    const half = { height: SIZES.tick / 2, width: (14 * SIZES.tick * SIZES.wide) / 2 }
    const near = Math.min(
      ...[-1, 1].flatMap((sx) =>
        [-1, 1].map(
          (sy) =>
            ((label?.x ?? 0) + sx * half.width - at.x) * out.x +
            ((label?.y ?? 0) + sy * half.height - at.y) * out.y,
        ),
      ),
    )
    expect(near).toBeGreaterThanOrEqual(SIZES.gap - 1e-9)
  })
})
