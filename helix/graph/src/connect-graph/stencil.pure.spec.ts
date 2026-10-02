import { describe, expect, test } from 'bun:test'
import type { GraphPoint } from './seed.js'
import { fitToStencil, type GraphStencil } from './stencil.js'

/** A square of notes from 0 to 100 each way, `side` to a row. */
const square = (side: number, prefix = 'n'): Map<string, GraphPoint> => {
  const notes = new Map<string, GraphPoint>()
  for (let row = 0; row < side; row++) {
    for (let column = 0; column < side; column++) {
      notes.set(`${prefix}${row}-${column}`, {
        x: (column / (side - 1)) * 100,
        y: (row / (side - 1)) * 100,
      })
    }
  }
  return notes
}

/* A disc in a box 100 by 100 with a square hole in the middle. The notes
   above fill the same box, so a fitted place reads straight back into the
   stencil's: the same x, and y turned over, since the stencil's points down. */
const holed: GraphStencil = {
  height: 100,
  inside: (x, y) =>
    Math.hypot(x - 50, y - 50) < 50 && !(Math.abs(x - 50) < 10 && Math.abs(y - 50) < 10),
  width: 100,
}
const back = (at: GraphPoint): [number, number] => [at.x, 100 - at.y]

describe('fitToStencil', () => {
  test('puts every note inside the shape, each in a place of its own', () => {
    const fitted = fitToStencil(square(20), holed)
    expect(fitted.size).toBe(400)
    for (const at of fitted.values()) {
      expect(holed.inside(...back(at))).toBe(true)
    }
    expect(new Set([...fitted.values()].map((at) => `${at.x},${at.y}`)).size).toBe(400)
  })

  test('keeps notes the layout put together together', () => {
    const notes = new Map([
      ...[...square(10, 'left')].map(([id, at]) => [id, { x: at.x * 0.4, y: at.y }] as const),
      ...[...square(10, 'right')].map(([id, at]) => [id, { x: 60 + at.x * 0.4, y: at.y }] as const),
    ])
    const fitted = fitToStencil(notes, holed)
    const leftOf = (prefix: string): number =>
      [...fitted].filter(([id]) => id.startsWith(prefix)).filter(([, at]) => at.x < 50).length
    expect(leftOf('left')).toBeGreaterThan(85)
    expect(leftOf('right')).toBeLessThan(15)
  })

  test('puts the same notes in the same places on every load', () => {
    expect([...fitToStencil(square(12), holed)]).toEqual([...fitToStencil(square(12), holed)])
  })

  test('leaves the notes where they were when the shape has no inside', () => {
    const notes = square(4)
    expect(fitToStencil(notes, { height: 10, inside: () => false, width: 10 })).toEqual(notes)
  })
})
