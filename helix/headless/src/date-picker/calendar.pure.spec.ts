import { describe, expect, test } from 'bun:test'
import {
  addMonths,
  barredBy,
  datesIn,
  localToday,
  monthOf,
  periodMove,
  weekStartOf,
  yearPageOf,
} from './calendar.js'

const day = (iso: string): Date => new Date(`${iso}T00:00:00Z`)
const rules = { disableDates: '', disableDays: '', min: '', step: 1 }

describe('the calendar arithmetic', () => {
  test('a month away is clamped to the end of a short month', () => {
    expect(addMonths(day('2026-01-31'), 1).toISOString().slice(0, 10)).toBe('2026-02-28')
    expect(monthOf(day('2026-08-04'))).toBe('2026-08')
  })

  test('today is the local date', () => {
    expect(localToday(new Date(2026, 7, 4, 23, 30))).toBe('2026-08-04')
  })

  test('a value splits into its dates', () => {
    expect(datesIn(' 2026-08-04, ,2026-08-05 ')).toEqual(['2026-08-04', '2026-08-05'])
  })

  test('a locale starts its week where its week starts, or on Sunday', () => {
    expect(weekStartOf('not a tag')).toBe(0)
    expect([0, 1]).toContain(weekStartOf('en-GB'))
  })
})

describe('barredBy', () => {
  test('names a date the rules list, or a rule refuses', () => {
    expect(barredBy(day('2026-08-04'), { ...rules, disableDates: '2026-08-04' })).toBe('listed')
    expect(barredBy(day('2026-08-09'), { ...rules, disableDays: '0' })).toBe('listed')
    expect(
      barredBy(day('2026-08-13'), { ...rules, isDateUnavailable: (date) => date.endsWith('13') }),
    ).toBe('listed')
    expect(barredBy(day('2026-08-14'), rules)).toBeNull()
  })

  test('a date step skips, counted from min', () => {
    const weekly = { ...rules, min: '2026-08-03', step: 7 }
    expect(barredBy(day('2026-08-10'), weekly)).toBeNull()
    expect(barredBy(day('2026-08-11'), weekly)).toBe('step')
  })
})

describe('the months and years', () => {
  test('a page of years starts at a multiple of twelve', () => {
    expect(yearPageOf(2026)).toBe(2016)
    expect(yearPageOf(2028)).toBe(2028)
  })

  test('the keys move along a row, a row, to its ends, and a page', () => {
    expect(periodMove('ArrowRight', 4, 1)).toBe(1)
    expect(periodMove('ArrowLeft', 4, -1)).toBe(-1)
    expect(periodMove('ArrowDown', 4, 0)).toBe(3)
    expect(periodMove('Home', 4, 0)).toBe(-1)
    expect(periodMove('End', 4, 0)).toBe(1)
    expect(periodMove('PageUp', 4, 0)).toBe(-12)
    expect(periodMove('a', 4, 0)).toBeNull()
  })
})
