import { describe, expect, test } from 'bun:test'
import { secondsAsValue } from '../value-as/value-as.js'
import { writeClock } from '../write-time/write-time.js'
import {
  clockLocale,
  isTwelveHour,
  nearestTime,
  offeredTimes,
  timeBarred,
  timeFault,
  wheelParts,
  wholeHour,
} from './clock.js'

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

describe('what is wrong with a time', () => {
  const rules = { disableTimes: '12:00, 13:30:00', max: '17:00', min: '09:00' }

  test('a time before min, then past max', () => {
    expect(timeFault('08:59', rules)).toBe('rangeUnderflow')
    expect(timeFault('17:00:01', rules)).toBe('rangeOverflow')
    expect(timeFault('09:00', rules)).toBeNull()
    expect(timeFault('17:00', rules)).toBeNull()
  })

  test('with no bounds, the whole day', () => {
    const open = { disableTimes: '', max: '', min: '' }
    expect(timeFault('00:00', open)).toBeNull()
    expect(timeFault('23:59:59', open)).toBeNull()
  })

  test('a time barred by name, to the minute or the second alike', () => {
    expect(timeFault('12:00:00', rules)).toBe('unavailable')
    expect(timeFault('13:30', rules)).toBe('unavailable')
    expect(timeBarred(12 * 3600, rules.disableTimes)).toBe(true)
    expect(timeBarred(12 * 3600 + 1, rules.disableTimes)).toBe(false)
  })

  test('a time off the times on offer, only where they are given', () => {
    const offered = offeredTimes('09:00', '17:00', 30)
    expect(timeFault('09:15', { ...rules, offered })).toBe('stepMismatch')
    expect(timeFault('09:30', { ...rules, offered })).toBeNull()
    expect(timeFault('09:15', rules)).toBeNull()
  })

  test('the bounds are asked before the name, and the name before the step', () => {
    const offered = offeredTimes('09:00', '17:00', 60)
    expect(timeFault('08:00', { ...rules, disableTimes: '08:00', offered })).toBe('rangeUnderflow')
    expect(timeFault('12:00', { ...rules, offered: [] })).toBe('unavailable')
  })
})
