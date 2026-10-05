import { describe, expect, test } from 'bun:test'
import { pressedValue, tabStop } from './selection.js'

describe('the tab stop', () => {
  const a = { disabled: false, name: 'a' }
  const b = { disabled: false, name: 'b', selected: true }
  const off = { disabled: true, name: 'off' }

  test('is the tag the reader was last on', () => {
    expect(tabStop([a, b], a)).toBe(a)
  })

  test('then the first selected, then the first that can be reached', () => {
    expect(tabStop([a, b])).toBe(b)
    expect(tabStop([off, a])).toBe(a)
  })

  test('never a disabled tag, nor one that has left', () => {
    expect(tabStop([off, a], off)).toBe(a)
    expect(tabStop([a], { disabled: false, name: 'gone' })).toBe(a)
    expect(tabStop([off])).toBeUndefined()
  })
})

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
