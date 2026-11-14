import { describe, expect, it } from 'bun:test'
import { offeredTimes } from './clock.js'
import {
  timeBetween,
  timeChoice,
  timeProblem,
  wheelHours,
  wheelMinutes,
  wheelTurn,
} from './time-picker.js'

const times = offeredTimes('09:00', '17:00', 30)
const words = {
  bad: () => 'bad',
  missing: 'missing',
  over: () => 'over',
  step: 'step',
  unavailable: 'unavailable',
  under: () => 'under',
}

describe('time picker', () => {
  it('keeps a range in order, and starts it again from a third time', () => {
    expect(timeChoice('10:00,09:00', ['10:00'], 'range', () => false)).toBe('09:00,10:00')
    expect(timeChoice('09:00,10:00,11:00', ['09:00', '10:00'], 'range', () => false)).toBe('11:00')
    expect(timeChoice('12:00', [], undefined, (at) => at === '12:00')).toBeUndefined()
  })

  it('draws the times between a range and the one previewed', () => {
    expect(timeBetween('10:00', ['09:00'], '11:00', 'range')).toBe(true)
    expect(timeBetween('12:00', ['09:00', '11:00'], '', 'range')).toBe(false)
  })

  it('offers each hour once on a twelve hour clock and the minutes within one', () => {
    expect(wheelHours(times, true)).toEqual([1, 2, 3, 4, 5, 9, 10, 11, 12])
    expect(wheelMinutes(times, 9)).toEqual([0, 30])
  })

  it('turns a wheel to the nearest offered time, refusing a barred one', () => {
    const state = {
      disableTimes: '',
      min: '09:00',
      seconds: false,
      times,
      twelve: false,
      value: '09:30',
    }
    expect(wheelTurn('hour', '11', state)).toBe('11:30')
    expect(wheelTurn('hour', '11', { ...state, disableTimes: '11:30' })).toBeUndefined()
  })

  it('says what is wrong with the times held, with the flag a native input sets', () => {
    const state = { disableTimes: '12:00', max: '17:00', min: '09:00', required: true, times }
    expect(timeProblem({ ...state, value: '' }, words)).toEqual(['valueMissing', 'missing'])
    expect(timeProblem({ ...state, value: 'nope' }, words)).toEqual(['badInput', 'bad'])
    expect(timeProblem({ ...state, value: '08:00' }, words)).toEqual(['rangeUnderflow', 'under'])
    expect(timeProblem({ ...state, value: '12:00' }, words)).toEqual(['badInput', 'unavailable'])
    expect(timeProblem({ ...state, value: '10:00' }, words)).toBeUndefined()
  })
})
