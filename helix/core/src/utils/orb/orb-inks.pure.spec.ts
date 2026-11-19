import { describe, expect, test } from 'bun:test'
import { firstMilliseconds, mixInk, OrbClock, OrbInks } from './orb.js'

const red = [200, 0, 0, 1] as const
const blue = [0, 0, 200, 1] as const
const ground = [255, 255, 255, 1] as const

describe("an orb's two colors", () => {
  test('cross with what is left of a change of state, and land with it', () => {
    const clock = new OrbClock('thinking')
    const inks = new OrbInks()
    expect(inks.cross(red, ground, { alone: 120, left: 0, now: 0, snap: false })[0]).toEqual(red)
    clock.turn('working', 1000)
    const left = clock.left(1000)
    expect(left).toBeGreaterThan(120)
    inks.cross(blue, ground, { alone: 120, left, now: 1000, snap: false })
    /* Past the stylesheet's beat, and inside the shape's span, still on its way. */
    const [ink] = inks.cross(blue, ground, { alone: 120, left: 0, now: 1200, snap: false })
    expect(ink[0]).toBeGreaterThan(20)
    expect(ink[2]).toBeLessThan(180)
    /* Landed with the shape. */
    expect(
      inks.cross(blue, ground, { alone: 120, left: 0, now: 1000 + left, snap: false })[0],
    ).toEqual(blue)
  })

  test('take a change on their own over the stylesheet beat, and snap on a frame nothing follows', () => {
    const inks = new OrbInks()
    inks.cross(red, ground, { alone: 120, left: 0, now: 0, snap: false })
    inks.cross(blue, ground, { alone: 120, left: 0, now: 0, snap: false })
    expect(inks.cross(blue, ground, { alone: 120, left: 0, now: 120, snap: false })[0]).toEqual(
      blue,
    )
    expect(inks.cross(red, ground, { alone: 120, left: 0, now: 130, snap: true })[0]).toEqual(red)
  })

  test('mix weighted by alpha, so a clear end fades the other out and passes through no black', () => {
    expect(mixInk(red, [0, 0, 200, 0], 0.5)).toEqual([200, 0, 0, 0.5])
    expect(mixInk(red, [0, 0, 0, 0], 1)).toEqual([0, 0, 0, 0])
  })

  test("read a transition's first duration as milliseconds", () => {
    expect(firstMilliseconds('0.12s, 1s')).toBe(120)
    expect(firstMilliseconds('80ms')).toBe(80)
    expect(firstMilliseconds('')).toBe(0)
  })
})
