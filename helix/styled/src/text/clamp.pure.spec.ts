import { describe, expect, test } from 'bun:test'
import { clampOf } from './clamp.js'

describe('clampOf', () => {
  test('a whole number above zero is the clamp it asks for', () => {
    expect(clampOf(1)).toContain('-webkit-line-clamp: 1')
    expect(clampOf(12)).toContain('-webkit-line-clamp: 12')
  })

  test('the box and the overflow come with the count, and only with it', () => {
    expect(clampOf(2)).toBe(
      'display: -webkit-box; overflow: hidden; -webkit-box-orient: vertical; -webkit-line-clamp: 2',
    )
  })

  test('nothing, zero, a fraction and a number that did not parse clamp nothing', () => {
    expect(clampOf(undefined)).toBeUndefined()
    expect(clampOf(0)).toBeUndefined()
    expect(clampOf(-2)).toBeUndefined()
    expect(clampOf(1.5)).toBeUndefined()
    expect(clampOf(Number.NaN)).toBeUndefined()
  })
})
