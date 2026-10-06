import { describe, expect, test } from 'bun:test'
import { formatOptions } from './options.js'

const at = new Date('2026-08-04T15:30:00Z')

describe('formatOptions', () => {
  test('carries the fields that were set, and none that were not', () => {
    expect(formatOptions({ month: 'long', year: 'numeric' })).toEqual({
      month: 'long',
      year: 'numeric',
    })
  })

  test('lets a style stand in for the fields, which Intl refuses beside one', () => {
    const options = formatOptions({ dateStyle: 'medium', month: 'long' })
    expect(options).toEqual({ dateStyle: 'medium' })
    expect(() => new Intl.DateTimeFormat('en-US', options)).not.toThrow()
  })

  test('takes an hour cycle with a style or with the fields', () => {
    const styled = formatOptions({ hourCycle: 'h23', timeStyle: 'short' })
    expect(new Intl.DateTimeFormat('en-US', { ...styled, timeZone: 'UTC' }).format(at)).toBe(
      '15:30',
    )
    const fields = formatOptions({
      hour: 'numeric',
      hourCycle: 'h12',
      minute: '2-digit',
    })
    expect(new Intl.DateTimeFormat('en-GB', { ...fields, timeZone: 'UTC' }).format(at)).toBe(
      '3:30 pm',
    )
  })

  test('writes an era where asked', () => {
    const options = formatOptions({ era: 'short', year: 'numeric' }, true)
    expect(new Intl.DateTimeFormat('en-US', options).format(at)).toBe('2026 AD')
  })

  test('reads a day with no time in UTC unless a zone is given', () => {
    expect(formatOptions({}, true).timeZone).toBe('UTC')
    expect(formatOptions({ timeZone: 'Asia/Tokyo' }, true).timeZone).toBe('Asia/Tokyo')
    expect(formatOptions({}).timeZone).toBeUndefined()
  })
})
