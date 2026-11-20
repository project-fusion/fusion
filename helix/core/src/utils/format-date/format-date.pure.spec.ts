import { describe, expect, test } from 'bun:test'
import {
  dateExpires,
  formatDateExpires,
  formatDateFuture,
  formatDatePast,
  formatDateShown,
  formatDateSpoken,
  formatDateText,
  readDate,
} from './format-date.js'

const NOW = Date.UTC(2026, 7, 4, 12)

describe('readDate', () => {
  test('writes a date in the options asked for, and a day with no time in UTC', () => {
    expect(
      readDate(
        { date: '2026-03-14T15:09:00.000Z', day: 'numeric', month: 'short', 'time-zone': 'UTC' },
        { language: 'en-US', now: NOW },
      )?.text,
    ).toBe('Mar 14')
    expect(
      readDate({ date: '2026-08-04', 'date-style': 'long' }, { language: 'en-US', now: NOW }),
    ).toEqual({ datetime: '2026-08-04', text: 'August 4, 2026' })
  })

  test('reads how long ago, named in full, with the whole date beside it', () => {
    const drawn = readDate(
      { date: new Date(NOW - 3 * 3_600_000), relative: 'narrow', 'time-zone': 'UTC' },
      { language: 'en-US', now: NOW },
    )
    expect(drawn?.text).toBe('3h ago')
    expect(drawn?.reading?.spoken).toBe('3 hours ago')
    expect(drawn?.reading?.whole).toBe('August 4, 2026 at 9:00 AM')
  })

  test('draws nothing for a date that names no moment', () => {
    expect(readDate({ date: 'soon' }, { language: 'en-US', now: NOW })).toBeUndefined()
    expect(formatDateShown({ date: '' })).toBe(false)
  })
})

describe('the derivations', () => {
  test('read the time of day they are given as `now`', () => {
    const props = { date: NOW + 2 * 86_400_000, locale: 'en-US', now: String(NOW), relative: true }
    expect(formatDateText(props)).toBe('in 2 days')
    expect(formatDateSpoken(props)).toBe('in 2 days')
    expect([formatDatePast(props), formatDateFuture(props)]).toEqual([false, true])
  })

  test('keep no clock for a date, and never wake while frozen', () => {
    expect(formatDateExpires({ date: NOW, now: NOW })).toBeUndefined()
    expect(dateExpires({ date: NOW - 60_000, elapsed: true, frozen: true }, 'en-US', NOW)).toBe(
      Infinity,
    )
    expect(dateExpires({ date: NOW - 90_000, elapsed: true }, 'en-US', NOW)).toBeGreaterThan(0)
  })
})
