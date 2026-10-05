import { describe, expect, test } from 'bun:test'
import { withoutShortcut, withShortcut } from './shortcut.js'

describe('the shortcut list', () => {
  test('adds a chord once, after the ones already there', () => {
    expect(withShortcut(null, 'Control+K')).toBe('Control+K')
    expect(withShortcut('?', 'Control+K')).toBe('? Control+K')
    expect(withShortcut('Control+K', 'Control+K')).toBe('Control+K')
  })

  test('takes one away, and gives nothing back for an empty list', () => {
    expect(withoutShortcut('? Control+K', 'Control+K')).toBe('?')
    expect(withoutShortcut('Control+K', 'Control+K')).toBeNull()
  })
})
