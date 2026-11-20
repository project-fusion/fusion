import { describe, expect, test } from 'bun:test'
import { projectionOf } from '../projection/projection.js'
import { ribbonsBetween, ribbonsDrawn, ribbonsOf } from './ribbons.js'

const row = (label: string, ...values: Array<number | undefined>) => ({
  cells: values.map((value, at) => ({
    name: `S${at + 1}`,
    text: value === undefined ? '' : String(value),
    value,
  })),
  label,
})

const field = ribbonsOf([row('Mon', 4, 6), row('Tue', 8, 2), row('Wed', 5, undefined)], [0, 1])

describe('the ribbons', () => {
  test('each row is a place across and each column a series, every series named in depth', () => {
    expect(field.categories).toEqual(['Mon', 'Tue', 'Wed'])
    expect(field.axes.z.labels).toEqual(['S1', 'S2'])
    expect(field.axes.x.range).toEqual([0, 2])
  })

  test('the box is long across and shallow in depth', () => {
    const [across, , depth] = field.axes.extent
    expect(across).toBe(1)
    expect(depth).toBeLessThan(1)
  })

  test('each ribbon has a top piece between each pair of readings, an end, and a side, and stands where its readings are', () => {
    const drawn = ribbonsDrawn(field, projectionOf({ tilt: 25, turn: 42 }))
    const [first, second] = drawn
    /* Three readings make two pieces of top, one end, and one side. */
    expect(first?.faces).toHaveLength(4)
    expect(first?.readings.map((reading) => reading.index)).toEqual([0, 2, 4])
    /* A reading the table lacks leaves the ribbon shorter. */
    expect(second?.readings.map((reading) => reading.index)).toEqual([1, 3])
    for (const face of first?.faces ?? []) {
      expect(face.d).toMatch(/^M/)
    }
  })
})

describe('moving between two tables', () => {
  const at = (share: number, floor = false) => ({
    axes: share,
    floor: () => floor,
    share: () => share,
  })

  test('a reading both tables hold moves, and its ribbon passes through it where it slides', () => {
    const from = ribbonsOf([row('Mon', 4, 6), row('Tue', 8, 2)], [0, 1])
    const to = ribbonsOf([row('Sun', 2, 2), row('Mon', 6, 6), row('Tue', 8, 2)], [0, 1])
    const half = ribbonsBetween(from, to, at(0.5))
    const monday = half.cells[2]
    expect(monday?.value).toBe(5)
    expect(monday?.across).toBe(0.5)
    const drawn = ribbonsDrawn(half, projectionOf({ tilt: 25, turn: 42 }))
    expect(drawn[0]?.readings.map((one) => one.index)).toEqual([0, 2, 4])
  })

  test('a reading the new table drops sinks in its own series, and a dropped series goes at once', () => {
    const from = ribbonsOf([row('Mon', 4, 6), row('Tue', 8, 2)], [0, 1])
    const to = ribbonsOf([row('Mon', 4)], [0])
    const half = ribbonsBetween(from, to, at(0.5))
    /* Tuesday's first series sinks; the second series is gone. */
    expect(half.cells).toHaveLength(2)
    expect(half.cells[1]?.label).toBe('Tue')
    expect(half.cells[1]?.depth).toBe(0)
    expect(half.cells[1]?.value).toBe(4)
  })
})
