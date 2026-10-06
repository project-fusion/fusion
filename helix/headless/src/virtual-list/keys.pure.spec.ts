import { describe, expect, test } from 'bun:test'
import { stepIndex } from './keys.js'

describe('stepIndex', () => {
  test('moves one item with the vertical arrows, and stops at either end', () => {
    expect(stepIndex('ArrowDown', 4, 10, 5)).toBe(5)
    expect(stepIndex('ArrowUp', 4, 10, 5)).toBe(3)
    expect(stepIndex('ArrowDown', 9, 10, 5)).toBe(9)
    expect(stepIndex('ArrowUp', 0, 10, 5)).toBe(0)
  })

  test('goes to the first and the last with Home and End', () => {
    expect(stepIndex('Home', 4, 10_000, 5)).toBe(0)
    expect(stepIndex('End', 4, 10_000, 5)).toBe(9_999)
  })

  test('moves a page at a time, at least one item', () => {
    expect(stepIndex('PageDown', 4, 100, 9)).toBe(13)
    expect(stepIndex('PageUp', 13, 100, 9)).toBe(4)
    expect(stepIndex('PageDown', 95, 100, 9)).toBe(99)
    expect(stepIndex('PageDown', 4, 100, 0)).toBe(5)
  })

  test('takes no other key, and nothing in an empty list', () => {
    expect(stepIndex('ArrowLeft', 4, 10, 5)).toBeUndefined()
    expect(stepIndex('a', 4, 10, 5)).toBeUndefined()
    expect(stepIndex('ArrowDown', 0, 0, 5)).toBeUndefined()
  })

  test('starts from inside the set when the item it starts from is gone', () => {
    expect(stepIndex('ArrowUp', 40, 10, 5)).toBe(8)
  })
})

describe('stepIndex in a grid', () => {
  /* Ten items, four to a line: 0-3, 4-7, 8-9. */
  const grid = { across: 4 }

  test('moves a line with the vertical arrows, in the same column', () => {
    expect(stepIndex('ArrowDown', 1, 10, 2, grid)).toBe(5)
    expect(stepIndex('ArrowUp', 5, 10, 2, grid)).toBe(1)
    expect(stepIndex('ArrowUp', 2, 10, 2, grid)).toBe(2)
  })

  test('goes to the last item from above a shorter last line, and stays on the last line', () => {
    expect(stepIndex('ArrowDown', 7, 10, 2, grid)).toBe(9)
    expect(stepIndex('ArrowDown', 9, 10, 2, grid)).toBe(9)
  })

  test('moves one item along the line with Left and Right, and turns them on a right-to-left page', () => {
    expect(stepIndex('ArrowRight', 3, 10, 2, grid)).toBe(4)
    expect(stepIndex('ArrowLeft', 4, 10, 2, grid)).toBe(3)
    expect(stepIndex('ArrowLeft', 0, 10, 2, grid)).toBe(0)
    expect(stepIndex('ArrowLeft', 3, 10, 2, { ...grid, forward: 'ArrowLeft' })).toBe(4)
  })

  test('leaves Left and Right to the row in a list', () => {
    expect(stepIndex('ArrowRight', 3, 10, 2)).toBeUndefined()
  })

  test('moves a page of lines, at least one, held to the set', () => {
    expect(stepIndex('PageDown', 1, 10, 1, grid)).toBe(5)
    expect(stepIndex('PageDown', 1, 10, 5, grid)).toBe(9)
    expect(stepIndex('PageUp', 9, 10, 5, grid)).toBe(1)
  })
})
