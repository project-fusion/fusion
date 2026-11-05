import { describe, expect, test } from 'bun:test'
import {
  heatmapCellBox,
  heatmapInSequence,
  heatmapRectangle,
  heatmapStretch,
} from './heatmap-rectangle.js'

/* Seven rows to a column, as a calendar: cell 9 is column 1, row 2. */
describe('a rectangle of cells', () => {
  test('takes in the rows and the columns between two corners, in the order drawn', () => {
    expect(heatmapRectangle(21, 7, 1, 9)).toEqual([1, 2, 8, 9])
    expect(heatmapRectangle(21, 7, 15, 1)).toEqual([1, 8, 15])
  })

  test('is the same cells whichever corner it is drawn from', () => {
    expect(heatmapRectangle(21, 7, 9, 1)).toEqual(heatmapRectangle(21, 7, 1, 9))
    expect(heatmapRectangle(21, 7, 2, 7)).toEqual([0, 1, 2, 7, 8, 9])
  })

  test('skips the places a short last column has no cell for', () => {
    // Ten cells: the second column holds three, 7 to 9.
    expect(heatmapRectangle(10, 7, 4, 8)).toEqual([1, 2, 3, 4, 8, 9])
  })

  test('is one cell where both corners are the same', () => {
    expect(heatmapRectangle(21, 7, 5, 5)).toEqual([5])
  })

  test('is a run of cells on a strip of one row', () => {
    expect(heatmapRectangle(6, 1, 4, 1)).toEqual([1, 2, 3, 4])
  })
})

describe('a selection in sequence', () => {
  test('lists each value once, in the order the table lists them', () => {
    expect(heatmapInSequence(['Wed', 'Mon', 'Wed', 'Tue'], ['Mon', 'Tue', 'Wed'])).toEqual([
      'Mon',
      'Tue',
      'Wed',
    ])
  })

  test('keeps a value the table no longer lists, after the rest', () => {
    expect(heatmapInSequence(['Sun', 'Tue', 'Mon'], ['Mon', 'Tue'])).toEqual(['Mon', 'Tue', 'Sun'])
  })
})

describe('heatmapCellBox', () => {
  test('stands a cell in its column across and its row down', () => {
    expect(heatmapCellBox(9, 7, 12, 4)).toEqual({ x: 16, y: 32 })
    expect(heatmapCellBox(3, 1, 5, 3, 32)).toEqual({ x: 24, y: 0 })
  })
})

describe('heatmapStretch', () => {
  const all = Array.from({ length: 21 }, (_, at) => `d${at}`)

  test('takes in the days between two corners beside what was selected', () => {
    expect(heatmapStretch({ all, anchor: 1, base: ['d20'], dropped: 0, rows: 7, to: 9 })).toEqual([
      'd1',
      'd2',
      'd8',
      'd9',
      'd20',
    ])
  })

  test('falls where the strip draws its columns once it drops the oldest', () => {
    expect(heatmapStretch({ all, anchor: 7, base: [], dropped: 7, rows: 7, to: 1 })).toEqual([
      'd7',
      'd8',
    ])
  })
})
