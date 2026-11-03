import { describe, expect, test } from 'bun:test'
import { valueAsDate as asDate, dateAsValue as fromDate } from '../value-as/value-as.js'
import { monthSystem } from './calendar.js'
import { dateProblem } from './calendar-answer.js'
import {
  calendarAnchor,
  chooseDate,
  type DateRules,
  dayKeyMove,
  drawnRange,
  monthCells,
} from './calendar-grid.js'

const open: DateRules = { disableDates: '', disableDays: '', max: '', min: '', step: 1 }
const day = (iso: string): Date => asDate(iso) as Date
const gregory = monthSystem()

describe('calendar grid', () => {
  test('a month is six weeks from the week its first day stands in', () => {
    const weeks = monthCells({
      anchor: '2026-08-04',
      drawn: null,
      mode: undefined,
      month: day('2026-08-01'),
      rules: open,
      selected: ['2026-08-04'],
      system: gregory,
      today: '2026-08-10',
      weekend: [0, 6],
      weekStart: 0,
    })
    expect(weeks).toHaveLength(6)
    expect(weeks[0]?.[0]?.iso).toBe('2026-07-26')
    expect(weeks[0]?.[0]?.outside).toBe(true)
    const chosen = weeks.flat().find((cell) => cell.iso === '2026-08-04')
    expect(chosen?.selected && chosen.solid && chosen.stop).toBe(true)
    expect(weeks.flat().find((cell) => cell.today)?.iso).toBe('2026-08-10')
  })

  test('a range starts over once it holds two, and multiple toggles', () => {
    expect(chooseDate('range', ['2026-08-10'], '2026-08-04')).toEqual(['2026-08-04', '2026-08-10'])
    expect(chooseDate('range', ['2026-08-04', '2026-08-10'], '2026-08-20')).toEqual(['2026-08-20'])
    expect(chooseDate('multiple', ['2026-08-04'], '2026-08-04')).toEqual([])
    expect(chooseDate(undefined, ['2026-08-04'], '2026-08-05')).toEqual(['2026-08-05'])
  })

  test('a waiting range is drawn to the day it points at', () => {
    expect(drawnRange('range', ['2026-08-10'], '2026-08-04')).toEqual({
      ends: ['2026-08-04', '2026-08-10'],
      preview: true,
    })
    expect(drawnRange('range', ['2026-08-10'], '')).toBeNull()
  })

  test('the keys move by day, week, and month, and Home goes to the week start', () => {
    const from = day('2026-08-05')
    expect(fromDate(dayKeyMove('ArrowDown', from, 0, false, 0, gregory) as Date)).toBe('2026-08-12')
    expect(fromDate(dayKeyMove('Home', from, 0, false, 1, gregory) as Date)).toBe('2026-08-03')
    expect(fromDate(dayKeyMove('PageUp', from, 0, true, 0, gregory) as Date)).toBe('2025-08-05')
    expect(dayKeyMove('Enter', from, 0, false, 0, gregory)).toBeNull()
  })

  test('the tab stop falls to the first day it can stand on', () => {
    const anchor = calendarAnchor({
      focused: '',
      rules: { ...open, min: '2026-03-03' },
      selected: [],
      shown: day('2026-03-01'),
      system: gregory,
      today: '2026-10-05',
    })
    expect(fromDate(anchor)).toBe('2026-03-03')
  })

  test('the answer names its fault and the dates its message writes', () => {
    const rules = { ...open, min: '2026-08-01' }
    expect(dateProblem({ mode: undefined, required: true, rules, selected: [] })?.[0]).toBe(
      'valueMissing',
    )
    expect(
      dateProblem({ mode: undefined, required: false, rules, selected: ['2026-07-01'] }),
    ).toEqual(['rangeUnderflow', 'rangeUnderflowMessage', { min: '2026-08-01' }])
    expect(dateProblem({ mode: 'range', required: false, rules: open, selected: ['x'] })).toEqual([
      'badInput',
      'badInputMessage',
      { mode: 'range' },
    ])
  })
})
