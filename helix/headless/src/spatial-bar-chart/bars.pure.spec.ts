import { describe, expect, test } from 'bun:test'
import { boxView, SPATIAL_VIEW } from '../spatial-scatter-chart/view.js'
import { barsDrawn, barsOf, floorOf, grownAt, growTime, namesOf, paintOrder } from './bars.js'

const row = (label: string, ...values: Array<number | undefined>) => ({
  cells: values.map((value, at) => ({
    name: `Q${at + 1}`,
    text: value === undefined ? '' : String(value),
    value,
  })),
  label,
})

describe('the bars', () => {
  test('each row is a category and each column a series, across first', () => {
    const field = barsOf([row('North', 4, 6), row('South', 2, undefined)], [0, 1])
    expect(field.categories).toEqual(['North', 'South'])
    expect(field.series).toEqual(['Q1', 'Q2'])
    expect(field.cells.map((cell) => [cell.across, cell.depth, cell.value])).toEqual([
      [0, 0, 4],
      [0, 1, 6],
      [1, 0, 2],
      [1, 1, undefined],
    ])
    expect(field.readings).toBe(3)
  })

  test('the value axis runs from zero, so a bar twice as tall is twice as much', () => {
    expect(barsOf([row('A', 30), row('B', 70)], [0]).axes.y.range[0]).toBe(0)
    /* A value below zero widens it below zero. */
    expect(barsOf([row('A', -20), row('B', 70)], [0]).axes.y.range[0]).toBeLessThan(0)
  })

  test('the names stand at whole places, the grid between them, and the first series in front', () => {
    const { axes } = barsOf([row('North', 4, 6, 8)], [0, 1, 2])
    expect(axes.x.labels).toEqual(['North'])
    expect(axes.x.rules).toEqual([-0.5, 0.5])
    expect(axes.z.labels).toEqual(['Q1', 'Q2', 'Q3'])
    expect(axes.z.range).toEqual([2.5, -0.5])
  })

  test('one series is a single long, low row, and the series names the value axis', () => {
    const field = barsOf([row('Mon', 3), row('Tue', 5), row('Wed', 4), row('Thu', 6)], [0])
    expect(field.axes.y.name).toBe('Q1')
    expect(field.axes.z.labels).toEqual([])
    const [across, , depth] = field.axes.extent
    expect(across).toBe(1)
    expect(depth).toBeCloseTo(0.25)
  })
})

/* Tokens per call read as three series one behind another in depth: the
   cached input, the tallest, hid the other two on every call. Stacked, each
   call is one column of its parts. */
describe('stacked bars', () => {
  test('each block starts on the ones before it, in one row, and colors by its series', () => {
    const field = barsOf([row('1', 4, 6, 2), row('2', 3, undefined, 5)], [0, 1, 2], true)
    expect(field.lanes).toBe(1)
    expect(field.cells.map((cell) => [cell.lane, cell.depth, cell.from, cell.value])).toEqual([
      [0, 0, 0, 4],
      [0, 1, 4, 6],
      [0, 2, 10, 2],
      [0, 0, 0, 3],
      [0, 1, 3, undefined],
      [0, 2, 3, 5],
    ])
    expect(field.axes.z.labels).toEqual([])
  })

  test('the value axis fits the tallest stack, and a negative hangs on the negatives before it', () => {
    const tall = barsOf([row('1', 40, 50), row('2', 10, 5)], [0, 1], true)
    expect(tall.axes.y.range[1]).toBeGreaterThanOrEqual(90)
    const mixed = barsOf([row('1', 10, -4, -6)], [0, 1, 2], true)
    expect(mixed.cells.map((cell) => cell.from)).toEqual([0, 0, -4])
    expect(mixed.axes.y.range[0]).toBeLessThanOrEqual(-10)
  })

  test('a column is painted from the floor up, so a block below never shows through one above', () => {
    const field = barsOf([row('1', 4, 6, 2)], [0, 1, 2], true)
    const { projection } = boxView(field.axes, SPATIAL_VIEW)
    const order = paintOrder(projection, barsDrawn(field, projection))
    expect(order.map((bar) => field.cells[bar.index]?.depth)).toEqual([0, 1, 2])
  })
})

test('a zero in a stack draws no block, and a zero standing alone is still a plate', () => {
  const stacked = barsOf([row('1', 0, 9, 4)], [0, 1, 2], true)
  const { projection } = boxView(stacked.axes, SPATIAL_VIEW)
  expect(barsDrawn(stacked, projection).map((bar) => stacked.cells[bar.index]?.depth)).toEqual([
    1, 2,
  ])
  const alone = barsOf([row('1', 0, 9, 4)], [0, 1, 2])
  expect(barsDrawn(alone, boxView(alone.axes, SPATIAL_VIEW).projection)).toHaveLength(3)
})

