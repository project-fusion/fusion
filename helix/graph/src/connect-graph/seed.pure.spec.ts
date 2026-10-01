import { describe, expect, test } from 'bun:test'
import { seedPositions } from './seed.js'

describe('seedPositions', () => {
  test('keeps a note’s own position, and says it needs no layout', () => {
    const { positions, unplaced } = seedPositions([{ id: 'a', x: 3, y: 4 }], [])
    expect(positions.get('a')).toEqual({ x: 3, y: 4 })
    expect([...unplaced]).toEqual([])
  })

  test('keeps where the last layout put a note, and says it needs none', () => {
    const { positions, unplaced } = seedPositions(
      [{ id: 'a' }],
      [],
      new Map([['a', { x: 1, y: 2 }]]),
    )
    expect(positions.get('a')).toEqual({ x: 1, y: 2 })
    expect(unplaced.size).toBe(0)
  })

  test('starts a new note beside a placed neighbor', () => {
    const { positions, unplaced } = seedPositions(
      [{ id: 'a', x: 10, y: 10 }, { id: 'b' }],
      [{ source: 'b', target: 'a' }],
    )
    const at = positions.get('b')
    expect(Math.hypot((at?.x ?? 0) - 10, (at?.y ?? 0) - 10)).toBeCloseTo(0.5)
    expect([...unplaced]).toEqual(['b'])
  })

  test('starts the same graph the same way every time, and no two notes on one spot', () => {
    const nodes = Array.from({ length: 50 }, (_, at) => ({ id: `n${at}` }))
    const one = seedPositions(nodes, [])
    const two = seedPositions(nodes, [])
    expect([...one.positions]).toEqual([...two.positions])
    const spots = new Set(
      [...one.positions.values()].map(({ x, y }) => `${x.toFixed(6)},${y.toFixed(6)}`),
    )
    expect(spots.size).toBe(50)
  })
})
