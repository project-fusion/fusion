import { describe, expect, test } from 'bun:test'
import {
  clockLocale,
  isClockValue,
  isTwelveHour,
  nearestTime,
  offeredTimes,
  secondsAsValue,
  valueAsSeconds,
  wheelParts,
  wholeHour,
  writeClock,
} from './clock.js'

describe('reading and writing a time', () => {
  test('reads both shapes, and nothing out of range', () => {
    expect(valueAsSeconds('09:30')).toBe(34_200)
    expect(valueAsSeconds('09:30:15')).toBe(34_215)
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
  })

  test('writes a time the way the locale does, to the second where asked', () => {
    expect(writeClock('14:05', 'en-US')).toBe('2:05 PM')
    expect(writeClock('14:05:09', 'en-US', true)).toBe('2:05:09 PM')
    expect(writeClock('14:05', 'en-GB')).toBe('14:05')
    expect(writeClock('half past', 'en-US')).toBe('half past')
  })
})

describe('the clock a locale writes on', () => {
  test('is the locale’s own unless a cycle is given', () => {
    expect(clockLocale('en-US')).toBe('en-US')
    expect(isTwelveHour(clockLocale('en-US', 'h23'))).toBe(false)
    expect(isTwelveHour(clockLocale('en-GB', 'h12'))).toBe(true)
    expect(writeClock('14:05', clockLocale('en-US', 'h23'))).toBe('14:05')
  })
})

describe('the times on offer', () => {
  test('step from min, in minutes or in seconds', () => {
    expect(offeredTimes('09:00', '10:00', 20).map((at) => secondsAsValue(at))).toEqual([
      '09:00',
      '09:20',
      '09:40',
      '10:00',
    ])
    expect(
      offeredTimes('09:00:00', '09:00:45', 15, true).map((at) => secondsAsValue(at, true)),
    ).toEqual(['09:00:00', '09:00:15', '09:00:30', '09:00:45'])
  })

  test('the nearest one wins, the earlier on a tie', () => {
    expect(nearestTime([0, 600, 1200], 300)).toBe(0)
    expect(nearestTime([0, 600, 1200], 301)).toBe(600)
    expect(nearestTime([], 42)).toBe(42)
  })
})

describe('the wheels', () => {
  test('split a time into what each wheel shows', () => {
    expect(wheelParts(13 * 3600 + 5 * 60 + 9, true)).toEqual({
      hour: 13,
      meridiem: 'PM',
      minute: 5,
      second: 9,
      shown: 1,
    })
    expect(wheelParts(0, true).shown).toBe(12)
    expect(wheelParts(0, false).shown).toBe(0)
  })

  test('put an hour back together with its half of the day', () => {
    expect(wholeHour(12, 'AM')).toBe(0)
    expect(wholeHour(12, 'PM')).toBe(12)
    expect(wholeHour(1, 'PM')).toBe(13)
    expect(wholeHour(17)).toBe(17)
  })
})
