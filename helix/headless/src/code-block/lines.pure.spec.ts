import { describe, expect, test } from 'bun:test'
import { gutterNumbers, lineCount } from './lines.js'

describe('lineCount', () => {
  test('counts the lines a block draws, a final break ending the last line', () => {
    expect(lineCount('a')).toBe(1)
    expect(lineCount('a\nb')).toBe(2)
    expect(lineCount('a\nb\n')).toBe(2)
    expect(lineCount('a\n\nb')).toBe(3)
  })

  test('reads a Windows break as one break, and empty code as no lines', () => {
    expect(lineCount('a\r\nb\r\n')).toBe(2)
    expect(lineCount('')).toBe(0)
    expect(lineCount('\n')).toBe(1)
  })
})

describe('gutterNumbers', () => {
  test('writes one number to a line, from one', () => {
    expect(gutterNumbers(3)).toBe('1\n2\n3')
    expect(gutterNumbers(0)).toBe('')
  })
})
