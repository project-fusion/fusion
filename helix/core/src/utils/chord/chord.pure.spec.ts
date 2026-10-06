import { describe, expect, test } from 'bun:test'
import { ariaChord, chordParts, matchesChord, printableChord, selectsAll } from './chord.js'

const press = (
  key: string,
  held: Partial<Record<'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey', boolean>> = {},
) => ({ altKey: false, ctrlKey: false, key, metaKey: false, shiftKey: false, ...held })

describe('a chord', () => {
  test('splits into its keys, spaces and empty entries aside', () => {
    expect(chordParts('Alt + Shift + T')).toEqual(['Alt', 'Shift', 'T'])
    expect(chordParts('mod+k+')).toEqual(['mod', 'k'])
    expect(chordParts('')).toEqual([])
  })
})

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

describe('a chord that types a character', () => {
  test('is one code point, with Shift alone beside it', () => {
    expect(printableChord('/')).toBe(true)
    expect(printableChord('shift+?')).toBe(true)
    expect(printableChord('Shift + A')).toBe(true)
    expect(printableChord('escape')).toBe(false)
    expect(printableChord('mod+k')).toBe(false)
    expect(printableChord('')).toBe(false)
  })
})

describe('a press that is the chord', () => {
  test('`mod` is Command on an Apple keyboard and Control elsewhere, never both', () => {
    expect(matchesChord(press('k', { metaKey: true }), 'mod+k', true)).toBe(true)
    expect(matchesChord(press('k', { ctrlKey: true }), 'mod+k', false)).toBe(true)
    expect(matchesChord(press('k', { ctrlKey: true }), 'mod+k', true)).toBe(false)
    expect(matchesChord(press('k', { ctrlKey: true, metaKey: true }), 'mod+k', true)).toBe(false)
  })

  test('every modifier is asked both ways, under any of its names', () => {
    expect(matchesChord(press('K', { metaKey: true, shiftKey: true }), 'mod+k', true)).toBe(false)
    expect(matchesChord(press('p', { altKey: true }), 'opt+p', false)).toBe(true)
    expect(matchesChord(press('p', { metaKey: true }), 'cmd+p', false)).toBe(true)
    expect(matchesChord(press('p'), 'alt+p', false)).toBe(false)
  })

  test('Shift says nothing about a symbol, and a letter still asks for it', () => {
    expect(matchesChord(press('?', { shiftKey: true }), '?', false)).toBe(true)
    expect(matchesChord(press('A', { shiftKey: true }), 'a', false)).toBe(false)
    expect(matchesChord(press('A', { shiftKey: true }), 'shift+a', false)).toBe(true)
  })

  test('no keys is no chord', () => {
    expect(matchesChord(press('k'), '', false)).toBe(false)
  })
})

describe('the press that selects every item', () => {
  const press = (
    key: string,
    held: Partial<Record<'altKey' | 'ctrlKey' | 'metaKey', boolean>>,
  ) => ({
    altKey: false,
    ctrlKey: false,
    key,
    metaKey: false,
    ...held,
  })

  test('is Control or Command with A, in either case', () => {
    expect(selectsAll(press('a', { ctrlKey: true }))).toBe(true)
    expect(selectsAll(press('A', { metaKey: true }))).toBe(true)
  })

  test('is not A alone, nor with Alt held, nor another letter', () => {
    expect(selectsAll(press('a', {}))).toBe(false)
    expect(selectsAll(press('a', { altKey: true, ctrlKey: true }))).toBe(false)
    expect(selectsAll(press('s', { ctrlKey: true }))).toBe(false)
  })
})
