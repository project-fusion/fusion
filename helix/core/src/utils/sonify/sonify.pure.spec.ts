import { describe, expect, test } from 'bun:test'
import { HIGH, LOW, panOf, pitchOf, sweepPlan } from './sonify.js'

describe('pitchOf', () => {
  test('spans two octaves from the lowest value to the highest, on a log scale', () => {
    expect(pitchOf(0, 0, 100)).toBe(LOW)
    expect(pitchOf(100, 0, 100)).toBe(HIGH)
    expect(pitchOf(50, 0, 100)).toBeCloseTo(440, 6)
    expect(pitchOf(500, 0, 100)).toBe(HIGH)
    expect(pitchOf(7, 7, 7)).toBeCloseTo(440, 6)
  })
})

describe('panOf', () => {
  test('places the first reading in the left ear and the last in the right', () => {
    expect([panOf(0, 3), panOf(1, 3), panOf(2, 3)]).toEqual([-1, 0, 1])
    expect(panOf(0, 1)).toBe(0)
  })
})

describe('sweepPlan', () => {
  const plan = sweepPlan(
    [
      { name: 'Revenue', values: [0, 50, null, 100] },
      { name: 'Cost', values: [100, 0] },
    ],
    { duration: 3, max: 100, min: 0 },
  )
  const tones = plan.filter((sound) => sound.kind === 'tone')

  test('plays each reading left to right over the duration, and skips a missing one', () => {
    const revenue = tones.filter((sound) => sound.series === 0)
    expect(
      revenue.map((sound) => [
        sound.time,
        Math.round(sound.frequency),
        Number(sound.pan.toFixed(3)),
      ]),
    ).toEqual([
      [0, 220, -1],
      [1, 440, -0.333],
      [3, 880, 1],
    ])
  })

  test('plays the next series after a pause, in its own timbre', () => {
    const cost = tones.filter((sound) => sound.series === 1)
    expect(cost.map((sound) => sound.time)).toEqual([3.4, 6.4])
  })

  test('ticks at each reading’s gridline, and puts everything in time order', () => {
    expect(plan.filter((sound) => sound.kind === 'tick' && sound.series === 0)).toHaveLength(4)
    expect(plan.map((sound) => sound.time)).toEqual(
      [...plan.map((sound) => sound.time)].sort((a, b) => a - b),
    )
  })
})
