import { describe, expect, test } from 'bun:test'
import { grownAt, growTime, keysOf, mix, mixAxis } from './readings-motion.js'

describe('mix', () => {
  test('runs from one number to the other, and stops at both ends', () => {
    expect(mix(10, 20, 0)).toBe(10)
    expect(mix(10, 20, 0.25)).toBe(12.5)
    expect(mix(10, 20, 1)).toBe(20)
    expect(mix(10, 20, -1)).toBe(10)
    expect(mix(10, 20, 2)).toBe(20)
  })
})

describe('keysOf', () => {
  test('keys each item by its name, and numbers a name that comes again', () => {
    const keys = keysOf(['Mon', 'Tue', 'Mon', 'Mon'])
    expect(keys[0]).toBe('Mon')
    expect(keys[1]).toBe('Tue')
    expect(new Set(keys).size).toBe(4)
    expect(keysOf(['Mon', 'Mon'])).toEqual([keys[0] as string, keys[2] as string])
  })
})

describe('mixAxis', () => {
  const from = { name: 'Sales', range: [0, 10] as [number, number], ticks: [0, 5, 10] }
  const to = { name: 'Sales', range: [0, 40] as [number, number], ticks: [0, 10, 20, 30, 40] }

  test('moves the range, and keeps only the new ticks inside it', () => {
    const half = mixAxis(from, to, 0.5)
    expect(half.range).toEqual([0, 25])
    expect(half.ticks).toEqual([0, 10, 20])
    expect(half.name).toBe('Sales')
  })

  test('is the new axis itself once it has arrived', () => {
    expect(mixAxis(from, to, 1)).toBe(to)
  })

  test("keeps each tick's word with its tick, and the grid's lines inside the range", () => {
    const names = {
      labels: ['Mon', 'Tue', 'Wed', 'Thu'],
      range: [-0.5, 3.5] as [number, number],
      rules: [-0.5, 0.5, 1.5, 2.5, 3.5],
      ticks: [0, 1, 2, 3],
    }
    const short = { ...names, range: [-0.5, 1.5] as [number, number] }
    const half = mixAxis(short, names, 0.5)
    expect(half.range).toEqual([-0.5, 2.5])
    expect(half.ticks).toEqual([0, 1, 2])
    expect(half.labels).toEqual(['Mon', 'Tue', 'Wed'])
    expect(half.rules).toEqual([-0.5, 0.5, 1.5, 2.5])
  })
})

describe('growing in', () => {
  test('each step starts a little after the one before, and every item ends at its reading', () => {
    expect(grownAt(0, 7, 0)).toBe(0)
    expect(grownAt(0, 7, 500)).toBeGreaterThan(grownAt(3, 7, 500))
    expect(grownAt(6, 7, growTime(7))).toBe(1)
    /* Fast at first, slow to rest, and never past the reading. */
    let last = 0
    for (let at = 0; at <= growTime(7); at += 50) {
      const now = grownAt(2, 7, at)
      expect(now).toBeGreaterThanOrEqual(last)
      expect(now).toBeLessThanOrEqual(1)
      last = now
    }
  })

  test('many steps share the same spread, so a long row takes no longer than a short one', () => {
    expect(growTime(60)).toBe(growTime(7))
    expect(growTime(1)).toBeLessThan(growTime(7))
  })
})
