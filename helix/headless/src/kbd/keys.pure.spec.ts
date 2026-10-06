import { describe, expect, test } from 'bun:test'
import { keyNames } from './keys.js'

describe('keyNames', () => {
  test('gives the platform glyphs on an Apple keyboard, run together', () => {
    expect(keyNames(['mod', 'shift', 'p'], true)).toEqual({ keys: ['⌘', '⇧', 'P'], separator: '' })
  })

  test('gives the platform words elsewhere, joined with a plus', () => {
    expect(keyNames(['mod', 'k'], false)).toEqual({ keys: ['Ctrl', 'K'], separator: '+' })
  })

  test('keeps the platform words that follow a glyph running on', () => {
    expect(keyNames(['mod', 'esc'], true)).toEqual({ keys: ['⌘', 'Esc'], separator: '' })
  })

  /* "CommandK key" was the defect: a word from the page ran into the next key. */
  test('joins words from `own` with a hyphen on an Apple keyboard', () => {
    expect(keyNames(['mod', 'k'], true, { k: 'K key', mod: 'Command' })).toEqual({
      keys: ['Command', 'K key'],
      separator: '-',
    })
    expect(keyNames(['mod', 'enter'], true, { enter: 'Return', mod: 'Command' }).separator).toBe(
      '-',
    )
  })

  test('keeps a single glyph from `own` running on', () => {
    expect(keyNames(['mod', 'k'], true, { mod: '⌘' })).toEqual({ keys: ['⌘', 'K'], separator: '' })
  })

  test('reads names in any case and leaves an unknown word as written', () => {
    expect(keyNames(['Shift', 'PageUp'], false)).toEqual({
      keys: ['Shift', 'PageUp'],
      separator: '+',
    })
  })
})
