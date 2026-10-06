import { describe, expect, test } from 'bun:test'
import { columnStep } from './column-step.js'

/* Three columns at 0, 100 and 200, with a short last row. */
const GRID = [0, 100, 200, 0, 100, 200, 0]

describe('moving up and down a list laid out in columns', () => {
  test('down reaches the item below, in the same column', () => {
    expect(columnStep(GRID, 1, 1)).toBe(4)
    expect(columnStep(GRID, 3, 1)).toBe(6)
  })

  test('up reaches the item above', () => {
    expect(columnStep(GRID, 4, -1)).toBe(1)
    expect(columnStep(GRID, 6, -1)).toBe(3)
  })

  test('stops at the edge, and below a short row', () => {
    expect(columnStep(GRID, 1, -1)).toBe(1)
    expect(columnStep(GRID, 5, 1)).toBe(5)
  })

  test('a single column moves one at a time', () => {
    expect(columnStep([0, 0, 0], 0, 1)).toBe(1)
  })
})
