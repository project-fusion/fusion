import { describe, expect, test } from 'bun:test'
import { pressedValue } from './selection.js'

describe('a press on a tag', () => {
  test('in a single selection selects it alone, and again selects none', () => {
    expect(pressedValue('single', 'a', 'b')).toBe('b')
    expect(pressedValue('single', 'b', 'b')).toBe('')
  })

  test('in a multiple selection adds it, and again takes it out', () => {
    expect(pressedValue('multiple', 'a', 'b c')).toBe('a, b c')
    expect(pressedValue('multiple', 'a, b c', 'a')).toBe('b c')
  })

  test('selects nothing where the group selects nothing', () => {
    expect(pressedValue('none', 'a', 'b')).toBe('a')
  })
})
