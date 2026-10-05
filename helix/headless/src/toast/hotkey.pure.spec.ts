import { describe, expect, test } from 'bun:test'
import { matchesHotkey, parseHotkey } from './hotkey.js'

const press = (
  key: string,
  held: Partial<Record<'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey', boolean>> = {},
) => ({
  altKey: false,
  ctrlKey: false,
  key,
  metaKey: false,
  shiftKey: false,
  ...held,
})

describe('a hotkey', () => {
  test('is read from keys joined by a plus, the last one the key', () => {
    expect(parseHotkey('F8')).toEqual({
      alt: false,
      ctrl: false,
      key: 'F8',
      meta: false,
      shift: false,
    })
    expect(parseHotkey('Alt + Shift + T')).toEqual({
      alt: true,
      ctrl: false,
      key: 'T',
      meta: false,
      shift: true,
    })
  })

  test('is none where nothing or only a modifier is written', () => {
    expect(parseHotkey('')).toBeNull()
    expect(parseHotkey('Alt+')).toBeNull()
    expect(parseHotkey('Shift')).toBeNull()
  })

  test('matches its key, case aside, with exactly its modifiers', () => {
    expect(matchesHotkey(press('F8'), parseHotkey('F8'))).toBe(true)
    expect(matchesHotkey(press('t', { altKey: true }), parseHotkey('Alt+T'))).toBe(true)
    expect(matchesHotkey(press('F8', { ctrlKey: true }), parseHotkey('F8'))).toBe(false)
    expect(matchesHotkey(press('t'), parseHotkey('Alt+T'))).toBe(false)
    expect(matchesHotkey(press('F8'), null)).toBe(false)
  })
})
