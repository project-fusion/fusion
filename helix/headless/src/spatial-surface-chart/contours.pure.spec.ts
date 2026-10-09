import { describe, expect, test } from 'bun:test'
import { contourLevels, contoursOf, surfaceOf } from './grid.js'

/* A grid of three by three, with `heights` across first. */
const field = (heights: number[]) =>
  surfaceOf(
    heights.map((value, at) => ({
      cells: [
        { name: 'X', text: '', value: Math.floor(at / 3) },
        { name: 'Z', text: '', value: at % 3 },
        { name: 'Y', text: '', value },
      ],
      label: `${at}`,
    })),
    [0, 1, 2],
  )

describe('contours', () => {
  test('a slope is crossed by a straight line where the level falls on it', () => {
    /* Rising across, from 0 to 20: the level 10 runs down the middle. */
    const [line] = contoursOf(field([0, 0, 0, 10, 10, 10, 20, 20, 20]), [5])
    expect(line?.segments).toHaveLength(2)
    for (const segment of line?.segments ?? []) {
      expect(segment[0][0]).toBeCloseTo(0.5)
      expect(segment[1][0]).toBeCloseTo(0.5)
    }
  })

  test('a peak is ringed, and a level above it draws nothing', () => {
    const peak = field([0, 0, 0, 0, 40, 0, 0, 0, 0])
    const [ring, above] = contoursOf(peak, [20, 50])
    expect(ring?.segments).toHaveLength(4)
    expect(above?.segments).toHaveLength(0)
  })

  test('a square missing a reading draws no line through it', () => {
    const rows = [0, 0, 10, 10].map((value, at) => ({
      cells: [
        { name: 'X', text: '', value: Math.floor(at / 2) },
        { name: 'Z', text: '', value: at % 2 },
        { name: 'Y', text: '', value },
      ],
      label: `${at}`,
    }))
    const whole = surfaceOf(rows, [0, 1, 2])
    expect(contoursOf(whole, [5])[0]?.segments).toHaveLength(1)
    const holed = surfaceOf(rows.slice(0, 3), [0, 1, 2])
    expect(contoursOf(holed, [5])[0]?.segments).toHaveLength(0)
  })

  test('the levels are the height ticks strictly inside the readings', () => {
    const levels = contourLevels(field([0, 0, 0, 10, 10, 10, 20, 20, 20]))
    expect(levels.length).toBeGreaterThan(0)
    expect(Math.min(...levels)).toBeGreaterThan(0)
    expect(Math.max(...levels)).toBeLessThan(20)
  })
})
