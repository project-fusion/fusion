import { describe, expect, test } from 'bun:test'
import { along, type FieldRow, fieldOf, niceRange, pointItems, pointsBetween } from './field.js'

const row = (label: string, cells: Array<[string, string, number?]>): FieldRow => ({
  cells: cells.map(([name, text, value]) => ({
    name,
    text,
    ...(value === undefined ? {} : { value }),
  })),
  label,
})

/* Cells after the row's header: a group's text, then three measures. */
const rows = [
  row('Ada', [
    ['Team', 'Core'],
    ['Age', '36', 36],
    ['Tenure', '4', 4],
    ['Score', '81', 81],
  ]),
  row('Grace', [
    ['Team', 'Tools'],
    ['Age', '52', 52],
    ['Tenure', '11', 11],
    ['Score', '93', 93],
  ]),
  row('Lin', [
    ['Team', 'Core'],
    ['Age', '29', 29],
    ['Tenure', ''],
    ['Score', '70', 70],
  ]),
]

describe('the field', () => {
  test('reads the first three numeric columns as across, up, and depth', () => {
    const field = fieldOf(rows, [1, 2, 3])
    expect(field.points.map((point) => [point.label, point.x, point.y, point.z])).toEqual([
      ['Ada', 36, 4, 81],
      ['Grace', 52, 11, 93],
    ])
    expect([field.axes.x.name, field.axes.y.name, field.axes.z.name]).toEqual([
      'Age',
      'Tenure',
      'Score',
    ])
  })

  test('leaves out a row that lacks any of the three numbers, and keeps its row number on the rest', () => {
    const field = fieldOf(rows, [1, 2, 3])
    expect(field.points.map((point) => point.row)).toEqual([0, 1])
  })

  test('puts each point in its group by the group-by column, in the order the groups first come', () => {
    const field = fieldOf(rows, [1, 2, 3], 'Team')
    expect(field.groups).toEqual(['Core', 'Tools'])
    expect(field.points.map((point) => point.groupIndex)).toEqual([0, 1])
  })

  test('with no group-by, every point is in one unnamed group', () => {
    expect(fieldOf(rows, [1, 2, 3]).groups).toEqual([''])
  })

  test('a numeric group-by column is not read as an axis', () => {
    const field = fieldOf(rows, [1, 2, 3], 'Age')
    expect(field.axes.x.name).toBe('Tenure')
  })

  test('widens each range to round numbers, with ticks at its edges', () => {
    const { x } = fieldOf(rows, [1, 2, 3]).axes
    expect(x.range[0]).toBeLessThanOrEqual(36)
    expect(x.range[1]).toBeGreaterThanOrEqual(52)
    expect(x.ticks[0]).toBe(x.range[0])
    expect(x.ticks.at(-1)).toBe(x.range[1])
  })
})

describe('a range', () => {
  test('of one number is widened by one either way', () => {
    expect(niceRange(5, 5)).toEqual([4, 6])
  })

  test('of nothing is zero to one', () => {
    expect(niceRange(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY)).toEqual([0, 1])
  })

  test('places a number from its low end to its high end', () => {
    const axis = { name: '', range: [0, 10] as [number, number], ticks: [] }
    expect(along(axis, 2.5)).toBe(0.25)
  })
})

describe('moving between two tables', () => {
  const at = (share: number, floor = false) => ({
    axes: share,
    floor: () => floor,
    share: () => share,
  })
  const point = (label: string, x: number, y: number, z: number) =>
    row(label, [
      ['Age', String(x), x],
      ['Tenure', String(y), y],
      ['Score', String(z), z],
    ])

  test('with no table before, every point rises from the floor where it stands', () => {
    const field = fieldOf([point('Ada', 10, 40, 5), point('Lin', 20, 80, 7)], [0, 1, 2])
    expect(pointItems(field).map((item) => item.step)).toEqual([0, 1])
    const half = pointsBetween(undefined, field, at(0.5, true))
    const floor = field.axes.y.range[0]
    expect(half.points[0]?.y).toBe((floor + 40) / 2)
    expect(half.points[0]?.x).toBe(10)
  })

  test('a point both tables hold moves to its new place, and one that left sinks to the floor', () => {
    const from = fieldOf([point('Ada', 10, 40, 5), point('Lin', 20, 80, 7)], [0, 1, 2])
    const to = fieldOf([point('Ada', 30, 60, 5)], [0, 1, 2])
    const half = pointsBetween(from, to, at(0.5))
    expect(half.points[0]?.x).toBe(20)
    expect(half.points[0]?.y).toBe(50)
    expect(half.points[1]?.label).toBe('Lin')
    expect(half.points[1]?.y).toBeLessThan(80)
    expect(pointsBetween(from, to, at(1)).points).toHaveLength(1)
  })
})
