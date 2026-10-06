import { describe, expect, test } from 'bun:test'
import type { TemplateResult } from 'lit'
import { drawFields } from './fields.js'

/** The part a drawn field carries, or the text itself where it carries none. */
const named = (drawn: unknown): string =>
  typeof drawn === 'string'
    ? drawn
    : ((drawn as TemplateResult).strings.join('').match(/part="([a-z-]+)"/)?.[1] ?? '?')

const at = new Date('2026-08-04T15:30:05Z')

describe('drawFields', () => {
  test('draws each field in a part named after it, and the text between as it is', () => {
    const parts = new Intl.DateTimeFormat('en-US', {
      day: 'numeric',
      month: 'long',
      timeZone: 'UTC',
      weekday: 'long',
      year: 'numeric',
    }).formatToParts(at)
    expect(drawFields(parts).map(named)).toEqual([
      'weekday',
      ', ',
      'month',
      ' ',
      'day',
      ', ',
      'year',
    ])
  })

  test('names the time fields in the house spelling', () => {
    const parts = new Intl.DateTimeFormat('en-US', {
      era: 'short',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'UTC',
      timeZoneName: 'short',
      year: 'numeric',
    }).formatToParts(at)
    expect(
      drawFields(parts)
        .map(named)
        .filter((name) => /^[a-z-]+$/.test(name)),
    ).toEqual(['year', 'era', 'hour', 'minute', 'second', 'day-period', 'time-zone-name'])
  })

  test('keeps the words a plain format gives', () => {
    const format = new Intl.DateTimeFormat('de-DE', { dateStyle: 'full', timeZone: 'UTC' })
    const drawn = drawFields(format.formatToParts(at))
    const text = drawn
      .map((one) => (typeof one === 'string' ? one : String((one as TemplateResult).values[0])))
      .join('')
    expect(text).toBe(format.format(at))
  })
})
