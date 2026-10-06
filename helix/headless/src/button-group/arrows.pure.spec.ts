import { describe, expect, test } from 'bun:test'
import { arrowTarget } from './arrows.js'

describe('where a key moves focus in a button group', () => {
  test('down and up step along the ring, and wrap at the ends', () => {
    expect(arrowTarget('ArrowDown', 0, 0, 3)).toBe(1)
    expect(arrowTarget('ArrowDown', 0, 2, 3)).toBe(0)
    expect(arrowTarget('ArrowUp', 0, 0, 3)).toBe(2)
  })

  test("left and right step by the line's own step, which a right-to-left page turns", () => {
    expect(arrowTarget('ArrowRight', 1, 1, 3)).toBe(2)
    expect(arrowTarget('ArrowRight', -1, 1, 3)).toBe(0)
    expect(arrowTarget('ArrowLeft', -1, 0, 3)).toBe(2)
  })

  test('home and end go to the ends', () => {
    expect(arrowTarget('Home', 0, 2, 3)).toBe(0)
    expect(arrowTarget('End', 0, 0, 3)).toBe(2)
  })

  test('nothing moves for another key, from outside the buttons, or among none', () => {
    expect(arrowTarget('a', 0, 1, 3)).toBe(-1)
    expect(arrowTarget('ArrowDown', 0, -1, 3)).toBe(-1)
    expect(arrowTarget('End', 0, 0, 0)).toBe(-1)
  })
})
