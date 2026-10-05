import { describe, expect, test } from 'bun:test'
import { ariaChord, withoutShortcut, withShortcut } from './shortcut.js'

describe('ariaChord', () => {
  test('writes the platform modifier as the key it is on each keyboard', () => {
    expect(ariaChord('mod+k', true)).toBe('Meta+K')
    expect(ariaChord('mod+k', false)).toBe('Control+K')
  })

  test('spells every name the way the key values do', () => {
    expect(ariaChord('shift+alt+p', false)).toBe('Shift+Alt+P')
    expect(ariaChord('ctrl+esc', true)).toBe('Control+Escape')
    expect(ariaChord('up', false)).toBe('ArrowUp')
    expect(ariaChord('?', false)).toBe('?')
    expect(ariaChord('/', false)).toBe('/')
    expect(ariaChord('', false)).toBe('')
  })
})

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
