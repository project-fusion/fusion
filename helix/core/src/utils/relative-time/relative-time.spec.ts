import { describe, expect, test } from 'bun:test'
import { relativeTime } from './relative-time.js'

/**
 * The reading, and the moment it stops being true.
 *
 * **`next` is what most of these are about**, because it is the half that is
 * easy to leave out and impossible to notice missing: a feed with a wrong `next`
 * looks perfect on load and describes page-load time an hour later. Nothing
 * about the rendered text says so.
 *
 * `now` is passed in rather than read from the clock, which is what makes any of
 * this assertable without waiting.
 */

const read = relativeTime('en')
const at = (ms: number) => new Date(1_700_000_000_000 + ms)
const now = at(0)

describe('the reading', () => {
  test('under a minute is "now" rather than a count of seconds', () => {
    expect(read(at(-3000), now).text).toBe(read(at(-40_000), now).text)
    expect(read(at(-3000), now).text).toContain('now')
  })

  test('minutes, hours and days each read as themselves', () => {
    expect(read(at(-120_000), now).text).toBe('2 minutes ago')
    expect(read(at(-7_200_000), now).text).toBe('2 hours ago')
    expect(read(at(-172_800_000), now).text).toBe('2 days ago')
  })

  /** `numeric: 'auto'` is what makes this "yesterday" and not "1 day ago". */
  test('one day ago is what a reader would say', () => {
    expect(read(at(-86_400_000), now).text).toBe('yesterday')
  })

  test('a future timestamp reads as the future rather than as a negative past', () => {
    expect(read(at(120_000), now).text).toBe('in 2 minutes')
  })

  test('an invalid date reads as nothing rather than as "Invalid Date"', () => {
    expect(read(new Date('nonsense'), now).text).toBe('')
  })
})

describe('when it stops being true', () => {
  test('a fresh item turns over when the minute does, not sixty seconds from now', () => {
    expect(read(at(-50_000), now).next).toBe(10_000)
  })

  /**
   * The off-by-one that matters: an item at 90 seconds is "1 minute ago" for
   * another 30 seconds, not another 60. Scheduled on the whole unit, every item
   * in a feed drifts by up to one unit and stays wrong until the next tick.
   */
  test('the wait is the rest of the current unit, not the whole of one', () => {
    expect(read(at(-90_000), now).next).toBe(30_000)
    expect(read(at(-5_400_000), now).next).toBe(1_800_000)
  })

  /**
   * A timer set for a year is really "never" wearing a number, and a browser
   * cannot hold one anyway: `setTimeout` overflows past 2^31 ms and fires
   * immediately, which turns "update in a year" into a busy loop.
   */
  test('the wait is capped at an hour, however old the item is', () => {
    expect(read(at(-31_557_600_000 * 3), now).next).toBe(3_600_000)
  })

  test('the wait is floored at a second, so nobody is handed a zero', () => {
    expect(read(at(-60_000), now).next).toBeGreaterThanOrEqual(1000)
  })

  test('an invalid date never needs another look', () => {
    expect(read(new Date('nonsense'), now).next).toBe(Number.POSITIVE_INFINITY)
  })
})

describe('the cache', () => {
  test('the same locale gives the same formatter, which is what a feed of fifty needs', () => {
    expect(relativeTime('en')).not.toBe(relativeTime('fr'))
    expect(read(at(-120_000), now).text).toBe(relativeTime('en')(at(-120_000), now).text)
  })
})
