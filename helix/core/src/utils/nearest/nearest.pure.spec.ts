import { describe, expect, test } from 'bun:test'
import { nearest } from './nearest.js'

describe('nearest', () => {
  test('is the value closest to the target', () => {
    expect(nearest([0, 0.5, 1], 0.7)).toBe(0.5)
    expect(nearest([1, 2, 3, 4, 5], 3.4)).toBe(3)
  })

  test('is the first of two at the same distance, the lower in an ascending set', () => {
    expect(nearest([1, 2, 3], 2.5)).toBe(2)
    expect(nearest([3, 2, 1], 2.5)).toBe(3)
  })

  test('is nothing for no values', () => {
    expect(nearest([], 4)).toBeUndefined()
  })
})
