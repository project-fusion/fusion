import { describe, expect, test } from 'bun:test'
import { clamp } from './clamp.js'

describe('clamp', () => {
  test('keeps a value inside the range as it is', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  test('holds one outside it at the nearer end', () => {
    expect(clamp(-3, 0, 10)).toBe(0)
    expect(clamp(12, 0, 10)).toBe(10)
  })
})
