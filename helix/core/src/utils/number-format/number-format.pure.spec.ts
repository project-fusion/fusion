import { describe, expect, test } from 'bun:test'
import { formatNumber, parseNumber } from './number-format.js'

describe('formatting a number', () => {
  test('writes the locale and the options', () => {
    expect(formatNumber(1234.5, 'en-US')).toBe('1,234.5')
    expect(formatNumber(1234.5, 'de-DE')).toBe('1.234,5')
    expect(formatNumber(0.25, 'en-US', { style: 'percent' })).toBe('25%')
    expect(formatNumber(12, 'en-US', { currency: 'USD', style: 'currency' })).toBe('$12.00')
  })
})

describe('reading a number', () => {
  test('drops the group separators and reads the decimal separator', () => {
    expect(parseNumber('1,234.5', 'en-US')).toBe(1234.5)
    expect(parseNumber('1.234,5', 'de-DE')).toBe(1234.5)
    expect(parseNumber('2,5', 'de-DE')).toBe(2.5)
  })

  test('a group separator out of place is no number', () => {
    expect(parseNumber('1,5', 'en-US')).toBeNull()
    expect(parseNumber('12,34.5', 'en-US')).toBeNull()
    expect(parseNumber('1,234,567', 'en-US')).toBe(1234567)
  })

  test('reads what the options wrote back to the number it stands for', () => {
    expect(parseNumber('25%', 'en-US', { style: 'percent' })).toBe(0.25)
    expect(parseNumber('0.25', 'en-US', { style: 'percent' })).toBe(0.25)
    expect(parseNumber('$1,200.00', 'en-US', { currency: 'USD', style: 'currency' })).toBe(1200)
    expect(parseNumber('12 kg', 'en-US', { style: 'unit', unit: 'kilogram' })).toBe(12)
    /* The plural was read off the sample and the singular was not, so one
       kilogram written out in full was no number. */
    const long = { style: 'unit', unit: 'kilogram', unitDisplay: 'long' } as const
    expect(parseNumber('1 kilogram', 'en-US', long)).toBe(1)
    expect(parseNumber('3 kilograms', 'en-US', long)).toBe(3)
    expect(parseNumber('−3', 'en-US')).toBe(-3)
  })

  test('a point in a locale that groups with one is a decimal point, unless a decimal comma is there', () => {
    expect(parseNumber('2.5', 'de-DE')).toBe(2.5)
    expect(parseNumber('1.234,5', 'de-DE')).toBe(1234.5)
    expect(parseNumber('1.2.3', 'de-DE')).toBeNull()
  })

  test('is nothing for text that is no number', () => {
    for (const text of ['', 'abc', '1.2.3x', '--1']) {
      expect(parseNumber(text, 'en-US')).toBeNull()
    }
  })
})
