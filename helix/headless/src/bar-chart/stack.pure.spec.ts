import { describe, expect, test } from 'bun:test'
import { stackEnds, stackSpans } from './stack.js'

describe('a stack of columns', () => {
  test('stands each positive reading on the ones before it', () => {
    expect(stackSpans([3, 4, 2])).toEqual([
      [0, 3],
      [3, 7],
      [7, 9],
    ])
  })

  test('hangs a negative reading from zero, on the negatives before it', () => {
    expect(stackSpans([3, -2, 4, -1])).toEqual([
      [0, 3],
      [0, -2],
      [3, 7],
      [-2, -3],
    ])
  })

  test('gives a blank no span and leaves the rest where they were', () => {
    expect(stackSpans([2, undefined, 5])).toEqual([[0, 2], undefined, [2, 7]])
  })

  test('reaches the top and the foot of each category, which its scale holds', () => {
    expect(
      Math.max(
        ...stackEnds([
          [3, 4],
          [5, -2, 1],
        ]),
      ),
    ).toBe(7)
    expect(
      Math.min(
        ...stackEnds([
          [3, 4],
          [5, -2, 1],
        ]),
      ),
    ).toBe(-2)
  })
})
