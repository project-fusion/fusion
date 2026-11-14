import { describe, expect, it } from 'bun:test'
import { committedValue, pickerDisplay } from './picker-text.js'
import { committedTimes, exampleTime, timeFieldFault, timeKind, writtenTime } from './time-text.js'

const words = {
  bad: () => 'bad',
  length: 'length',
  over: () => 'over',
  unavailable: 'unavailable',
  under: () => 'under',
}
const rules = { disableTimes: '12:00', max: '17:00', min: '09:00' }

describe('time text', () => {
  it('writes a time on the clock asked for, and the value itself as iso', () => {
    expect(writtenTime('14:30', 'local', 'en-US', 'h23', false)).toBe('14:30')
    expect(writtenTime('14:30', 'iso', 'en-US', 'h12', false)).toBe('14:30')
    expect(writtenTime('14:3', 'local', 'en-US', 'h12', false)).toBe('14:3')
  })

  it('reads a time back as a reader writes one', () => {
    const kind = timeKind('local', 'en-US', undefined, false)
    expect(kind.read('2:30 PM')).toBe('14:30')
    expect(kind.read('14:30')).toBe('14:30')
    expect(kind.whole('14:30:15')).toBe(false)
    expect(timeKind('local', 'en-US', undefined, true).whole('14:30:15')).toBe(true)
  })

  it('reads each end of a committed range', () => {
    const kind = timeKind('local', 'en-US', undefined, false)
    expect(committedTimes('9:00 AM – 5:00 PM')).toEqual(['9:00 AM', '5:00 PM'])
    expect(committedValue(committedTimes('9:00 AM – 5:00 PM'), kind)).toBe('09:00,17:00')
  })

  it('shows a range with a dash while nobody is in it', () => {
    const kind = timeKind('local', 'en-US', 'h23', false)
    expect(
      pickerDisplay(
        { draft: '', editing: false, iso: false, mode: 'range', value: '09:00,17:00' },
        kind,
      ),
    ).toBe('09:00 – 17:00')
  })

  it('finds the first fault across every time, in the order the messages take', () => {
    expect(timeFieldFault('single', '', rules, false, words)).toBe('')
    expect(timeFieldFault('single', '2:3', rules, false, words)).toBe('bad')
    expect(timeFieldFault('range', '18:00,08:00', rules, false, words)).toEqual([
      'rangeUnderflow',
      'under',
    ])
    expect(timeFieldFault('single', '18:00', rules, false, words)).toEqual([
      'rangeOverflow',
      'over',
    ])
    expect(timeFieldFault('single', '12:00', rules, false, words)).toBe('unavailable')
    expect(timeFieldFault('range', '09:00,10:00,11:00', rules, false, words)).toBe('length')
  })

  it('names an example to the minute, or to the second', () => {
    expect(exampleTime(false)).toBe('14:30')
    expect(exampleTime(true)).toBe('14:30:15')
  })
})
