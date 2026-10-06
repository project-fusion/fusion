import { describe, expect, test } from 'bun:test'
import { gridMove, pageRows } from './grid-move.js'

const bounds = { last: 9, top: -1, width: 4 }
const keys = { control: false, page: 3, step: 0 } as const

describe('a key on a cell of a table read as a grid', () => {
  test('Up and Down move one row, the headings included, and stop at the edges', () => {
    expect(gridMove('ArrowUp', { column: 2, row: 0 }, bounds, keys)).toEqual({ column: 2, row: -1 })
    expect(gridMove('ArrowUp', { column: 2, row: -1 }, bounds, keys)).toEqual({
      column: 2,
      row: -1,
    })
    expect(gridMove('ArrowDown', { column: 2, row: 9 }, bounds, keys)).toEqual({
      column: 2,
      row: 9,
    })
  })

  test('Left and Right move along the line by the step they are given', () => {
    const at = { column: 1, row: 4 }
    expect(gridMove('ArrowRight', at, bounds, { ...keys, step: 1 })).toEqual({ column: 2, row: 4 })
    expect(gridMove('ArrowRight', at, bounds, { ...keys, step: -1 })).toEqual({ column: 0, row: 4 })
    expect(gridMove('ArrowLeft', { column: 3, row: 4 }, bounds, { ...keys, step: 1 })).toEqual({
      column: 3,
      row: 4,
    })
  })

  test('Home and End go to the ends of the row, and with Control to the corners', () => {
    const at = { column: 2, row: 4 }
    expect(gridMove('Home', at, bounds, keys)).toEqual({ column: 0, row: 4 })
    expect(gridMove('End', at, bounds, keys)).toEqual({ column: 3, row: 4 })
    expect(gridMove('Home', at, bounds, { ...keys, control: true })).toEqual({ column: 0, row: -1 })
    expect(gridMove('End', at, bounds, { ...keys, control: true })).toEqual({ column: 3, row: 9 })
  })

  test('Page Up and Page Down move a page of rows, and stop at the edges', () => {
    expect(gridMove('PageDown', { column: 0, row: 4 }, bounds, keys)).toEqual({ column: 0, row: 7 })
    expect(gridMove('PageDown', { column: 0, row: 8 }, bounds, keys)).toEqual({ column: 0, row: 9 })
    expect(gridMove('PageUp', { column: 0, row: 1 }, bounds, keys)).toEqual({ column: 0, row: -1 })
  })

  test('a table with no headings starts at row 0', () => {
    const plain = { ...bounds, top: 0 }
    expect(gridMove('ArrowUp', { column: 0, row: 0 }, plain, keys)).toEqual({ column: 0, row: 0 })
    expect(gridMove('Home', { column: 2, row: 5 }, plain, { ...keys, control: true })).toEqual({
      column: 0,
      row: 0,
    })
  })

  test('any other key moves nothing', () => {
    expect(gridMove('a', { column: 0, row: 0 }, bounds, keys)).toBeUndefined()
    expect(gridMove('Enter', { column: 0, row: 0 }, bounds, keys)).toBeUndefined()
  })
})

describe('the rows a page holds', () => {
  test('are the rows that fit, less one, and never fewer than one', () => {
    expect(pageRows(400, 40)).toBe(9)
    expect(pageRows(60, 40)).toBe(1)
    expect(pageRows(400, 0)).toBe(1)
  })
})
