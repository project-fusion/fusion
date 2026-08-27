import { describe, expect, test } from 'bun:test'
import {
  dateAsValue,
  numberAsValue,
  timeAsValue,
  valueAsDate,
  valueAsNumber,
  valueAsTime,
} from './value-as.js'

/**
 * Six families read a string as a date, a time or a number, and the answers a
 * consumer never sees are the ones worth asserting.
 *
 * The valid cases are a formality. What decides whether these are correct is
 * what they do with half a date, an impossible one, and an empty control, all
 * three of which a reader produces on the way to a value that is fine.
 */
describe('a date value', () => {
  test('is midnight UTC, so the same date is the same date everywhere', () => {
    const date = valueAsDate('2026-08-26')
    expect(date?.toISOString()).toBe('2026-08-26T00:00:00.000Z')
  })

  /* The reason the parts are read back. `Date.UTC(2026, 1, 31)` is 3 March, so
     without this a field holding a date nobody can have would report one that
     exists and a form would submit it. */
  test('is refused where the calendar has no such day, rather than rolled forward', () => {
    expect(valueAsDate('2026-02-31')).toBeNull()
  })

  test('is refused while it is still being typed', () => {
    expect(valueAsDate('2026-08')).toBeNull()
    expect(valueAsDate('2026-08-2')).toBeNull()
    expect(valueAsDate('')).toBeNull()
  })

  test('round-trips, which is what a consumer setting one and reading it back gets', () => {
    expect(dateAsValue(valueAsDate('1970-01-01'))).toBe('1970-01-01')
    expect(dateAsValue(valueAsDate('2026-12-31'))).toBe('2026-12-31')
  })

  test('says nothing rather than guessing, for null and for an unparsed date', () => {
    expect(dateAsValue(null)).toBe('')
    expect(dateAsValue(new Date(Number.NaN))).toBe('')
  })
})

describe('a time value', () => {
  test('sits on the epoch day, which is what makes the number an offset', () => {
    const time = valueAsTime('09:30')
    expect(time?.toISOString()).toBe('1970-01-01T09:30:00.000Z')
    expect(time?.getTime()).toBe(34_200_000)
  })

  test('takes seconds where a step produces them, and writes them back only then', () => {
    expect(valueAsTime('09:30:15')?.toISOString()).toBe('1970-01-01T09:30:15.000Z')
    expect(timeAsValue(valueAsTime('09:30:15'))).toBe('09:30:15')
    expect(timeAsValue(valueAsTime('09:30'))).toBe('09:30')
  })

  /* Matching the pattern is not enough: `25:00` and `09:75` both do. */
  test('is refused where the clock has no such time', () => {
    expect(valueAsTime('25:00')).toBeNull()
    expect(valueAsTime('09:75')).toBeNull()
    expect(valueAsTime('9:30')).toBeNull()
  })

  /* A `Date` carrying a real instant rather than an epoch-day offset, which is
     what a consumer assigning `valueAsDate = new Date()` hands over. */
  test('reads the clock off any date, rather than only off the epoch day', () => {
    expect(timeAsValue(new Date('2026-08-26T14:05:00.000Z'))).toBe('14:05')
  })

  test('says nothing rather than guessing', () => {
    expect(timeAsValue(null)).toBe('')
    expect(timeAsValue(new Date(Number.NaN))).toBe('')
  })
})

describe('a number value', () => {
  /* The trap this exists for: `Number('')` is zero, so an empty control would
     report a number it does not hold and a form would submit it. */
  test('is NaN when the control is empty, and not zero', () => {
    expect(valueAsNumber('')).toBeNaN()
    expect(valueAsNumber('   ')).toBeNaN()
    expect(valueAsNumber('0')).toBe(0)
  })

  test('is NaN for anything that is not a number', () => {
    expect(valueAsNumber('four')).toBeNaN()
  })

  test('takes the shapes a number field produces', () => {
    expect(valueAsNumber('-2.5')).toBe(-2.5)
    expect(valueAsNumber('1e3')).toBe(1000)
  })

  test('writes an empty control back as empty, rather than as the word', () => {
    expect(numberAsValue(Number.NaN)).toBe('')
    expect(numberAsValue(0)).toBe('0')
  })
})
