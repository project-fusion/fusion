import { describe, expect, test } from 'bun:test'
import {
  bandFor,
  barCount,
  centered,
  DEFAULT_BARS,
  ease,
  envelope,
  MAX_BARS,
  MIN_BARS,
  pinned,
  stillLength,
  unit,
  WAVE_LINES,
  waveAt,
} from './draw.js'

describe('voice level drawing', () => {
  test('the envelope is tallest in the middle and falls off evenly to both ends', () => {
    const count = 24
    const heights = Array.from({ length: count }, (_, at) => envelope(at, count))
    expect(Math.max(...heights)).toBeCloseTo(heights[11] ?? 0, 10)
    expect(heights[11]).toBeGreaterThan(0.99)
    /* Mirrored, so the row reads as one shape. */
    for (let at = 0; at < count / 2; at++) {
      expect(heights[at]).toBeCloseTo(heights[count - 1 - at] ?? 0, 10)
    }
    /* An end bar still moves: about a quarter of the box. */
    expect(heights[0]).toBeGreaterThan(0.25)
    expect(heights[0]).toBeLessThan(0.4)
  })

  test('the middle half of the row takes the stronger color', () => {
    const inner = Array.from({ length: 24 }, (_, at) => centered(at, 24))
    expect(inner.filter(Boolean)).toHaveLength(12)
    expect(inner.slice(0, 6).some(Boolean)).toBe(false)
    expect(inner.slice(6, 18).every(Boolean)).toBe(true)
    expect(inner.slice(18).some(Boolean)).toBe(false)
  })

  test('each bar follows its own band where there is one band per bar', () => {
    const bands = Array.from({ length: 24 }, (_, at) => at / 23)
    for (let at = 0; at < 24; at++) {
      expect(bandFor(bands, 0, at, 24)).toBeCloseTo(at / 23, 10)
    }
  })

  test('bars read between the nearest bands where the counts differ', () => {
    /* Two bands across four bars: the outer bars take a band each and the
       inner ones lie between. */
    const read = [0, 1, 2, 3].map((at) => bandFor([0, 1], 0, at, 4))
    expect(read[0]).toBe(0)
    expect(read[3]).toBe(1)
    expect(read[1]).toBeGreaterThan(0)
    expect(read[2]).toBeLessThan(1)
    expect(read[1]).toBeLessThan(read[2] ?? 0)
  })

  test('a spectrum with no bands draws every bar from the level', () => {
    expect(bandFor([], 0.6, 0, 24)).toBe(0.6)
    expect(bandFor([], 0.6, 23, 24)).toBe(0.6)
  })

  test('readings outside the range are drawn at the nearer end', () => {
    expect(unit(2)).toBe(1)
    expect(unit(-1)).toBe(0)
    expect(unit(Number.NaN)).toBe(0)
    expect(bandFor([3], 0, 0, 24)).toBe(1)
  })

  test('rises fast and falls slower', () => {
    const up = ease(0, 1, 1 / 60)
    const down = 1 - ease(1, 0, 1 / 60)
    expect(up).toBeGreaterThan(down * 2)
    /* Exponential, so two half frames land where one whole frame does. */
    expect(ease(ease(0, 1, 1 / 120), 1, 1 / 120)).toBeCloseTo(up, 10)
  })

  test('easing arrives, so a quiet level settles at rest', () => {
    let shown = 1
    for (let frame = 0; frame < 120; frame++) {
      shown = ease(shown, 0, 1 / 60)
    }
    expect(shown).toBe(0)
  })

  test('the bar count comes from the hook, in range, or the default', () => {
    expect(barCount('24')).toBe(24)
    expect(barCount('12.5')).toBe(12)
    expect(barCount('')).toBe(DEFAULT_BARS)
    expect(barCount('many')).toBe(DEFAULT_BARS)
    expect(barCount('1')).toBe(MIN_BARS)
    expect(barCount('500')).toBe(MAX_BARS)
  })

  test('every wave is pinned to the center line at both ends', () => {
    expect(pinned(0)).toBe(0)
    expect(pinned(1)).toBeCloseTo(0, 10)
    expect(pinned(0.5)).toBe(1)
    for (const line of WAVE_LINES) {
      for (const time of [0, 0.37, 2.5]) {
        expect(waveAt(line, 0, time)).toBeCloseTo(0, 10)
        expect(waveAt(line, 1, time)).toBeCloseTo(0, 10)
      }
    }
  })

  test('the three waves differ in speed, phase, and weight, the main one strongest', () => {
    const speeds = new Set(WAVE_LINES.map((line) => line.speed))
    const phases = new Set(WAVE_LINES.map((line) => line.phase))
    expect(speeds.size).toBe(3)
    expect(phases.size).toBe(3)
    const main = WAVE_LINES.find((line) => line.ink === 'main')
    expect(main?.weight).toBe(Math.max(...WAVE_LINES.map((line) => line.weight)))
    /* Drawn last, so it lies on top. */
    expect(WAVE_LINES.at(-1)).toBe(main)
  })

  test('a wave moves with time', () => {
    const line = WAVE_LINES[0]
    if (!line) {
      throw new Error('There are no wave lines.')
    }
    expect(waveAt(line, 0.4, 0)).not.toBeCloseTo(waveAt(line, 0.4, 0.25), 3)
  })

  test('the still bar is as long as the level, and a dot in silence', () => {
    expect(stillLength(0.5, 100, 3)).toBe(50)
    expect(stillLength(0, 100, 3)).toBe(3)
    expect(stillLength(1, 100, 3)).toBe(100)
  })
})
