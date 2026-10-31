import { describe, expect, test } from 'bun:test'
import { gutterNumbers, lineCount, lineRuns, lineSpans } from './lines.js'

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

describe('lineRuns', () => {
  test('reads numbers and ranges, in order, merging runs that touch', () => {
    expect(lineRuns('2, 4-6')).toEqual([
      [2, 2],
      [4, 6],
    ])
    expect(lineRuns('6-4 1 2')).toEqual([
      [1, 2],
      [4, 6],
    ])
    expect(lineRuns('3,4,5')).toEqual([[3, 5]])
  })

  test('passes over what is not a line', () => {
    expect(lineRuns('')).toEqual([])
    expect(lineRuns('a, 0, -2, 3')).toEqual([[3, 3]])
  })
})

describe('lineSpans', () => {
  test('finds where each line starts and ends, the break left out', () => {
    expect(lineSpans('ab\ncd')).toEqual([
      [0, 2],
      [3, 5],
    ])
    expect(lineSpans('ab\r\n\ncd\n')).toEqual([
      [0, 2],
      [4, 4],
      [5, 7],
    ])
    expect(lineSpans('')).toEqual([])
  })
})
