import { describe, expect, test } from 'bun:test'
import { quarterTurns, turn, unturn, unturnDistance } from './turn.js'

describe('quarter turns', () => {
  test('each right angle is its own count, and a whole turn is none', () => {
    expect([0, 90, 180, 270, 360].map(quarterTurns)).toEqual([0, 1, 2, 3, 0])
  })

  test('a negative rotation turns the other way, and an angle between quarters takes the nearest', () => {
    expect(quarterTurns(-90)).toBe(3)
    expect(quarterTurns(100)).toBe(1)
    expect(quarterTurns(Number.NaN)).toBe(0)
  })
})

describe('a point on a turned picture', () => {
  test('the drawn top left is the device corner turned into it', () => {
    /* A phone turned a quarter clockwise draws its own bottom left corner at
       the drawn top left. */
    expect(unturn({ u: 0, v: 0 }, 1)).toEqual({ u: 0, v: 1 })
    expect(unturn({ u: 0, v: 0 }, 2)).toEqual({ u: 1, v: 1 })
    expect(unturn({ u: 0, v: 0 }, 3)).toEqual({ u: 1, v: 0 })
  })

  test('turning forward and back lands where it started, at every quarter', () => {
    const point = { u: 0.2, v: 0.7 }
    for (const turns of [0, 1, 2, 3]) {
      const back = unturn(turn(point, turns), turns)
      expect(back.u).toBeCloseTo(point.u)
      expect(back.v).toBeCloseTo(point.v)
    }
  })

  test('a distance turns with the picture and keeps no origin', () => {
    /* Down the drawn picture, turned a quarter clockwise, is toward the
       device's right, whose left edge is drawn along the top. */
    const down = unturnDistance({ u: 0, v: 0.5 }, 1)
    expect(down.u).toBeCloseTo(0.5)
    expect(down.v).toBeCloseTo(0)
    const across = unturnDistance({ u: 0.25, v: 0 }, 3)
    expect(across.u).toBeCloseTo(0)
    expect(across.v).toBeCloseTo(0.25)
    expect(unturnDistance({ u: 0.25, v: 0.5 }, 0)).toEqual({ u: 0.25, v: 0.5 })
  })
})
