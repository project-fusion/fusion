import { describe, expect, test } from 'bun:test'
import { snapBox, snapTo, stepTo } from './snap.js'

describe('snapTo', () => {
  test('lands on the nearest multiple of the step', () => {
    expect(snapTo(47, 32)).toBe(32)
    expect(snapTo(49, 32)).toBe(64)
    expect(snapTo(-20, 32)).toBe(-32)
  })

  test('leaves the value as it is without a step, or with none worth having', () => {
    expect(snapTo(47, undefined)).toBe(47)
    expect(snapTo(47, 0)).toBe(47)
    expect(snapTo(47, -8)).toBe(47)
    expect(snapTo(47, Number.NaN)).toBe(47)
  })
})

describe('stepTo', () => {
  test('goes from between two lines to the one ahead, either way', () => {
    expect(stepTo(40, 1, 32)).toBe(64)
    expect(stepTo(40, -1, 32)).toBe(32)
  })

  test('goes a whole step from a line, so every press moves', () => {
    expect(stepTo(64, 1, 32)).toBe(96)
    expect(stepTo(64, -1, 32)).toBe(32)
    expect(stepTo(0, -1, 32)).toBe(-32)
  })

  test('takes a value a hair off a line as on it', () => {
    expect(stepTo(0.1 + 0.2 - 0.3 + 32, 1, 32)).toBe(64)
  })

  test('stays where it is without a way', () => {
    expect(stepTo(40, 0, 32)).toBe(40)
  })
})

describe('snapBox', () => {
  const start = { height: 64, width: 96, x: 32, y: 32 }
  const least = { height: 32, width: 48 }

  test('snaps only the edges the corner moves', () => {
    expect(
      snapBox({ height: 70, width: 110, x: 32, y: 32 }, start, 'bottom-right', 32, least),
    ).toEqual({
      height: 64,
      width: 96,
      x: 32,
      y: 32,
    })
    expect(snapBox({ height: 80, width: 120, x: 8, y: 16 }, start, 'top-left', 32, least)).toEqual({
      height: 64,
      width: 128,
      x: 0,
      y: 32,
    })
  })

  test('holds the least size where the nearest line is inside it', () => {
    /* The right edge at 98 lands on 96, which would leave a card 46 wide. */
    const from = { height: 64, width: 96, x: 50, y: 50 }
    expect(
      snapBox({ height: 32, width: 48, x: 50, y: 50 }, from, 'bottom-right', 32, least),
    ).toEqual({
      height: 46,
      width: 48,
      x: 50,
      y: 50,
    })
  })

  test('is the box as it was without a step', () => {
    const box = { height: 70, width: 110, x: 32, y: 32 }
    expect(snapBox(box, start, 'bottom-right', undefined, least)).toBe(box)
  })
})
