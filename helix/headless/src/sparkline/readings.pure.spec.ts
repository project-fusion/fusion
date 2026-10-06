import { describe, expect, test } from 'bun:test'
import { areaPath, extremesOf, overviewWords, readingWords, slotsOf } from './readings.js'

describe('the highest and the lowest reading', () => {
  test('are found by place, the first where several tie', () => {
    expect(extremesOf([3, 9, 1, 9, 1])).toEqual({ high: 1, low: 2 })
  })

  test('pass over a blank slot', () => {
    expect(extremesOf([undefined, 4, undefined, 2])).toEqual({ high: 1, low: 3 })
  })

  test('are none in a list with nothing in it', () => {
    expect(extremesOf([undefined])).toEqual({})
  })
})

describe('a reading in words', () => {
  test('is the row, the reading and where it stands', () => {
    expect(readingWords('Mon', '12', '3 of 7')).toBe('Mon: 12 (3 of 7)')
  })

  test('is the reading alone where no row names it, and no position where none is given', () => {
    expect(readingWords('', '1,318', '')).toBe('1,318')
  })

  test('is the row alone where its cell is blank', () => {
    expect(readingWords('Tue', '', '2 of 7')).toBe('Tue (2 of 7)')
  })
})

describe('the readings in their places', () => {
  test('put each value at its place, with a blank where none was read', () => {
    expect(
      slotsOf(
        [
          { at: 0, value: 4 },
          { at: 2, value: 6 },
          { at: 9, value: 1 },
        ],
        3,
      ),
    ).toEqual([4, undefined, 6])
  })
})

describe('the wash under the line', () => {
  test('closes each run down to the floor', () => {
    expect(
      areaPath(
        [
          {
            path: 'M0,4L10,2',
            run: [
              [0, 4],
              [10, 2],
            ],
          },
          {
            path: 'M30,1L40,3',
            run: [
              [30, 1],
              [40, 3],
            ],
          },
        ],
        32,
      ),
    ).toBe('M0,4L10,2L10,32L0,32ZM30,1L40,3L40,32L30,32Z')
  })

  test('is nothing without a run', () => {
    expect(areaPath([], 32)).toBe('')
  })
})

describe('what the readings come to', () => {
  const words = (slots: (number | undefined)[]) =>
    overviewWords('From {first} to {last}, highest {high}, lowest {low}', slots, (at) =>
      String(slots[at]),
    )

  test('says the first, the last, the highest and the lowest reading', () => {
    expect(words([undefined, 12, 30, 8, 20])).toBe('From 12 to 20, highest 30, lowest 8')
  })

  test('says nothing of a single reading', () => {
    expect(words([undefined, 5, undefined])).toBe('')
  })
})
