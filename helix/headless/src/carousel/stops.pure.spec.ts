import { describe, expect, test } from 'bun:test'
import { stepStop, stopFor, stopsOf } from './stops.js'

describe('stopsOf', () => {
  test('stops at every position one slide at a time', () => {
    expect(stopsOf(5)).toEqual([0, 1, 2, 3, 4])
  })

  test('stops at every perMove-th position, and at the last', () => {
    expect(stopsOf(7, 3)).toEqual([0, 3, 6])
    expect(stopsOf(8, 3)).toEqual([0, 3, 6, 7])
    expect(stopsOf(1, 3)).toEqual([0])
  })

  test('reads a fraction, a zero or nothing at all as one or more whole slides', () => {
    expect(stopsOf(4, 2.7)).toEqual([0, 2, 3])
    expect(stopsOf(3, 0)).toEqual([0, 1, 2])
    expect(stopsOf(3, Number.NaN)).toEqual([0, 1, 2])
  })
})

describe('stopFor', () => {
  test('is the last stop at or before a position', () => {
    expect(stopFor([0, 3, 6, 7], 0)).toBe(0)
    expect(stopFor([0, 3, 6, 7], 4)).toBe(1)
    expect(stopFor([0, 3, 6, 7], 7)).toBe(3)
  })
})

describe('stepStop', () => {
  const stops = [0, 3, 6, 7]

  test('moves one stop forward and back', () => {
    expect(stepStop(stops, 0, 1, false)).toBe(3)
    expect(stepStop(stops, 6, 1, false)).toBe(7)
    expect(stepStop(stops, 7, -1, false)).toBe(6)
  })

  test('goes back to the stop before a position between stops, and forward past it', () => {
    expect(stepStop(stops, 4, -1, false)).toBe(3)
    expect(stepStop(stops, 4, 1, false)).toBe(6)
  })

  test('wraps with loop and holds at the ends without', () => {
    expect(stepStop(stops, 7, 1, true)).toBe(0)
    expect(stepStop(stops, 0, -1, true)).toBe(7)
    expect(stepStop(stops, 7, 1, false)).toBe(7)
    expect(stepStop(stops, 0, -1, false)).toBe(0)
  })
})
