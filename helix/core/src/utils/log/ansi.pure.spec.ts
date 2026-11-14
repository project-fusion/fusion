import { describe, expect, test } from 'bun:test'
import { applySgr, paletteColor, parseAnsi, stripAnsi } from './ansi.js'

const ESC = '\x1b'

describe('parseAnsi', () => {
  test('leaves plain text as one plain run', () => {
    expect(parseAnsi('Compiling 214 modules').runs).toEqual([{ text: 'Compiling 214 modules' }])
  })

  test('names the sixteen colors the stylesheet draws', () => {
    const { runs } = parseAnsi(`${ESC}[31mfailed${ESC}[0m and ${ESC}[92mpassed${ESC}[39m`)
    expect(runs).toEqual([
      { color: 'red', text: 'failed' },
      { text: ' and ' },
      { color: 'bright-green', text: 'passed' },
    ])
  })

  test('reads weight, slant, lines and backgrounds, and turns each off again', () => {
    const { runs } = parseAnsi(`${ESC}[1;3;4;9;44mA${ESC}[22;23;24;29;49mB`)
    expect(runs).toEqual([
      {
        background: 'blue',
        bold: true,
        italic: true,
        strike: true,
        text: 'A',
        underline: true,
      },
      { text: 'B' },
    ])
  })

  test('draws a 256-color index and a 24-bit color as the color itself', () => {
    const { runs } = parseAnsi(`${ESC}[38;5;196mred${ESC}[48;2;10;20;30mon`)
    expect(runs[0]).toEqual({ color: 'rgb(255 0 0)', text: 'red' })
    expect(runs[1]).toEqual({ background: 'rgb(10 20 30)', color: 'rgb(255 0 0)', text: 'on' })
  })

  test('takes the colon form of an extended color, as some programs write it', () => {
    expect(parseAnsi(`${ESC}[38:5:2mok`).runs).toEqual([{ color: 'green', text: 'ok' }])
  })

  test('drops every sequence that is not a color, and one cut off at the end', () => {
    const text = `${ESC}[2K${ESC}[1Gdone${ESC}]0;title\x07!${ESC}[3`
    expect(parseAnsi(text).runs).toEqual([{ text: 'done!' }])
  })

  test('carries the style a line ends in to the next', () => {
    const first = parseAnsi(`${ESC}[33mwarning: spans`)
    const second = parseAnsi('two lines', first.style)
    expect(second.runs).toEqual([{ color: 'yellow', text: 'two lines' }])
  })

  test('merges a reset to the same style into one run', () => {
    expect(parseAnsi(`a${ESC}[0mb${ESC}[mc`).runs).toEqual([{ text: 'abc' }])
  })
})

describe('applySgr', () => {
  test('reads a bare reset as a reset', () => {
    expect(applySgr({ bold: true, color: 'red' }, [])).toEqual({})
  })

  test('ignores a code it does not know', () => {
    expect(applySgr({}, [5, 53])).toEqual({})
  })
})

describe('paletteColor', () => {
  test('names the first sixteen, and works out the cube and the grays', () => {
    expect(paletteColor(1)).toBe('red')
    expect(paletteColor(16)).toBe('rgb(0 0 0)')
    expect(paletteColor(231)).toBe('rgb(255 255 255)')
    expect(paletteColor(232)).toBe('rgb(8 8 8)')
    expect(paletteColor(255)).toBe('rgb(238 238 238)')
    expect(paletteColor(256)).toBeUndefined()
  })
})

describe('stripAnsi', () => {
  test('returns the text a reader sees', () => {
    expect(stripAnsi(`${ESC}[1m${ESC}[32m✓${ESC}[0m 12 passed`)).toBe('✓ 12 passed')
  })
})
