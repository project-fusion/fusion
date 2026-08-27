import { describe, expect, test } from 'bun:test'
import { elapsedTime } from './elapsed-time.js'

/* The compact reading, and the moment it stops being true. Pure, because both
   halves are a function of two dates and nothing else: `now` is a parameter for
   exactly this reason, and a spec that had to wait for a clock could not assert
   the second half at all. */

const now = new Date('2026-08-27T12:00:00Z')
const ago = (ms: number) => new Date(now.getTime() - ms)
const read = (ms: number) => elapsedTime('en-US')(ago(ms), now)

const SECOND = 1000
const MINUTE = 60_000
const HOUR = 3_600_000
const DAY = 86_400_000

describe('the compact reading', () => {
  test('under a minute is a word, not a count of seconds', () => {
    expect(read(30 * SECOND).text).toBe('now')
  })

  test('minutes, hours and days are the narrow unit', () => {
    expect(read(3 * MINUTE).text).toBe('3m')
    expect(read(42 * MINUTE).text).toBe('42m')
    expect(read(3 * HOUR).text).toBe('3h')
    expect(read(DAY).text).toBe('1d')
    expect(read(6 * DAY).text).toBe('6d')
  })

  /**
   * The reason the compact form stops at a week rather than running to years.
   *
   * `Intl.NumberFormat` narrow renders `minute` and `month` identically in
   * en-US, so "3m" would be three minutes here and three months a scroll
   * further down the same feed. Past six days this is a date, which is both
   * shorter and unmistakable.
   */
  test('past a week it is a date, and the year appears once it is not this one', () => {
    expect(read(21 * DAY).text).toBe('Aug 6')
    expect(read(60 * DAY).text).toBe('Jun 28')
    /* 240 days back from an August date is the previous December, so this is
       the year boundary rather than an arbitrary older stamp. */
    expect(read(240 * DAY).text).toBe('Dec 2025')
    expect(read(1200 * DAY).text).toBe('May 2023')
  })

  test('a timestamp that is not one reads as nothing rather than as the epoch', () => {
    expect(elapsedTime('en-US')(new Date('nonsense'), now).text).toBe('')
  })
})

describe('when the reading expires', () => {
  test('it is the rest of the current unit, not a whole one', () => {
    expect(read(90 * SECOND).next).toBe(30 * SECOND)
    expect(read(MINUTE + 10 * SECOND).next).toBe(50 * SECOND)
  })

  test('it never asks to be woken sooner than a second', () => {
    expect(read(2 * MINUTE - 1).next).toBeGreaterThanOrEqual(SECOND)
    expect(read(59_999).next).toBeGreaterThanOrEqual(SECOND)
  })

  test('it never asks to be woken later than an hour, however old', () => {
    expect(read(3 * DAY).next).toBeLessThanOrEqual(HOUR)
  })

  /**
   * The day before the horizon wakes for the horizon, not for the next day.
   *
   * Reading the remainder of the current unit alone, a `6d` item would sleep
   * until it became `7d` and wake to render a unit this never emits.
   */
  test('the last day before the horizon wakes when the horizon arrives', () => {
    const left = read(7 * DAY - 30 * SECOND)
    expect(left.text).toBe('6d')
    expect(left.next).toBe(30 * SECOND)
  })

  /**
   * A date does not change again, and saying so is what lets a feed left open
   * overnight wake for none of its old rows.
   */
  test('a date asks never to be woken', () => {
    expect(read(30 * DAY).next).toBe(Number.POSITIVE_INFINITY)
  })
})
