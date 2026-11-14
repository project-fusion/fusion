import { describe, expect, test } from 'bun:test'
import type { Row } from '../read-series/read-series.js'
import {
  scatterField,
  scatterLayers,
  scatterNearest,
  scatterNice,
  scatterOrder,
  scatterTrends,
} from './scatter-plot.js'

const cell = (name: string, value: number) => ({ name, text: String(value), value })
const rows: Row[] = [
  { cells: [cell('Weight', 300), cell('Load', 900), cell('Size', 4)], label: 'A' },
  { cells: [cell('Weight', 100), cell('Load', 500), cell('Size', 1)], label: 'B' },
  { cells: [cell('Weight', 500), cell('Load', 1300), cell('Size', 16)], label: 'C' },
]
const names = ['Weight', 'Load', 'Size']
const name = (column: number | undefined) => (column === undefined ? '' : (names[column] ?? ''))

describe('a scatter chart drawn by core', () => {
  test('widens a range to the round numbers either side of it', () => {
    expect(scatterNice([130, 470])).toEqual([100, 500])
    expect(scatterNice([5, 5])).toEqual([4, 6])
  })

  test('places a point a row, across by the first measure and up by each other', () => {
    const field = scatterField(
      rows,
      { across: 0, size: undefined, ups: [1, 2] },
      [true, false],
      name,
    )
    expect(field.x).toEqual([100, 500])
    expect(field.points.map(({ row, x }) => [row, x])).toEqual([
      [0, 50],
      [1, 0],
      [2, 100],
    ])
    expect(field.yNames).toEqual(['Load', 'Size'])
  })

  test('sizes each point by the square root of its share of the largest size', () => {
    const field = scatterField(rows, { across: 0, size: 2, ups: [1] }, [true], name)
    expect(field.points.map(({ weight }) => weight)).toEqual([0.5, 0.25, 1])
  })

  test('draws a series as a path a size, in one layer until the rings are measured', () => {
    const field = scatterField(rows, { across: 0, size: undefined, ups: [1] }, [true], name)
    const layers = scatterLayers(field, { height: 100, width: 100 }, 1, undefined)
    expect(layers).toHaveLength(1)
    expect(layers[0]?.paths[0]?.d).toBe('M50,50h0M0,90h0M100,10h0')
  })

  test('walks the rows left to right, and finds the point nearest a finger', () => {
    expect(scatterOrder(rows, 0)).toEqual([1, 0, 2])
    const field = scatterField(rows, { across: 0, size: undefined, ups: [1] }, [true], name)
    expect(
      scatterNearest(field.points, { height: 200, width: 400 }, { x: 190, y: 105 }, 24)?.row,
    ).toBe(0)
    expect(scatterNearest(field.points, { height: 200, width: 400 }, { x: 300, y: 20 }, 24)).toBe(
      undefined,
    )
  })

  test('draws each series its line of best fit across the plot', () => {
    const field = scatterField(rows, { across: 0, size: undefined, ups: [1] }, [true], name)
    expect(scatterTrends(field, () => true)).toEqual([{ depth: 0, x1: 0, x2: 100, y1: 90, y2: 10 }])
  })
})
