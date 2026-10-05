import { describe, expect, test } from 'bun:test'
import { wheelName } from './wheel-name.js'

describe('a wheel name', () => {
  test('is the locale’s own word for the field, starting with a capital', () => {
    expect(wheelName('hour', 'en-US')).toBe('Hour')
    expect(wheelName('minute', 'en-US')).toBe('Minute')
    expect(wheelName('second', 'en-US')).toBe('Second')
    expect(wheelName('hour', 'de-DE')).toBe('Stunde')
    expect(wheelName('hour', 'fr-FR')).toBe('Heure')
    expect(wheelName('minute', 'ja-JP')).toBe('分')
  })

  test('calls the half of the day what the locale calls it', () => {
    expect(wheelName('dayPeriod', 'en-US')).toBe('AM/PM')
    expect(wheelName('dayPeriod', 'de-DE')).toBe('Tageshälfte')
  })

  test('falls back to English where the locale cannot be read', () => {
    expect(wheelName('hour', 'not a tag!')).toBe('Hour')
  })
})
