import { describe, expect, test } from 'bun:test'
import {
  addDays,
  addMonths,
  barredBy,
  localToday,
  monthOf,
  monthOut,
  periodCells,
  periodKey,
  periodMove,
  weekStartOf,
  yearOut,
  yearPageOf,
} from './calendar.js'

const day = (iso: string): Date => new Date(`${iso}T00:00:00Z`)
const rules = { disableDates: '', disableDays: '', min: '', step: 1 }

describe('the calendar arithmetic', () => {
  test('a month away is clamped to the end of a short month', () => {
    expect(addMonths(day('2026-01-31'), 1).toISOString().slice(0, 10)).toBe('2026-02-28')
    expect(monthOf(day('2026-08-04'))).toBe('2026-08')
  })

  test('a year below 100 stays that year as days and months are added', () => {
    expect(monthOf(day('0001-08-04'))).toBe('0001-08')
    expect(addDays(day('0001-08-31'), 1).toISOString().slice(0, 10)).toBe('0001-09-01')
    expect(addMonths(day('0001-12-15'), 1).toISOString().slice(0, 10)).toBe('0002-01-15')
  })

  test('today is the local date', () => {
    expect(localToday(new Date(2026, 7, 4, 23, 30))).toBe('2026-08-04')
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

describe('the months and the years', () => {
  test('a day away crosses a month and a year', () => {
    expect(addDays(day('2026-12-31'), 1).toISOString().slice(0, 10)).toBe('2027-01-01')
    expect(addDays(day('2026-03-01'), -1).toISOString().slice(0, 10)).toBe('2026-02-28')
  })

  test('a month or a year is out only when it lies wholly past a bound', () => {
    expect(monthOut(day('2026-03-01'), '2026-03-31', '')).toBe(false)
    expect(monthOut(day('2026-02-01'), '2026-03-31', '')).toBe(true)
    expect(monthOut(day('2026-09-01'), '', '2026-08-01')).toBe(true)
    expect(monthOut(day('2026-09-01'), '', '')).toBe(false)
    expect(yearOut(2025, '2026-06-01', '')).toBe(true)
    expect(yearOut(2026, '2026-06-01', '2026-06-02')).toBe(false)
    expect(yearOut(2027, '', '2026-12-31')).toBe(true)
  })

  test('the months of a year, with the one shown, this month and the ones out of bounds', () => {
    const cells = periodCells({
      max: '2026-10-15',
      min: '',
      page: 2026,
      shown: day('2026-08-01'),
      today: '2026-05-20',
      view: 'month',
    })
    expect(cells.map((one) => one.at)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    expect(cells.filter((one) => one.chosen).map((one) => one.at)).toEqual([7])
    expect(cells.filter((one) => one.current).map((one) => one.at)).toEqual([4])
    expect(cells.filter((one) => one.out).map((one) => one.at)).toEqual([10, 11])
    expect(monthOf(cells[3]?.first as Date)).toBe('2026-04')
  })

  test('a page of years, from any year on it', () => {
    const cells = periodCells({
      max: '',
      min: '2019-01-01',
      page: 2021,
      shown: day('2020-08-01'),
      today: '2026-05-20',
      view: 'year',
    })
    expect(cells.map((one) => one.at)).toEqual([
      2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026, 2027,
    ])
    expect(cells.filter((one) => one.chosen).map((one) => one.at)).toEqual([2020])
    expect(cells.filter((one) => one.current).map((one) => one.at)).toEqual([2026])
    expect(cells.filter((one) => one.out).map((one) => one.at)).toEqual([2016, 2017, 2018])
  })

  test('a key moves the stop among the months, into the next year and the last', () => {
    expect(periodKey('month', 4, 2026, 'ArrowDown', 0)).toEqual({ focus: 7, pageYear: 2026 })
    expect(periodKey('month', 11, 2026, 'ArrowRight', 1)).toEqual({ focus: 0, pageYear: 2027 })
    expect(periodKey('month', 1, 2026, 'ArrowUp', 0)).toEqual({ focus: 10, pageYear: 2025 })
    expect(periodKey('month', 4, 2026, 'PageDown', 0)).toEqual({ focus: 4, pageYear: 2027 })
    expect(periodKey('month', 4, 2026, 'Enter', 0)).toBeNull()
  })

  test('and among the years, the page following the stop', () => {
    expect(periodKey('year', 2027, 2026, 'ArrowRight', 1)).toEqual({ focus: 2028, pageYear: 2028 })
    expect(periodKey('year', 2019, 2019, 'End', 0)).toEqual({ focus: 2021, pageYear: 2021 })
    expect(periodKey('year', 2021, 2021, 'PageUp', 0)).toEqual({ focus: 2009, pageYear: 2009 })
  })
})
