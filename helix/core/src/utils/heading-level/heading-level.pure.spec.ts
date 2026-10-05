import { describe, expect, test } from 'bun:test'
import { headingLevel } from './heading-level.js'

describe('a heading level', () => {
  test('is the level asked for, or the fallback where none was', () => {
    expect(headingLevel(2)).toBe(2)
    expect(headingLevel(undefined)).toBe(3)
    expect(headingLevel(undefined, 4)).toBe(4)
    expect(headingLevel(Number.NaN, 2)).toBe(2)
  })

  test('is held between 1 and 6, and a whole number', () => {
    expect(headingLevel(0)).toBe(1)
    expect(headingLevel(9)).toBe(6)
    expect(headingLevel(2.7)).toBe(2)
  })
})
