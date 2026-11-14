import { describe, expect, test } from 'bun:test'
import {
  acrossOf,
  fittedAcross,
  nearestOffset,
  paneLength,
  positionsOf,
  stepStop,
  stopFor,
  stopsOf,
} from './stops.js'

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

describe('the track as lengths', () => {
  test('fits as many panes of a least length as the room holds, one at least', () => {
    expect(fittedAcross(660, 16, 200)).toBe(3)
    expect(fittedAcross(100, 16, 200)).toBe(1)
    expect(fittedAcross(100, 0, 0)).toBe(1)
  })

  test('reads a declared count as a whole number, one at least', () => {
    expect(acrossOf(2.5)).toBe(2)
    expect(acrossOf(0)).toBe(1)
    expect(acrossOf('auto')).toBe(1)
    expect(acrossOf(Number.NaN)).toBe(1)
  })

  test('shares the room between panes and the gaps between them', () => {
    expect(paneLength(692, 16, 2)).toBe(338)
    expect(paneLength(0, 16, 3)).toBe(0)
  })

  test('counts the places a window of panes can stand', () => {
    expect(positionsOf(6, 4)).toBe(3)
    expect(positionsOf(2, 4)).toBe(1)
  })

  test('finds the offset nearest where a scroller rests', () => {
    expect(nearestOffset([0, 100, 200], 140)).toBe(1)
    expect(nearestOffset([0, 100, 200], 160)).toBe(2)
    expect(nearestOffset([], 160)).toBe(0)
  })
})
