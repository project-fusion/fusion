import { describe, expect, it } from 'bun:test'
import { segmentLayout } from '../date-segments/date-segments.js'
import {
  segmentRowsOf,
  segmentRowsPartial,
  segmentRowsValue,
} from '../date-segments/segment-rows.js'
import { committedDates, dateFault, dateKind } from './date-text.js'
import {
  committedValue,
  draftKey,
  heldValues,
  pickerAnswers,
  pickerDisplay,
  shownValues,
  typedValue,
  withoutValue,
} from './picker-text.js'

const iso = dateKind('iso', 'en-US', undefined)
const long = dateKind('long', 'en-US', undefined)

describe('picker text', () => {
  it('reads every value a text holds, a spaced dash meaning to', () => {
    expect(heldValues('2026-08-04 – 2026-08-11')).toEqual(['2026-08-04', '2026-08-11'])
    expect(heldValues('2026-08-04,,')).toEqual(['2026-08-04'])
  })

  it('shows the value while edited and the written dates at rest', () => {
    const state = { draft: '', editing: false, iso: false, mode: 'range' as const }
    expect(pickerDisplay({ ...state, value: '2026-08-04,2026-08-11' }, long)).toBe(
      'August 4, 2026 – August 11, 2026',
    )
    expect(pickerDisplay({ ...state, editing: true, value: '2026-08-04,2026-08-11' }, long)).toBe(
      '2026-08-04 – 2026-08-11',
    )
    expect(pickerDisplay({ ...state, draft: 'Aug', mode: 'multiple', value: 'x' }, long)).toBe(
      'Aug',
    )
  })

  it('keeps half-typed text as typed and joins whole values by commas', () => {
    expect(typedValue('2026-08-0', iso)).toBe('2026-08-0')
    expect(typedValue('2026-08-04 - 2026-08-05', iso)).toBe('2026-08-04,2026-08-05')
  })

  it('reads a committed written range back', () => {
    const written = committedDates('range', 'Aug 4, 2026 – Aug 11, 2026')
    expect(committedValue(written, long)).toBe('2026-08-04,2026-08-11')
    expect(committedValue(['2026-08-04'], long)).toBeUndefined()
  })

  it('adds a typed date to several with Enter and takes one back with Backspace', () => {
    expect(draftKey('Enter', { draft: '2026-08-04', sorts: false, value: '' }, iso)).toEqual({
      cleared: true,
      value: '2026-08-04',
    })
    expect(
      draftKey('Backspace', { draft: '', sorts: false, value: '2026-08-04,2026-08-05' }, iso),
    ).toEqual({ cleared: false, value: '2026-08-04' })
    expect(draftKey('a', { draft: '', sorts: false, value: '' }, iso)).toBeUndefined()
  })

  it('caps the tags and counts the rest', () => {
    expect(shownValues('a,b,c', 2)).toEqual({ rest: 1, shown: ['a', 'b'] })
    expect(withoutValue('a,b,c', 'b')).toBe('a,c')
  })

  it('answers with every value of a range, or one empty answer while one is not whole', () => {
    expect(pickerAnswers('range', '2026-08-04,2026-08-1', iso)).toEqual([''])
    expect(pickerAnswers('single', '2026-08-04', iso)).toBeUndefined()
  })
})

describe('date fault', () => {
  const rules = {
    disableDates: '',
    disableDays: '0,6',
    max: '2026-12-31',
    min: '2026-01-01',
    step: 1,
  }
  const words = {
    bad: () => 'bad',
    length: 'length',
    order: (start: string) => `order ${start}`,
    over: (max: string) => `over ${max}`,
    step: 'step',
    unavailable: 'unavailable',
    under: (min: string) => `under ${min}`,
  }

  it('says each fault with the flag a native date input sets', () => {
    expect(dateFault('single', '2026-08-0', rules, words)).toBe('bad')
    expect(dateFault('single', '2025-08-04', rules, words)).toEqual([
      'rangeUnderflow',
      'under 2026-01-01',
    ])
    expect(dateFault('single', '2026-08-08', rules, words)).toBe('unavailable')
    expect(dateFault('range', '2026-08-11,2026-08-04', rules, words)).toEqual([
      'rangeUnderflow',
      'order 2026-08-11',
    ])
    expect(dateFault('single', '2026-08-04', rules, words)).toBe('')
  })
})

describe('segment rows', () => {
  const layout = segmentLayout('date', 'en-US', {})

  it('reads a range into two rows and back', () => {
    const rows = segmentRowsOf('date', '2026-08-04,2026-08-11', 2)
    expect(rows[1]).toEqual({ day: 11, month: 8, year: 2026 })
    expect(segmentRowsValue('date', rows, layout)).toBe('2026-08-04,2026-08-11')
  })

  it('calls a row with some segments set partial', () => {
    expect(segmentRowsPartial('date', [{ month: 8 }], '', layout)).toBe(true)
    expect(segmentRowsPartial('date', [{}], '', layout)).toBe(false)
  })
})
