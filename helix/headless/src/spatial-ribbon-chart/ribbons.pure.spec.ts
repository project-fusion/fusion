import { describe, expect, test } from 'bun:test'
import { projectionOf } from '@fusion.dev/helix-core'
import { ribbonsDrawn, ribbonsOf } from './ribbons.js'

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
