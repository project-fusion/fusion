import { describe, expect, test } from 'bun:test'
import { highlightStep } from './highlight-step.js'

describe('where a key moves a highlight', () => {
  test('Down and Up go round', () => {
    expect(highlightStep('ArrowDown', 2, 3, 10)).toBe(0)
    expect(highlightStep('ArrowUp', 0, 3, 10)).toBe(2)
  })

  test('with no highlight, Down starts at the first and Up at the last', () => {
    expect(highlightStep('ArrowDown', -1, 3, 10)).toBe(0)
    expect(highlightStep('ArrowUp', -1, 3, 10)).toBe(2)
  })

  test('Home and End go to the ends', () => {
    expect(highlightStep('Home', 1, 3, 10)).toBe(0)
    expect(highlightStep('End', 1, 3, 10)).toBe(2)
  })

  test('the page keys stop at the ends', () => {
    expect(highlightStep('PageDown', 1, 5, 10)).toBe(4)
    expect(highlightStep('PageUp', 3, 5, 2)).toBe(1)
    expect(highlightStep('PageUp', 1, 5, 2)).toBe(0)
  })

  test('another key moves nothing', () => {
    expect(highlightStep('a', 1, 3, 10)).toBe(1)
  })
})
