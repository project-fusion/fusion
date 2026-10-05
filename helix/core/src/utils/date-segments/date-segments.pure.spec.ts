import { describe, expect, test } from 'bun:test'
import {
  isPartial,
  isTwelveHourLayout,
  type SegmentSlot,
  segmentKey,
  segmentLayout,
  segmentName,
  segmentRange,
  segmentsOf,
  segmentsValue,
  segmentText,
  segmentValueText,
  setSegment,
  stepSegment,
  typeDigit,
} from './date-segments.js'

const kinds = (layout: SegmentSlot[]): string[] =>
  layout.map((slot) => ('kind' in slot ? slot.kind : `[${slot.literal}]`))

describe('the order a locale writes the parts in', () => {
  test('a date', () => {
    expect(kinds(segmentLayout('date', 'en-US'))).toEqual(['month', '[/]', 'day', '[/]', 'year'])
    expect(kinds(segmentLayout('date', 'de-DE'))).toEqual(['day', '[.]', 'month', '[.]', 'year'])
    expect(kinds(segmentLayout('date', 'ja-JP'))[0]).toBe('year')
  })

  test('a time, on the clock asked for', () => {
    const us = segmentLayout('time', 'en-US')
    expect(isTwelveHourLayout(us)).toBe(true)
    expect(kinds(us).filter((one) => !one.startsWith('['))).toEqual(['hour', 'minute', 'dayPeriod'])
    expect(isTwelveHourLayout(segmentLayout('time', 'en-US', { hourCycle: 'h23' }))).toBe(false)
    expect(kinds(segmentLayout('time', 'en-GB', { seconds: true }))).toEqual([
      'hour',
      '[:]',
      'minute',
      '[:]',
      'second',
    ])
  })
})

describe('a segment', () => {
  test('ranges as it is shown, and a day as its month allows', () => {
    expect(segmentRange('hour', {}, true)).toEqual({ max: 12, min: 1 })
    expect(segmentRange('hour', {}, false)).toEqual({ max: 23, min: 0 })
    expect(segmentRange('day', { month: 2, year: 2024 }, false).max).toBe(29)
    expect(segmentRange('day', { month: 2, year: 2026 }, false).max).toBe(28)
  })

  test('steps and wraps, and starts from where a reader looks when empty', () => {
    expect(stepSegment({}, 'month', 1, false).month).toBe(1)
    expect(stepSegment({}, 'month', -1, false).month).toBe(12)
    expect(stepSegment({ month: 12 }, 'month', 1, false).month).toBe(1)
    expect(stepSegment({}, 'year', 1, false, 2026).year).toBe(2026)
    expect(stepSegment({ hour: 23 }, 'hour', 1, false).hour).toBe(0)
  })

  test('on a twelve hour clock, the hour keeps its half of the day', () => {
    const pm = setSegment({ hour: 15 }, 'hour', 9, true)
    expect(pm.hour).toBe(21)
    expect(setSegment(pm, 'dayPeriod', 0, true).hour).toBe(9)
    expect(stepSegment({ hour: 11 }, 'hour', 1, true).hour).toBe(0)
  })

  test('a day is kept inside its month', () => {
    expect(setSegment({ day: 31, month: 1, year: 2026 }, 'month', 2, false).day).toBe(28)
  })
})

describe('typing digits', () => {
  test('a digit that can take another waits for it', () => {
    const one = typeDigit({}, 'month', '', '1', false)
    expect(one).toEqual({ advance: false, segments: { month: 1 }, typed: '1' })
    const twelve = typeDigit(one.segments, 'month', one.typed, '2', false)
    expect(twelve).toEqual({ advance: true, segments: { month: 12 }, typed: '' })
  })

  test('a digit that cannot moves on at once', () => {
    expect(typeDigit({}, 'month', '', '3', false)).toEqual({
      advance: true,
      segments: { month: 3 },
      typed: '',
    })
  })

  test('a digit that would overflow starts the number over', () => {
    expect(typeDigit({ month: 1 }, 'month', '1', '5', false).segments.month).toBe(5)
  })

  test('a leading zero waits for the digit after it', () => {
    const zero = typeDigit({}, 'month', '', '0', false)
    expect(zero.segments.month).toBeUndefined()
    expect(typeDigit(zero.segments, 'month', zero.typed, '8', false).segments.month).toBe(8)
  })
})

