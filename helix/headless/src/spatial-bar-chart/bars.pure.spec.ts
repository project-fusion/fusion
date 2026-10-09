import { describe, expect, test } from 'bun:test'
import { barsOf } from './bars.js'

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
