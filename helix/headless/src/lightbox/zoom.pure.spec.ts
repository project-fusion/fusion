import { describe, expect, test } from 'bun:test'
import { between, clampPan, clampScale, spread, zoomAt } from './zoom.js'

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
})
