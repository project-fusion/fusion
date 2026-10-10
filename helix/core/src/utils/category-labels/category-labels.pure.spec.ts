import { describe, expect, test } from 'bun:test'
import {
  type AxisLengths,
  type Category,
  type PlacedLabel,
  placeLabels,
  UNMEASURED_LABELS,
} from './category-labels.js'

/** Categories named by `name`, one a reading. */
const named = (count: number, name: (at: number) => string = (at) => `p${at}`): Category[] =>
  Array.from({ length: count }, (_, at) => ({ label: name(at) }))

/** An axis `length` pixels long whose names are 7 pixels a character, with a 6 pixel gap. */
const axis = (categories: Category[], length: number): AxisLengths => ({
  gap: 6,
  length,
  name: (at) => (categories[at]?.label.length ?? 0) * 7,
})

/**
 * Where each drawn name's text lands, in pixels: centered in its room, as
 * every stylesheet sets it.
 */
const texts = (
  placed: PlacedLabel[],
  lengths: AxisLengths,
): Array<{ at: number; high: number; low: number }> =>
  placed.map(({ at, size, start }) => {
    const middle = ((start + size / 2) / 100) * lengths.length
    const long = lengths.name(at)
    return { at, high: middle + long / 2, low: middle - long / 2 }
  })

/** Whether every two neighboring names leave at least the gap between them, and stay on the axis. */
const apart = (placed: PlacedLabel[], lengths: AxisLengths): boolean =>
  texts(placed, lengths).every(
    (one, place, all) =>
      one.low >= -0.01 &&
      one.high <= lengths.length + 0.01 &&
      (place === 0 || one.low - (all[place - 1]?.high ?? 0) >= lengths.gap - 0.01),
  )

/* One name per reading in a grid of equal columns laid ten thousand names
   over one another across 900 pixels, and built ten thousand elements to
   draw nothing legible. */
describe('the names on a category axis', () => {
  test('are every name where every name fits, each in its own slot', () => {
    const months = named(
      12,
      (at) => 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ')[at] ?? '',
    )
    const placed = placeLabels(months, axis(months, 900))
    expect(placed.map((one) => one.at)).toEqual(months.map((_, at) => at))
    expect(placed[1]).toEqual({ at: 1, size: 8.3333, start: 8.3333 })
  })

  test('never collide at any width, and always keep the first and the last', () => {
    const readings = named(10_000)
    for (const width of [120, 240, 390, 600, 900, 1440, 2560]) {
      const lengths = axis(readings, width)
      const placed = placeLabels(readings, lengths)
      expect(apart(placed, lengths)).toBe(true)
      expect(placed[0]?.at).toBe(0)
      expect(placed.at(-1)?.at).toBe(9999)
    }
  })

  test('are bounded by the length of the axis, whatever the number of readings', () => {
    const counts = [1_000, 10_000, 100_000].map(
      (count) => placeLabels(named(count), axis(named(count), 900)).length,
    )
    for (const one of counts) {
      expect(one).toBeLessThanOrEqual(900 / 6)
    }
  })

  test('are a regular share of plain names, every so many from the first', () => {
    const readings = named(1000)
    const placed = placeLabels(readings, axis(readings, 900))
    const inner = placed.slice(0, -1).map((one) => one.at)
    const step = inner[1] ?? 0
    expect([1, 2, 5, 10, 20, 50, 100, 200, 500]).toContain(step)
    expect(inner.every((at) => at % step === 0)).toBe(true)
  })

  test('cross a round number where the names are numbers in order', () => {
    const years = named(48, (at) => String(1993 + at))
    const placed = placeLabels(years, axis(years, 300))
    const inner = placed.slice(1, -1).map((one) => Number(years[one.at]?.label))
    expect(inner.length).toBeGreaterThan(0)
    expect(inner.every((year) => year % 5 === 0)).toBe(true)
  })

  test('start a period where the readings carry instants', () => {
    /* Two years of days, each named the way a page writes a day. */
    const start = Date.UTC(2025, 0, 3)
    const days = Array.from({ length: 730 }, (_, at): Category => {
      const day = new Date(start + at * 86_400_000)
      return {
        label: day.toLocaleDateString('en', { day: 'numeric', month: 'short', timeZone: 'UTC' }),
        when: day.toISOString().slice(0, 10),
      }
    })
    const placed = placeLabels(days, axis(days, 900))
    const inner = placed.slice(1, -1).map((one) => days[one.at]?.when ?? '')
    expect(inner.length).toBeGreaterThan(2)
    expect(inner.every((when) => when.endsWith('-01'))).toBe(true)
  })

  test('give a name at either end room that keeps it on the axis', () => {
    const readings = named(500, (at) => `Reading number ${at}`)
    const lengths = axis(readings, 600)
    const placed = placeLabels(readings, lengths)
    const [first] = texts(placed, lengths)
    const last = texts(placed, lengths).at(-1)
    expect(first?.low).toBeCloseTo(lengths.gap / 2, 2)
    expect(last?.high).toBeCloseTo(600 - lengths.gap / 2, 2)
  })

  test('share the axis between the first and the last where only they would collide', () => {
    const readings = named(3, (at) => `A very long name ${at}`)
    const placed = placeLabels(readings, axis(readings, 120))
    expect(placed).toEqual([
      { at: 0, size: 50, start: 0 },
      { at: 2, size: 50, start: 50 },
    ])
  })

  test('are every name up to a bound, in its own slot, before the axis is measured', () => {
    expect(placeLabels(named(12)).map((one) => one.at)).toHaveLength(12)
    expect(placeLabels(named(4))[1]).toEqual({ at: 1, size: 25, start: 25 })
    const many = placeLabels(named(10_000))
    expect(many.length).toBeLessThanOrEqual(UNMEASURED_LABELS + 1)
    expect([many[0]?.at, many.at(-1)?.at]).toEqual([0, 9999])
  })

  test('are none for no readings', () => {
    expect(placeLabels([], axis([], 900))).toEqual([])
  })
})
