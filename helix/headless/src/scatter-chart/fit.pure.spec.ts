import { describe, expect, test } from 'bun:test'
import { correlation, leastSquares } from './fit.js'

describe('the correlation', () => {
  test('is one for points on a rising line, and minus one on a falling one', () => {
    expect(
      correlation([
        [1, 2],
        [2, 4],
        [3, 6],
      ]),
    ).toBe(1)
    expect(
      correlation([
        [1, 6],
        [2, 4],
        [3, 2],
      ]),
    ).toBe(-1)
  })

  test('is none for fewer than three points, or no spread', () => {
    expect(
      correlation([
        [1, 2],
        [2, 4],
      ]),
    ).toBeUndefined()
    expect(
      correlation([
        [1, 2],
        [1, 4],
        [1, 6],
      ]),
    ).toBeUndefined()
  })
})

describe('the line nearest the points', () => {
  test('runs through points that are on one', () => {
    expect(
      leastSquares([
        [0, 1],
        [1, 3],
        [2, 5],
      ]),
    ).toEqual({ intercept: 1, slope: 2 })
  })

  test('splits the difference between points that are not', () => {
    expect(
      leastSquares([
        [0, 0],
        [1, 2],
        [2, 0],
      ]),
    ).toEqual({ intercept: 2 / 3, slope: 0 })
  })

  test('is none for one point, or for points that share their measure across', () => {
    expect(leastSquares([[1, 2]])).toBeUndefined()
    expect(
      leastSquares([
        [1, 2],
        [1, 5],
      ]),
    ).toBeUndefined()
  })
})
