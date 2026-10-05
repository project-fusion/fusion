import { describe, expect, test } from 'bun:test'
import { clockLocale } from '../clock/clock.js'
import { writeClock, writeTime } from './write-time.js'

describe('a time written the way the locale writes one', () => {
  test("to the minute, on the locale's own clock", () => {
    expect(writeTime('14:05', 'en-US')).toBe('2:05 PM')
    expect(writeTime('09:00', 'en-GB')).toBe('09:00')
  })

  test('hands back what it cannot read, seconds included, as it is', () => {
    expect(writeTime('half past', 'en-US')).toBe('half past')
    expect(writeTime('14:05:09', 'en-US')).toBe('14:05:09')
  })

  test('to the second where asked, reading either shape', () => {
    expect(writeClock('14:05', 'en-US')).toBe('2:05 PM')
    expect(writeClock('14:05:09', 'en-US')).toBe('2:05 PM')
    expect(writeClock('14:05:09', 'en-US', true)).toBe('2:05:09 PM')
    expect(writeClock('14:05', 'en-GB')).toBe('14:05')
    expect(writeClock('half past', 'en-US')).toBe('half past')
  })

  test('on the clock a locale is given', () => {
    expect(writeClock('14:05', clockLocale('en-US', 'h23'))).toBe('14:05')
  })
})