/* A pane's row of calls read as a line receding at an angle. In a row the
   bars stand along the line the camera reads as level, so the row is level
   on the page from any turn, and each block shows the turn. */
test('a row stands level on the page whichever way the camera turns', () => {
  const field = barsOf([row('1', 4), row('2', 6), row('3', 2), row('4', 5)], [0], true)
  for (const turn of [0, 25, 42, 90, 140]) {
    const { projection } = boxView(field.axes, { tilt: 25, turn }, [], true)
    const feet = barsDrawn(field, projection, true).map((bar) => projection.at(bar.x, bar.y, 0).y)
    for (const foot of feet) {
      expect(foot).toBeCloseTo(feet[0] ?? 0, 6)
    }
  }
})

/* A week of runs with today lit, read as Switchyard draws it: neutral bars,
   one in the brand color, its value over it, the days under the row. */
describe('a lit bar, and a row with its floor', () => {
  const week = barsOf(
    [row('Mon', 59), row('Tue', 64), row('Wed', 61), row('Thu', 63)],
    [0],
    false,
    (at) => (at === 1 ? 'primary' : undefined),
  )

  test('a cell names its own tone, and the others name none', () => {
    expect(week.cells.map((cell) => cell.tone)).toEqual([
      undefined,
      'primary',
      undefined,
      undefined,
    ])
  })

  test('the floor has a plate for each place, wider than its bar, level across the row', () => {
    const { projection } = boxView(week.axes, SPATIAL_VIEW, [], true)
    const plates = floorOf(week, projection)
    expect(plates.map((plate) => plate.across)).toEqual([0, 1, 2, 3])
    const bars = barsDrawn(week, projection, true)
    const wide = (points: { x: number }[]) =>
      Math.max(...points.map((point) => point.x)) - Math.min(...points.map((point) => point.x))
    expect(wide(plates[0]?.corners ?? [])).toBeGreaterThan(
      wide((bars[0]?.corners ?? []).filter((_, at) => at % 2 === 0)),
    )
    for (const plate of plates) {
      expect(plate.front.y).toBeCloseTo(plates[0]?.front.y ?? 0, 6)
    }
  })

  test('each name stands under its plate, and the toned one carries its tone', () => {
    const { projection } = boxView(week.axes, SPATIAL_VIEW, [], true)
    const plates = floorOf(week, projection)
    const names = namesOf(week, plates, 0.05)
    expect(names.map((name) => name.text)).toEqual(['Mon', 'Tue', 'Wed', 'Thu'])
    expect(names[1]?.tone).toBe('primary')
    expect(names[0]?.y).toBeGreaterThan(plates[0]?.front.y ?? 0)
  })

  test('names that would touch are left out, the toned one kept first', () => {
    const { projection } = boxView(week.axes, SPATIAL_VIEW, [], true)
    const names = namesOf(week, floorOf(week, projection), 0.4)
    expect(names.length).toBeLessThan(4)
    expect(names.map((name) => name.text)).toContain('Tue')
    for (const [at, name] of names.entries()) {
      const next = names[at + 1]
      if (next) {
        expect(next.x - name.x).toBeGreaterThan(name.text.length * 0.4 * 0.58)
      }
    }
  })
})

describe('growing in', () => {
  test('each category starts a little after the one before, and every bar ends at its height', () => {
    expect(grownAt(0, 7, 0)).toBe(0)
    expect(grownAt(0, 7, 500)).toBeGreaterThan(grownAt(3, 7, 500))
    expect(grownAt(6, 7, growTime(7))).toBe(1)
    /* Fast at first, slow to rest, and never past the value. */
    let last = 0
    for (let at = 0; at <= growTime(7); at += 50) {
      const now = grownAt(2, 7, at)
      expect(now).toBeGreaterThanOrEqual(last)
      expect(now).toBeLessThanOrEqual(1)
      last = now
    }
  })

  test('many categories share the same spread, so a long row takes no longer than a short one', () => {
    expect(growTime(60)).toBe(growTime(7))
    expect(growTime(1)).toBeLessThan(growTime(7))
  })

  test('a growing bar stands from the floor at its share of its height', () => {
    const field = barsOf([row('1', 4, 6)], [0, 1], true)
    const { projection } = boxView(field.axes, SPATIAL_VIEW, [], true)
    const full = barsDrawn(field, projection, true)
    const half = barsDrawn(field, projection, true, () => 0.5)
    expect(half[1]?.height).toBeCloseTo((full[1]?.height ?? 0) / 2, 6)
    expect(half[1]?.base).toBeCloseTo(((full[1]?.base ?? 0) + (full[0]?.base ?? 0)) / 2, 6)
  })
})
