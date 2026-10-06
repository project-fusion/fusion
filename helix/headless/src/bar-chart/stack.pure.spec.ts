import { describe, expect, test } from 'bun:test'
import { stackEnds, stackedReadings, stackSpans } from './stack.js'

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

describe('the readings a stacked scale holds', () => {
  const series = (name: string, values: (number | undefined)[]) => ({
    name,
    points: values.flatMap((value, at) => (value === undefined ? [] : [{ at, label: '', value }])),
  })

  /* The plot held the lines' readings and the tooltip did not, so a bubble
     over a stack with a line in it sat at the wrong height. */
  test('are the lines as read and the ends of each category stack of the rest', () => {
    const group = [series('A', [2, -1]), series('B', [3, 4]), series('Target', [9, 1])]
    expect(stackedReadings(group, 2, (one) => one.name === 'Target').sort((a, b) => a - b)).toEqual(
      [-1, 1, 2, 4, 5, 9],
    )
  })
})
