import { describe, expect, test } from 'bun:test'
import { EDGE_ZONE, edgeSpeed } from '../../utils/reorder/reorder.js'
import { edgeLines, stopsOf } from './stops.js'

describe('edgeLines', () => {
  test('runs eight lines through each edge zone, from just inside it to the edge', () => {
    const lines = edgeLines(100, 500)
    expect(lines).toHaveLength(16)
    expect(Math.max(...lines.filter((line) => line < 300))).toBe(100 + EDGE_ZONE - EDGE_ZONE / 8)
    expect(Math.min(...lines)).toBe(100)
    expect(Math.max(...lines)).toBe(500)
  })

  test('puts the first line where an edge scroll already moves, so crossing it starts one', () => {
    const first = 100 + EDGE_ZONE - EDGE_ZONE / 8
    expect(edgeSpeed(first - 0.1, 100, 500)).toBeLessThan(0)
    expect(edgeSpeed(500 - EDGE_ZONE + EDGE_ZONE / 8 + 0.1, 100, 500)).toBeGreaterThan(0)
  })

  test('narrows the zones to half a box too short for them, and draws none in a box of no length', () => {
    expect(Math.max(...edgeLines(0, 40).filter((line) => line < 20))).toBe(20 - 20 / 8)
    expect(edgeLines(0, 0)).toEqual([])
  })
})

describe('stopsOf', () => {
  test('tells a pass at each drawn item middle, in order, where nothing scrolls', () => {
    const spans = [{ end: 260, start: 200 }, undefined, { end: 60, start: 0 }]
    expect(stopsOf(spans, null)).toEqual([30, 230])
  })

  test('adds the lines through the edge zones of the box that scrolls', () => {
    const stops = stopsOf([{ end: 260, start: 200 }], { end: 500, start: 100 })
    expect(stops).toHaveLength(17)
    expect(stops).toContain(230)
    expect([...stops].sort((left, right) => left - right)).toEqual(stops)
  })
})
