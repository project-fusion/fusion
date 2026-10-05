import { describe, expect, test } from 'bun:test'
import {
  dateAsValue,
  isClockValue,
  isDateValue,
  isTimeValue,
  minutesAsValue,
  numberAsValue,
  secondsAsValue,
  timeAsValue,
  utcDate,
  valueAsDate,
  valueAsMinutes,
  valueAsNumber,
  valueAsSeconds,
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

  /* The predicate exists because the two families that wrote their own got the
     shape right and the range wrong, in two different ways. */
  test('and the predicate answers the same, which is why it is derived from it', () => {
    expect(isDateValue('2026-02-31')).toBe(false)
    expect(isDateValue('2026-02-28')).toBe(true)
    expect(isDateValue('2024-02-29')).toBe(true)
    expect(isDateValue('2026-02-29')).toBe(false)
    expect(isDateValue('2026-13-01')).toBe(false)
    expect(isDateValue('2026-8-26')).toBe(false)
    expect(isDateValue('')).toBe(false)
  })

  /* `Date.UTC` reads years 0 to 99 as 1900 to 1999. A year segment offers
     year 1 at Home, and a native date input takes it, so the parse does too. */
  test('takes a year below 100 as written, and refuses year 0', () => {
    expect(valueAsDate('0001-08-04')?.getUTCFullYear()).toBe(1)
    expect(dateAsValue(valueAsDate('0001-08-04'))).toBe('0001-08-04')
    expect(isDateValue('0099-02-29')).toBe(false)
    expect(isDateValue('0096-02-29')).toBe(true)
    expect(isDateValue('0000-01-01')).toBe(false)
    expect(utcDate(1, 12, 1).toISOString()).toBe('0002-01-01T00:00:00.000Z')
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

/**
 * The third reading of a time value, which is the one these controls hold.
 *
 * Minute precision, narrower than `valueAsTime` on purpose: `step` here is in
 * minutes and floored at one, so a second that got through would be dropped
 * silently by the conversion below.
 */
describe('a time as minutes since midnight', () => {
  test('reads the clock, which is the coordinate a list of times steps through', () => {
    expect(valueAsMinutes('00:00')).toBe(0)
    expect(valueAsMinutes('09:30')).toBe(570)
    expect(valueAsMinutes('23:59')).toBe(1439)
  })

  test('refuses seconds, which `valueAsTime` takes and nothing here can hold', () => {
    expect(valueAsMinutes('10:30:00')).toBeNull()
    expect(valueAsTime('10:30:00')).not.toBeNull()
  })

  test('refuses a clock that does not exist, and a half-typed one', () => {
    expect(valueAsMinutes('24:00')).toBeNull()
    expect(valueAsMinutes('10:60')).toBeNull()
    expect(valueAsMinutes('9:30')).toBeNull()
    expect(valueAsMinutes('')).toBeNull()
  })

  test('wraps rather than running off the day, which is what an arrow key does', () => {
    expect(minutesAsValue(0)).toBe('00:00')
    expect(minutesAsValue(1439)).toBe('23:59')
    expect(minutesAsValue(1440)).toBe('00:00')
    expect(minutesAsValue(-15)).toBe('23:45')
  })

  test('and the predicate is the conversion, the way the date one is', () => {
    expect(isTimeValue('09:30')).toBe(true)
    expect(isTimeValue('10:30:00')).toBe(false)
    expect(isTimeValue('')).toBe(false)
  })
})

describe('a time to the second', () => {
  test('reads both shapes, and nothing out of range', () => {
    expect(valueAsSeconds('09:30')).toBe(34_200)
    expect(valueAsSeconds('09:30:15')).toBe(34_215)
    expect(valueAsSeconds(' 09:30 ')).toBe(34_200)
    expect(valueAsSeconds('24:00')).toBeNull()
    expect(valueAsSeconds('09:60')).toBeNull()
    expect(valueAsSeconds('9:30')).toBeNull()
  })

  test('holds seconds only where asked', () => {
    expect(isClockValue('09:30')).toBe(true)
    expect(isClockValue('09:30:15')).toBe(false)
    expect(isClockValue('09:30:15', true)).toBe(true)
    expect(isClockValue('09:30', true)).toBe(true)
  })

  test('writes a value, wrapping past midnight', () => {
    expect(secondsAsValue(34_215)).toBe('09:30')
    expect(secondsAsValue(34_215, true)).toBe('09:30:15')
    expect(secondsAsValue(86_400 + 60)).toBe('00:01')
    expect(secondsAsValue(-60)).toBe('23:59')
  })
})
