import { describe, expect, test } from 'bun:test'
import { pressedValue, rowStop } from './selection.js'

describe('what a press leaves selected', () => {
  test('single selects the row alone, and a second press lets it go', () => {
    expect(pressedValue('single', 'a', 'b')).toBe('b')
    expect(pressedValue('single', 'b', 'b')).toBe('')
  })

  test('multiple adds the row, and takes it out again', () => {
    expect(pressedValue('multiple', 'a', 'b')).toBe('a, b')
    expect(pressedValue('multiple', 'a, b', 'a')).toBe('b')
  })

  test('none selects nothing', () => {
    expect(pressedValue('none', 'a', 'b')).toBe('a')
  })
})

describe('Left and Right inside a row', () => {
  test('move from the cell through the controls and back to the cell', () => {
    expect(rowStop(3, 0, 1)).toBe(1)
    expect(rowStop(3, 1, 1)).toBe(2)
    expect(rowStop(3, 2, 1)).toBe(0)
  })

  test('back from the cell reaches the last control', () => {
    expect(rowStop(3, 0, -1)).toBe(2)
    expect(rowStop(3, 2, -1)).toBe(1)
  })

  test('a row with no controls stays on its cell', () => {
    expect(rowStop(1, 0, 1)).toBe(0)
    expect(rowStop(1, 0, -1)).toBe(0)
  })
})
