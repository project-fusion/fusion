import { describe, expect, test } from 'bun:test'
import { figureOf, movementOf } from './figure.js'

describe('the movement of a change', () => {
  test('is up above zero, down below it, and neutral at zero', () => {
    expect(movementOf(0.12)).toBe('up')
    expect(movementOf(-3)).toBe('down')
    expect(movementOf(0)).toBe('neutral')
    expect(movementOf(-0)).toBe('neutral')
  })

  test('is nothing for a value that is no number', () => {
    expect(movementOf(undefined)).toBeUndefined()
    expect(movementOf(Number.NaN)).toBeUndefined()
    expect(movementOf(Number.POSITIVE_INFINITY)).toBeUndefined()
  })
})

describe('the figure of a change', () => {
  test('is its size, since the arrow and the word say which way', () => {
    expect(figureOf(-8, 'en-US')).toBe('8')
    expect(figureOf(0.12, 'en-US', { style: 'percent' })).toBe('12%')
    expect(figureOf(-0.084, 'en-US', { maximumFractionDigits: 1, style: 'percent' })).toBe('8.4%')
  })

  test('is written in the locale, with the options a page gives', () => {
    expect(figureOf(-1234.5, 'de-DE')).toBe('1.234,5')
    // A narrow or a plain no-break space, as the runtime's ICU writes it.
    expect(figureOf(0.12, 'fr-FR', { style: 'percent' })).toMatch(/^12[\u00a0\u202f]%$/u)
    expect(figureOf(-42, 'en-US', { currency: 'USD', style: 'currency' })).toBe('$42.00')
  })

  test('keeps its sign when the options ask for one', () => {
    expect(figureOf(-0.08, 'en-US', { signDisplay: 'always', style: 'percent' })).toBe('-8%')
    expect(figureOf(0.08, 'en-US', { signDisplay: 'exceptZero', style: 'percent' })).toBe('+8%')
  })
})
