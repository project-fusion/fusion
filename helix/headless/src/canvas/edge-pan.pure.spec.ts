import { describe, expect, test } from 'bun:test'
import { EDGE_MOST, EDGE_ZONE, edgeSpeed } from './edge-pan.js'

const rect = { bottom: 300, left: 0, right: 400, top: 0 }

describe('edgeSpeed', () => {
  test('is still away from every edge', () => {
    expect(edgeSpeed({ x: 200, y: 150 }, rect)).toEqual({ x: 0, y: 0 })
    expect(edgeSpeed({ x: EDGE_ZONE + 1, y: 300 - EDGE_ZONE - 1 }, rect)).toEqual({ x: 0, y: 0 })
  })

  test('moves toward the edge the pointer is near, faster the nearer', () => {
    const near = edgeSpeed({ x: 400 - EDGE_ZONE / 2, y: 150 }, rect)
    expect(near).toEqual({ x: EDGE_MOST / 2, y: 0 })
    expect(edgeSpeed({ x: 399, y: 150 }, rect).x).toBeGreaterThan(near.x)
    expect(edgeSpeed({ x: 4, y: 2 }, rect).x).toBeLessThan(0)
    expect(edgeSpeed({ x: 4, y: 2 }, rect).y).toBeLessThan(0)
  })

  test('is at its most at the edge and past it', () => {
    expect(edgeSpeed({ x: 400, y: 150 }, rect)).toEqual({ x: EDGE_MOST, y: 0 })
    expect(edgeSpeed({ x: 900, y: -40 }, rect)).toEqual({ x: EDGE_MOST, y: -EDGE_MOST })
  })

  test('moves a box too small for its zones only once the pointer is past an edge', () => {
    const small = { bottom: 40, left: 0, right: 50, top: 0 }
    expect(edgeSpeed({ x: 45, y: 35 }, small)).toEqual({ x: 0, y: 0 })
    expect(edgeSpeed({ x: 60, y: 35 }, small)).toEqual({ x: EDGE_MOST, y: 0 })
  })
})
