import { describe, expect, test } from 'bun:test'
import { swatchMove } from './swatches.js'

describe('a key in the presets', () => {
  test('moves along the line of text, either way, and stops at the ends', () => {
    expect(swatchMove('ArrowRight', 1, 0, 4)).toBe(1)
    expect(swatchMove('ArrowLeft', -1, 2, 4)).toBe(1)
    expect(swatchMove('ArrowRight', 1, 3, 4)).toBe(3)
    expect(swatchMove('ArrowLeft', -1, 0, 4)).toBe(0)
  })

  test('takes Up and Down as previous and next, and Home and End to the ends', () => {
    expect(swatchMove('ArrowDown', 0, 1, 4)).toBe(2)
    expect(swatchMove('ArrowUp', 0, 1, 4)).toBe(0)
    expect(swatchMove('Home', 0, 2, 4)).toBe(0)
    expect(swatchMove('End', 0, 0, 4)).toBe(3)
  })

  test('moves nothing for another key, or in an empty row', () => {
    expect(swatchMove('Enter', 0, 1, 4)).toBeNull()
    expect(swatchMove('ArrowDown', 0, 0, 0)).toBeNull()
  })
})
