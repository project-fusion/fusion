import { describe, expect, test } from 'bun:test'
import {
  between,
  clampPan,
  clampScale,
  doublePressed,
  dragged,
  fromMiddle,
  percentOf,
  pinched,
  spread,
  zoomAt,
} from './zoom.js'

describe('zoom', () => {
  test('a scale stays between the item’s own size and the most it may grow', () => {
    expect(clampScale(0.5, 3)).toBe(1)
    expect(clampScale(2, 3)).toBe(2)
    expect(clampScale(5, 3)).toBe(3)
    expect(clampScale(2, 1)).toBe(1)
  })

  test('a zoomed item moves only as far as keeps its edges outside the viewer', () => {
    expect(clampPan({ x: 500, y: -500 }, 2, 400, 300)).toEqual({ x: 200, y: -150 })
    expect(clampPan({ x: 50, y: 20 }, 2, 400, 300)).toEqual({ x: 50, y: 20 })
    expect(clampPan({ x: 50, y: -20 }, 1, 400, 300)).toEqual({ x: 0, y: 0 })
  })

  test('the point under the finger stays under it', () => {
    const pan = zoomAt({ x: 100, y: -40 }, 1, 2, { x: 0, y: 0 })
    expect(pan).toEqual({ x: -100, y: 40 })
    /* A point on the item at (100, -40) from the middle is drawn at
       pan + scale * point, which is where it was. */
    expect(pan.x + 2 * 100).toBe(100)
    expect(zoomAt({ x: 100, y: -40 }, 2, 1, pan)).toEqual({ x: 0, y: 0 })
  })

  test('two fingers are as far apart as they are, and meet halfway', () => {
    expect(spread({ x: 0, y: 0 }, { x: 30, y: 40 })).toBe(50)
    expect(between({ x: 0, y: 0 }, { x: 30, y: 40 })).toEqual({ x: 15, y: 20 })
  })

  test('two fingers spread from where they met grow the item about that point, and move it with them', () => {
    const from = { at: { x: 100, y: 0 }, pan: { x: 0, y: 0 }, scale: 1, spread: 50 }
    expect(pinched(from, 100, { x: 100, y: 0 }, 3)).toEqual({ pan: { x: -100, y: 0 }, scale: 2 })
    expect(pinched(from, 100, { x: 120, y: 10 }, 3)).toEqual({ pan: { x: -80, y: 10 }, scale: 2 })
    expect(pinched(from, 500, { x: 100, y: 0 }, 3).scale).toBe(3)
  })

  test('one finger moves a zoomed item by as far as it went', () => {
    const from = { at: { x: 10, y: 10 }, pan: { x: 5, y: -5 }, scale: 2, spread: 0 }
    expect(dragged(from, { x: 40, y: 0 })).toEqual({ x: 35, y: -15 })
  })

  test('a double press zooms all the way in about the point, and back out', () => {
    const rest = { pan: { x: 0, y: 0 }, scale: 1 }
    const zoomed = doublePressed(rest, { x: 50, y: -20 }, 3)
    expect(zoomed).toEqual({ pan: { x: -100, y: 40 }, scale: 3 })
    expect(doublePressed(zoomed, { x: 0, y: 0 }, 3)).toEqual(rest)
  })

  test('a point from the top left corner is measured from the middle', () => {
    expect(fromMiddle(300, 50, 400, 300)).toEqual({ x: 100, y: -100 })
  })

  test('a scale is heard as a whole percent', () => {
    expect(percentOf(1)).toBe(100)
    expect(percentOf(1.5)).toBe(150)
    expect(percentOf(2.25)).toBe(225)
    expect(percentOf(1.3333)).toBe(133)
  })
})
