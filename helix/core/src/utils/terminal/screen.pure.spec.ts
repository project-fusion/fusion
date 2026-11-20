import { describe, expect, test } from 'bun:test'
import { encodeKey, pasted } from './encode.js'
import {
  ansiName,
  findInLines,
  lineRuns,
  markRuns,
  runsText,
  type TerminalCell,
  type TerminalLine,
} from './screen.js'

/** A cell as `@xterm/headless` hands it out, from what a spec says of it. */
const cell = (
  chars: string,
  look: { bg?: number; bold?: boolean; fg?: number; rgb?: number; width?: number } = {},
): TerminalCell => ({
  getBgColor: () => look.bg ?? 0,
  getChars: () => chars,
  getFgColor: () => look.rgb ?? look.fg ?? 0,
  getWidth: () => look.width ?? 1,
  isBgPalette: () => look.bg !== undefined,
  isBgRGB: () => false,
  isBold: () => (look.bold ? 1 : 0),
  isDim: () => 0,
  isFgPalette: () => look.fg !== undefined,
  isFgRGB: () => look.rgb !== undefined,
  isInverse: () => 0,
  isInvisible: () => 0,
  isItalic: () => 0,
  isStrikethrough: () => 0,
  isUnderline: () => 0,
})

const line = (cells: TerminalCell[], length = cells.length): TerminalLine => ({
  getCell: (x) => cells[x] ?? cell(''),
  length,
})

describe('lineRuns', () => {
  test('cells drawn alike join, and a named color keeps its name', () => {
    const runs = lineRuns(line([cell('o', { fg: 1 }), cell('k', { fg: 1 }), cell(' '), cell('!')]))
    expect(runs).toEqual([{ color: 'red', text: 'ok' }, { text: ' !' }])
  })

  test('bold turns the first eight colors bright, and a 24-bit color is CSS', () => {
    expect(lineRuns(line([cell('a', { bold: true, fg: 2 })]))[0]).toEqual({
      bold: true,
      color: 'bright-green',
      text: 'a',
    })
    expect(lineRuns(line([cell('b', { rgb: 0x0a141e })]))[0]?.color).toBe('rgb(10 20 30)')
  })

  test('spaces at the end are dropped, and the cell after a wide character is left out', () => {
    const runs = lineRuns(line([cell('界', { width: 2 }), cell('', { width: 0 }), cell('x')], 8))
    expect(runsText(runs)).toBe('界x')
  })

  test('the cursor is a run of its own, a space past the end of the line', () => {
    expect(lineRuns(line([cell('$'), cell(' ')], 10), 2)).toEqual([
      { text: '$ ' },
      { cursor: true, text: ' ' },
    ])
    expect(lineRuns(line([cell('a'), cell('b'), cell('c')]), 1)).toEqual([
      { text: 'a' },
      { cursor: true, text: 'b' },
      { text: 'c' },
    ])
  })
})

describe('findInLines and markRuns', () => {
  const query = { caseSensitive: false, regex: false, replace: '', search: 'err', wholeWord: false }

  test('finds each match in reading order, a line at a time', () => {
    expect(findInLines(['an Error', 'ok', 'err err'], query)).toEqual([
      { from: 3, line: 0, to: 6 },
      { from: 0, line: 2, to: 3 },
      { from: 4, line: 2, to: 7 },
    ])
  })

  test('cuts the runs at a match and marks the current one', () => {
    const marked = markRuns(
      [{ color: 'red', text: 'an Er' }, { text: 'ror' }],
      [{ current: true, from: 3, to: 6 }],
    )
    expect(marked).toEqual([
      { color: 'red', text: 'an ' },
      { color: 'red', current: true, match: true, text: 'Er' },
      { current: true, match: true, text: 'r' },
      { text: 'or' },
    ])
  })

  test('ansiName names the sixteen colors alone', () => {
    expect(ansiName('bright-red')).toBe('bright-red')
    expect(ansiName('rgb(1 2 3)')).toBeUndefined()
  })
})

describe('encodeKey', () => {
  const press = (
    key: string,
    held: Partial<Record<'alt' | 'control' | 'meta' | 'shift', boolean>> = {},
  ) => ({
    alt: false,
    control: false,
    key,
    meta: false,
    shift: false,
    ...held,
  })

  test('writes the keys a program reads as xterm.js does', () => {
    expect(encodeKey(press('Enter'))).toBe('\r')
    expect(encodeKey(press('Backspace'))).toBe('\x7f')
    expect(encodeKey(press('Tab', { shift: true }))).toBe('\x1b[Z')
    expect(encodeKey(press('ArrowUp'))).toBe('\x1b[A')
    expect(encodeKey(press('ArrowUp'), true)).toBe('\x1bOA')
    expect(encodeKey(press('ArrowRight', { control: true }))).toBe('\x1b[1;5C')
    expect(encodeKey(press('PageDown'))).toBe('\x1b[6~')
    expect(encodeKey(press('F1'))).toBe('\x1bOP')
  })

  test('Control with a letter is its control byte, Alt a prefix, and Command nothing', () => {
    expect(encodeKey(press('c', { control: true }))).toBe('\x03')
    expect(encodeKey(press('b', { alt: true }))).toBe('\x1bb')
    expect(encodeKey(press('c', { meta: true }))).toBeUndefined()
    expect(encodeKey(press('Shift'))).toBeUndefined()
  })

  test('a paste is bracketed where the program asked, with its lines ended by Return', () => {
    expect(pasted('a\nb', false)).toBe('a\rb')
    expect(pasted('a', true)).toBe('\x1b[200~a\x1b[201~')
  })
})
