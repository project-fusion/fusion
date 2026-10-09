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
const seenFrom = (turn: number, tilt: number): { hull: PagePoint[]; labels: BoxLabel[] } => {
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
  return { hull: hullOf(corners), labels: boxLabels(seen, AXES, SIZES) }
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
})
