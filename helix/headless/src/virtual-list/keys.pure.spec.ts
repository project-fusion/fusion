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