describe('the value the segments make', () => {
  const date = segmentLayout('date', 'en-US')
  const time = segmentLayout('time', 'en-GB', { seconds: true })

  test('is whole or empty', () => {
    expect(segmentsValue('date', { day: 4, month: 8, year: 2026 }, date)).toBe('2026-08-04')
    expect(segmentsValue('date', { day: 4, month: 8 }, date)).toBe('')
    expect(segmentsValue('time', { hour: 9, minute: 5, second: 3 }, time)).toBe('09:05:03')
  })

  test('says when it is half made', () => {
    expect(isPartial('date', { month: 8 }, date)).toBe(true)
    expect(isPartial('date', {}, date)).toBe(false)
  })

  test('goes back into segments', () => {
    expect(segmentsOf('date', '2026-08-04')).toEqual({ day: 4, month: 8, year: 2026 })
    expect(segmentsOf('time', '21:30')).toEqual({ dayPeriod: 1, hour: 21, minute: 30 })
    expect(segmentsOf('date', 'soon')).toEqual({})
  })
})

describe('what a segment shows and is called', () => {
  test('a padded number, the locale’s half of the day, or dashes', () => {
    expect(segmentText('month', { month: 8 }, false, 'en-US')).toBe('08')
    expect(segmentText('hour', { hour: 21 }, true, 'en-US')).toBe('9')
    expect(segmentText('dayPeriod', { hour: 21 }, true, 'en-US')).toBe('PM')
    expect(segmentText('year', {}, false, 'en-US')).toBe('––––')
  })

  test('a month is heard with its name, in the locale', () => {
    expect(segmentValueText('month', { month: 8 }, false, 'en-US')).toBe('8 – August')
    expect(segmentValueText('month', { month: 3 }, false, 'de-DE')).toBe('3 – März')
    expect(segmentValueText('day', { day: 4 }, false, 'en-US')).toBe('04')
  })

  test('a name from Intl', () => {
    expect(segmentName('month', 'en-US').toLowerCase()).toBe('month')
    expect(segmentName('month', 'de-DE')).toBe('Monat')
  })
})

describe('what an editing key does to a segment', () => {
  const at = (kind: 'day' | 'dayPeriod' | 'hour' | 'month', segments = {}, typed = '') => ({
    kind,
    locale: 'en-US',
    segments,
    twelve: true,
    typed,
  })

  test('the arrows step and wrap, and Home and End go to the ends', () => {
    expect(segmentKey('ArrowUp', at('month', { month: 12 }))).toEqual({
      advance: false,
      segments: { month: 1 },
      typed: '',
    })
    expect(segmentKey('ArrowDown', at('month', { month: 1 }))?.segments).toEqual({ month: 12 })
    expect(segmentKey('Home', at('day', { day: 9 }))?.segments).toEqual({ day: 1 })
    expect(segmentKey('End', at('day', { day: 9, month: 2, year: 2026 }))?.segments.day).toBe(28)
  })

  test('Backspace and Delete empty it', () => {
    expect(segmentKey('Backspace', at('month', { day: 4, month: 8 }))?.segments).toEqual({ day: 4 })
    expect(segmentKey('Delete', at('month', { month: 8 }))?.segments).toEqual({})
  })

  test('a digit is typed, and says when the segment is full', () => {
    expect(segmentKey('1', at('month'))).toEqual({
      advance: false,
      segments: { month: 1 },
      typed: '1',
    })
    expect(segmentKey('2', at('month', { month: 1 }, '1'))).toEqual({
      advance: true,
      segments: { month: 12 },
      typed: '',
    })
  })

  test('a letter picks the half of the day whose word starts with it', () => {
    expect(segmentKey('p', at('dayPeriod', { hour: 9 }))?.segments).toEqual({
      dayPeriod: 1,
      hour: 21,
    })
    expect(segmentKey('a', at('dayPeriod', { hour: 21 }))?.segments.hour).toBe(9)
    expect(segmentKey('x', at('dayPeriod', { hour: 21 }))).toBeNull()
  })

  test('a digit on the meridiem and any other key edit nothing', () => {
    expect(segmentKey('1', at('dayPeriod'))).toBeNull()
    expect(segmentKey('Enter', at('month'))).toBeNull()
    expect(segmentKey('x', at('month'))).toBeNull()
  })
})
