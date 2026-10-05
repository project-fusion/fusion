import { describe, expect, test } from 'bun:test'
import { extremesOf, readingWords } from './readings.js'

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
