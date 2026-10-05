import { describe, expect, test } from 'bun:test'
import { beyondWindow } from './reveal.js'

const box = (left: number, top: number, right: number, bottom: number) => ({
  bottom,
  left,
  right,
  top,
})

describe('a box past the window', () => {
  test('inside the window is not', () => {
    expect(beyondWindow(box(0, 0, 320, 600), 320, 600)).toBe(false)
  })

  test('a pixel over, from rounding, is not', () => {
    expect(beyondWindow(box(-0.5, 0, 320.5, 600.5), 320, 600)).toBe(false)
  })

  test('past any edge is', () => {
    expect(beyondWindow(box(0, 590, 100, 630), 320, 600)).toBe(true)
    expect(beyondWindow(box(0, -40, 100, -10), 320, 600)).toBe(true)
    expect(beyondWindow(box(300, 0, 360, 40), 320, 600)).toBe(true)
    expect(beyondWindow(box(-60, 0, -20, 40), 320, 600)).toBe(true)
  })
})
