import { describe, expect, test } from 'bun:test'
import { textOf } from './fill.js'

describe('textOf', () => {
  test('writes numbers and booleans as text, and nothing for a missing value', () => {
    expect(textOf(42)).toBe('42')
    expect(textOf(false)).toBe('false')
    expect(textOf(undefined)).toBe('')
    expect(textOf(null)).toBe('')
    expect(textOf({ a: 1 })).toBe('')
  })
})
