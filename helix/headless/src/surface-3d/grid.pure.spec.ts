import { describe, expect, test } from 'bun:test'
import type { FieldRow } from '../scatter-3d/field.js'
import { levelOf, surfaceOf } from './grid.js'

const row = (label: string, hour: number, day: number, load?: number): FieldRow => ({
  cells: [
    { name: 'Hour', text: String(hour), value: hour },
    { name: 'Day', text: String(day), value: day },
    {
      name: 'Load',
      text: load === undefined ? '' : String(load),
      ...(load === undefined ? {} : { value: load }),
    },
  ],
  label,
})

const rows = [
  row('a', 0, 1, 10),
  row('b', 1, 1, 30),
  row('c', 0, 2, 20),
  row('d', 1, 2),
  row('e', 2, 1, 50),
]

describe('the grid', () => {
  test('reads across, depth, and height from the first three numeric columns', () => {
    const field = surfaceOf(rows, [0, 1, 2])
    expect([field.axes.x.name, field.axes.z.name, field.axes.y.name]).toEqual([
      'Hour',
      'Day',
      'Load',
    ])
    expect(field.acrosses).toEqual([0, 1, 2])
    expect(field.depths).toEqual([1, 2])
  })

  test('puts each reading in its cell, across first, and leaves a place with none open', () => {
    const field = surfaceOf(rows, [0, 1, 2])
    expect(field.cells.map((cell) => cell.value)).toEqual([10, 20, 30, undefined, 50, undefined])
    expect(field.cells[2]?.label).toBe('b')
    expect(field.readings).toBe(4)
  })

  test('a later row for a place already read replaces it', () => {
    const field = surfaceOf([...rows, row('again', 0, 1, 99)], [0, 1, 2])
    expect(field.cells[0]?.value).toBe(99)
  })

  test('runs across and in depth from the first place to the last', () => {
    const { x, z } = surfaceOf(rows, [0, 1, 2]).axes
    expect(x.range).toEqual([0, 2])
    expect(z.range).toEqual([1, 2])
  })

  test('widens the height range to round numbers', () => {
    const { y } = surfaceOf(rows, [0, 1, 2]).axes
    expect(y.range[0]).toBeLessThanOrEqual(10)
    expect(y.range[1]).toBeGreaterThanOrEqual(50)
  })
})

describe('a level', () => {
  test('is a reading’s place between the lowest and the highest, and none for an open cell', () => {
    const field = surfaceOf(rows, [0, 1, 2])
    expect(levelOf(field, field.cells[0] as never)).toBe(0)
    expect(levelOf(field, field.cells[4] as never)).toBe(1)
    expect(levelOf(field, field.cells[3] as never)).toBeUndefined()
  })
})
