import { describe, expect, test } from 'bun:test'
import { clampOf } from './clamp.js'

describe('clampOf', () => {
  test('a whole number above zero is the clamp it asks for', () => {
    expect(clampOf(1)).toBe('-webkit-line-clamp: 1')
    expect(clampOf(12)).toBe('-webkit-line-clamp: 12')
  })

  test('nothing, zero, a fraction and a number that did not parse clamp nothing', () => {
    expect(clampOf(undefined)).toBeUndefined()
    expect(clampOf(0)).toBeUndefined()
    expect(clampOf(-2)).toBeUndefined()
    expect(clampOf(1.5)).toBeUndefined()
    expect(clampOf(Number.NaN)).toBeUndefined()
  })
})
