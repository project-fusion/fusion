import { describe, expect, test } from 'bun:test'
import { chordOf, isTab, shortcutOf, spokenChord } from './keys.js'

const press = (
  key: string,
  held: Partial<Record<'alt' | 'ctrl' | 'meta' | 'shift', boolean>> = {},
) => ({
  altKey: held.alt ?? false,
  ctrlKey: held.ctrl ?? false,
  key,
  metaKey: held.meta ?? false,
  shiftKey: held.shift ?? false,
})

describe('the keys a terminal frame takes', () => {
  test('Control+Shift with a letter elsewhere, and Command with a letter on a Mac', () => {
    expect(shortcutOf(press('F', { ctrl: true, shift: true }), false)).toBe('find')
    expect(shortcutOf(press('C', { ctrl: true, shift: true }), false)).toBe('copy')
    expect(shortcutOf(press('f', { meta: true }), true)).toBe('find')
  })

  test('Control+M switches Tab, and Control+Shift+M on a Mac', () => {
    expect(shortcutOf(press('m', { ctrl: true }), false)).toBe('tab-focus')
    expect(shortcutOf(press('M', { ctrl: true, shift: true }), true)).toBe('tab-focus')
    expect(shortcutOf(press('m', { ctrl: true }), true)).toBeNull()
  })

  test('every chord a program reads is left to it', () => {
    for (const key of ['c', 'f', 'Escape', 'Tab', 'r', 'd']) {
      expect(shortcutOf(press(key, { ctrl: true }), false) === 'tab-focus').toBe(false)
      expect(shortcutOf(press(key), false)).toBeNull()
    }
    expect(shortcutOf(press('c', { ctrl: true }), false)).toBeNull()
    expect(shortcutOf(press('f', { ctrl: true }), false)).toBeNull()
    expect(shortcutOf(press('c', { meta: true }), true)).toBeNull()
  })

  test('Control+Shift+V pastes elsewhere, and a Mac pastes with Command+V on its own', () => {
    expect(shortcutOf(press('V', { ctrl: true, shift: true }), false)).toBe('paste')
    expect(shortcutOf(press('v', { ctrl: true }), false)).toBeNull()
    expect(chordOf('paste', true)).toBeUndefined()
    expect(shortcutOf(press('v', { meta: true }), true)).toBeNull()
  })

  test('copy is the browser’s own on a Mac', () => {
    expect(chordOf('copy', true)).toBeUndefined()
    expect(spokenChord('copy', true)).toBe('')
  })

  test('a chord is spoken with the names a screen reader reads', () => {
    expect(spokenChord('tab-focus', false)).toBe('Control+M')
    expect(spokenChord('tab-focus', true)).toBe('Control+Shift+M')
    expect(spokenChord('find', true)).toBe('Command+F')
  })

  test('Tab and Shift+Tab move focus, and Tab with another modifier does not', () => {
    expect(isTab(press('Tab'))).toBe(true)
    expect(isTab(press('Tab', { shift: true }))).toBe(true)
    expect(isTab(press('Tab', { ctrl: true }))).toBe(false)
  })
})
