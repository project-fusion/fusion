import { describe, expect, test } from 'bun:test'
import { fits, monthPage, overviewOf, toneOf } from './buckets.js'

/**
 * The two calculations a picture cannot check.
 *
 * A threshold comparison off by one boundary colors a handful of cells wrong
 * out of ninety, and a fit calculation off by one drops a day. Neither shows in
 * a screenshot of a strip, which is exactly why they are here rather than left
 * to the visual baseline.
 */

const TONES = ['muted', 'info', 'accent', 'success']
const BOUNDS = [0, 1, 3, 6]

describe('toneOf', () => {
  test('the thresholds are lower bounds, and the last one reached wins', () => {
    expect(toneOf({ value: 0 }, BOUNDS, TONES)).toBe('muted')
    expect(toneOf({ value: 1 }, BOUNDS, TONES)).toBe('info')
    expect(toneOf({ value: 2 }, BOUNDS, TONES)).toBe('info')
    expect(toneOf({ value: 3 }, BOUNDS, TONES)).toBe('accent')
    expect(toneOf({ value: 5 }, BOUNDS, TONES)).toBe('accent')
    expect(toneOf({ value: 6 }, BOUNDS, TONES)).toBe('success')
    expect(toneOf({ value: 900 }, BOUNDS, TONES)).toBe('success')
  })

  /**
   * A value under the first bound gets nothing rather than the lowest bucket. An
   * empty cell in a contribution graph is a day with nothing in it, and painting
   * it as the lowest bucket claims a reading that does not exist.
   */
  test('a value below the first bound gets no tone', () => {
    expect(toneOf({ value: -1 }, BOUNDS, TONES)).toBeUndefined()
  })

  /**
   * The cell's own tone wins, and that ordering is why both exist: a status page
   * already knows a day was degraded and should not have to encode it as a
   * number for the component to decode again.
   */
  test("the cell's own tone beats the thresholds", () => {
    expect(toneOf({ tone: 'danger', value: 900 }, BOUNDS, TONES)).toBe('danger')
  })

  test('with no thresholds at all a cell without a tone gets none', () => {
    expect(toneOf({ value: 4 }, [], [])).toBeUndefined()
    expect(toneOf({ tone: 'success', value: 4 }, [], [])).toBe('success')
  })

  test('fewer tones than bounds keeps the last tone rather than losing the cell', () => {
    expect(toneOf({ value: 900 }, BOUNDS, ['muted', 'info'])).toBe('info')
  })
})

describe('fits', () => {
  /**
   * n cells need n widths and n-1 gaps. Written as `width / (minimum + gap)` the
   * answer is short by one at every size, which reads as the strip having a
   * margin it was never given.
   */
  test('the last cell needs no gap after it', () => {
    expect(fits(90, 100, 8, 2)).toBe(10)
    expect(fits(90, 98, 8, 2)).toBe(10)
    expect(fits(90, 97, 8, 2)).toBe(9)
  })

  test('a wide container shows everything and no more', () => {
    expect(fits(90, 10_000, 8, 2)).toBe(90)
  })

  test('a container too small for one cell still shows one', () => {
    expect(fits(90, 2, 8, 2)).toBe(1)
  })

  /**
   * What crosses the width is a column, so `rows` multiplies the answer. Counted
   * as cells, a ten week graph in a 592px box came back with fifty-nine of
   * seventy readings: eleven days dropped to fit a strip that wanted 156 pixels.
   */
  test('a column is what fits, and rows is how many cells are in one', () => {
    expect(fits(70, 592, 12, 4, 7)).toBe(70)
    expect(fits(70, 100, 12, 4, 7)).toBe(42)
  })

  /**
   * The count is always a whole number of columns, and on a calendar that is
   * what keeps a weekday on its own row: cut to fifty-nine, a seven row strip
   * put Monday's readings on four different rows down the graph and nothing in
   * the picture said so.
   */
  test('the count is a whole number of columns, so the tail stays aligned', () => {
    for (const width of [40, 97, 100, 260, 592]) {
      expect(fits(70, width, 12, 4, 7) % 7).toBe(0)
    }
  })

  test('rows defaults to one, so a strip counts cells', () => {
    expect(fits(90, 100, 8, 2)).toBe(fits(90, 100, 8, 2, 1))
  })

  test('an unmeasured container shows everything, rather than one cell on first paint', () => {
    expect(fits(90, 0, 8, 2)).toBe(90)
    expect(fits(90, Number.NaN, 8, 2)).toBe(90)
  })

  test('no minimum means no dropping', () => {
    expect(fits(90, 100, 0, 2)).toBe(90)
  })
})

describe('what the drawn readings come to', () => {
  test('the busiest by place, the first where several tie, and the total', () => {
    expect(overviewOf([{ value: 3 }, { value: undefined }, { value: 9 }, { value: 9 }])).toEqual({
      busiest: 2,
      total: 21,
    })
  })

  test('no busiest reading among blanks, and nothing in total', () => {
    expect(overviewOf([{ value: undefined }])).toEqual({ busiest: -1, total: 0 })
  })
})

/* PageUp and PageDown moved four weeks in a calendar, where APG's date grid
   moves a month. */
describe('a page of a calendar', () => {
  const days = (from: string, count: number): string[] =>
    Array.from({ length: count }, (_, index) => {
      const date = new Date(`${from}T00:00:00Z`)
      date.setUTCDate(date.getUTCDate() + index)
      return date.toISOString().slice(0, 10)
    })

  test('is the same day a month on, or back', () => {
    const whens = days('2026-01-01', 120)
    expect(whens[monthPage(whens, 14, true) ?? -1]).toBe('2026-02-15')
    expect(whens[monthPage(whens, 45, false) ?? -1]).toBe('2026-01-15')
  })

  test('is the month’s last day where it lacks the day, and stops at the ends', () => {
    const whens = days('2026-01-01', 70)
    expect(whens[monthPage(whens, 30, true) ?? -1]).toBe('2026-02-28')
    expect(monthPage(whens, 60, true)).toBe(69)
    expect(monthPage(whens, 3, false)).toBe(0)
  })

  test('is the nearest reading past a blank day, and nothing without dates', () => {
    const whens: (string | undefined)[] = ['2026-01-10', undefined, '2026-02-12']
    expect(monthPage(whens, 0, true)).toBe(2)
    expect(monthPage(['Mon', 'Tue'], 0, true)).toBeUndefined()
  })
})
