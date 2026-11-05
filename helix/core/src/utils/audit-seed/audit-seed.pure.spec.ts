import { describe, expect, test } from 'bun:test'
import { contrastOf } from './audit-seed.js'

describe('contrastOf', () => {
  test('black on white is 21', () => {
    expect(contrastOf([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5)
  })

  test('order does not matter', () => {
    expect(contrastOf([255, 240, 0], [255, 255, 255])).toBe(
      contrastOf([255, 255, 255], [255, 240, 0]),
    )
  })

  test('a bright yellow on white falls under a fill floor of 3', () => {
    expect(contrastOf([255, 240, 0], [255, 255, 255])).toBeLessThan(3)
  })
})
