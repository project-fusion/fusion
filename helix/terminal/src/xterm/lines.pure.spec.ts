import { describe, expect, test } from 'bun:test'
import { linesOf } from './lines.js'

describe('a buffer read as lines', () => {
  test('joins a row that wraps to the one above it', () => {
    expect(
      linesOf([
        { text: '$ echo a long', wrapped: false },
        { text: ' line', wrapped: true },
        { text: 'a long line', wrapped: false },
      ]),
    ).toBe('$ echo a long line\na long line')
  })

  test('drops the empty rows under the last line, and keeps the empty lines between', () => {
    expect(
      linesOf([
        { text: 'one', wrapped: false },
        { text: '', wrapped: false },
        { text: 'two', wrapped: false },
        { text: '', wrapped: false },
        { text: '', wrapped: false },
      ]),
    ).toBe('one\n\ntwo')
  })

  test('is empty for a screen nothing was written to', () => {
    expect(linesOf([{ text: '', wrapped: false }])).toBe('')
    expect(linesOf([])).toBe('')
  })
})
