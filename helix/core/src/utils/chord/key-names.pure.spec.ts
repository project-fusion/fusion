import { describe, expect, test } from 'bun:test'
import { keyNames } from './key-names.js'

describe('keyNames', () => {
  test('gives the platform glyphs on an Apple keyboard, run together', () => {
    expect(keyNames(['shift', 'mod', 'p'], true)).toMatchObject({
      keys: ['⇧', '⌘', 'P'],
      separator: '',
    })
  })

  test('gives the platform words elsewhere, joined with a plus', () => {
    expect(keyNames(['mod', 'k'], false)).toEqual({
      keys: ['Ctrl', 'K'],
      separator: '+',
      spoken: '',
      words: ['Ctrl', 'K'],
    })
  })

  test('keeps the platform words that follow a glyph running on', () => {
    expect(keyNames(['mod', 'esc'], true)).toMatchObject({ keys: ['⌘', 'Esc'], separator: '' })
  })

  /* "CommandK key" was the defect: a word from the page ran into the next key. */
  test('joins words from `own` with a hyphen on an Apple keyboard', () => {
    expect(keyNames(['mod', 'k'], true, { k: 'K key', mod: 'Command' })).toEqual({
      keys: ['Command', 'K key'],
      separator: '-',
      spoken: '',
      words: ['Command', 'K key'],
    })
    expect(keyNames(['mod', 'enter'], true, { enter: 'Return', mod: 'Command' }).separator).toBe(
      '-',
    )
  })

  test('keeps a single glyph from `own` running on', () => {
    expect(keyNames(['mod', 'k'], true, { mod: '⌘' })).toMatchObject({
      keys: ['⌘', 'K'],
      separator: '',
    })
  })

  test('reads names in any case and leaves an unknown word as written', () => {
    expect(keyNames(['Shift', 'PageUp'], false)).toEqual({
      keys: ['Shift', 'PageUp'],
      separator: '+',
      spoken: '',
      words: ['Shift', 'PageUp'],
    })
  })

  test('says each key in words where it is drawn in a glyph', () => {
    expect(keyNames(['shift', 'mod', 'p'], true).words).toEqual(['Shift', 'Command', 'P'])
  })

  /* `mod+shift+p` drew ⌘⇧P on a Mac, where every menu writes ⇧⌘P, and the
     order that was right there was wrong everywhere else. */
  test("puts the modifiers in each platform's order, whatever order they were written in", () => {
    expect(keyNames(['mod', 'shift', 'p'], true).keys).toEqual(['⇧', '⌘', 'P'])
    expect(keyNames(['mod', 'shift', 'p'], false).keys).toEqual(['Ctrl', 'Shift', 'P'])
    expect(keyNames(['shift', 'mod', 'p'], false).keys).toEqual(['Ctrl', 'Shift', 'P'])
    expect(keyNames(['cmd', 'opt', 'shift', 'ctrl', 'k'], true).keys).toEqual([
      '⌃',
      '⌥',
      '⇧',
      '⌘',
      'K',
    ])
    expect(keyNames(['shift', 'alt', 'ctrl', 'meta', 'k'], false).keys).toEqual([
      'Win',
      'Ctrl',
      'Alt',
      'Shift',
      'K',
    ])
  })

  /* `⌘K` was the whole accessible name, and a screen reader reads ⌘ as a
     symbol or skips it. */
  test('says a chord drawn in glyphs in words, in the order it is drawn', () => {
    expect(keyNames(['mod', 'shift', 'p'], true).spoken).toBe('Shift Command P')
    expect(keyNames(['alt', 'up'], true).spoken).toBe('Option Up Arrow')
    expect(keyNames(['mod', 'esc'], true).spoken).toBe('Command Esc')
    expect(keyNames(['alt', 'up'], false).spoken).toBe('Alt Up Arrow')
  })

  test('says nothing more where every label is a word already', () => {
    expect(keyNames(['mod', 'shift', 'p'], false).spoken).toBe('')
    expect(keyNames(['?'], true).spoken).toBe('')
    expect(keyNames(['mod', 'k'], true, { mod: 'Command' }).spoken).toBe('')
  })
})
