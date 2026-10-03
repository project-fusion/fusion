import { describe, expect, test } from 'bun:test'
import { fieldFromInside, inflate } from './shape-field.js'

/* A disc of radius 40 in a box 100 by 100. */
const disc = fieldFromInside((x, y) => Math.hypot(x - 50, y - 50) < 40, {
  height: 100,
  width: 100,
})

describe('fieldFromInside', () => {
  test('measures how far inside and outside a flat shape a point is', () => {
    expect(disc.depth).toBe(0)
    expect(disc.distance(50, 50)).toBeCloseTo(-40, 0)
    expect(disc.distance(50, 30)).toBeCloseTo(-20, 0)
    expect(disc.distance(50, 5)).toBeCloseTo(5, 0)
    expect(Math.abs(disc.distance(90, 50))).toBeLessThan(1)
  })

  test('measures past the box as well, so nothing out there is inside', () => {
    expect(disc.distance(-20, 50)).toBeGreaterThan(20)
  })

  test('measures a solid in three dimensions', () => {
    const ball = fieldFromInside((x, y, z) => Math.hypot(x - 50, y - 50, z - 50) < 30, {
      depth: 100,
      height: 100,
      width: 100,
    })
    expect(ball.depth).toBe(100)
    /* Exact near the edge, where notes are placed, and a cell short at the
       very middle, where sampling between cells cuts the peak. */
    expect(ball.distance(50, 50, 60)).toBeCloseTo(-20, 0)
    expect(Math.abs(ball.distance(50, 50, 50) + 30)).toBeLessThan(2)
    expect(ball.distance(50, 50, 90)).toBeCloseTo(10, 0)
  })
})

describe('inflate', () => {
  const cushion = inflate(disc, { depth: 40 })

  test('is as thick as asked in the middle, and thin at the edge', () => {
    expect(cushion.depth).toBe(40)
    expect(cushion.distance(50, 50, 20)).toBeLessThan(0)
    expect(cushion.distance(50, 50, 1)).toBeLessThan(0)
    expect(cushion.distance(87, 50, 20)).toBeLessThan(0)
    expect(cushion.distance(87, 50, 4)).toBeGreaterThan(0)
  })

  test('is outside wherever the flat shape is', () => {
    expect(cushion.distance(50, 5, 20)).toBeGreaterThan(0)
  })
})
