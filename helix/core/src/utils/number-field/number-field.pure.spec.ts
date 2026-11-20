import { describe, expect, test } from 'bun:test'
import {
  decimals,
  formatGrain,
  type NumberField,
  numberFieldClamp,
  numberFieldEnds,
  numberFieldFlaw,
  numberFieldKeyed,
  numberFieldKeypad,
  numberFieldNudge,
  numberFieldOf,
  numberFieldSettle,
  numberFieldShown,
  numberFieldSpoken,
  strideOf,
} from './number-field.js'

const field = (over: Partial<NumberField> = {}): NumberField => ({ locale: 'en-US', ...over })

describe('the grain of a format', () => {
  test('is the smallest amount the format shows', () => {
    expect(formatGrain('en-US', { currency: 'USD', style: 'currency' })).toBe(0.01)
    expect(formatGrain('en-US', { currency: 'JPY', style: 'currency' })).toBe(1)
    expect(formatGrain('en-US', {})).toBe(0.001)
    expect(formatGrain('en-US', { maximumFractionDigits: 1 })).toBe(0.1)
  })

  test('counts a percent a hundred times over', () => {
    expect(formatGrain('en-US', { style: 'percent' })).toBe(0.01)
    expect(formatGrain('en-US', { maximumFractionDigits: 1, style: 'percent' })).toBe(0.001)
  })
})

describe('the stride without a step', () => {
  test('is one percent for a percent and one otherwise', () => {
    expect(strideOf({ style: 'percent' })).toBe(0.01)
    expect(strideOf({ currency: 'USD', style: 'currency' })).toBe(1)
    expect(strideOf(undefined)).toBe(1)
  })
})

describe('the decimal places of a number', () => {
  test('are read off how it is written', () => {
    expect(decimals(0.25)).toBe(2)
    expect(decimals(3)).toBe(0)
    expect(decimals(1e-7)).toBe(7)
  })
})

describe('a number field from its props', () => {
  test('reads numbers and JSON as a platform holds them', () => {
    expect(
      numberFieldOf({ formatOptions: '{"style":"percent"}', max: '10', min: 0, step: 'any' }),
    ).toEqual({
      format: { style: 'percent' },
      largeStep: undefined,
      locale: '',
      max: 10,
      min: 0,
      step: 'any',
    })
  })
})

describe('a step', () => {
  test('lands on the grid counted from min, and holds to the bounds', () => {
    expect(numberFieldClamp(4, field({ min: 1, step: 2 }))).toBe(5)
    expect(numberFieldClamp(0.1 + 0.2, field({ step: 0.1 }))).toBe(0.3)
    expect(numberFieldClamp(150, field({ max: 100 }))).toBe(100)
  })

  test('starts from min where the field is empty', () => {
    expect(numberFieldNudge('', 1, field({ min: 3 }))).toBe('3')
    expect(numberFieldNudge('', 1, field())).toBe('0')
    expect(numberFieldNudge('4', -1, field())).toBe('3')
  })

  test('takes the keys a spinner answers, and leaves Home and End to the caret without bounds', () => {
    const bounded = field({ largeStep: 5, max: 50, min: 0, step: 2 })
    expect(numberFieldKeyed('ArrowUp', '10', bounded)).toBe('12')
    expect(numberFieldKeyed('PageDown', '10', bounded)).toBe('0')
    expect(numberFieldKeyed('End', '10', bounded)).toBe('50')
    expect(numberFieldKeyed('Home', '10', field())).toBeUndefined()
    expect(numberFieldKeyed('a', '10', bounded)).toBeUndefined()
  })
})

describe('what a field shows and settles to', () => {
  test('shows the format while it is not edited', () => {
    const money = field({ format: { currency: 'USD', style: 'currency' } })
    expect(numberFieldShown('1200', false, money)).toBe('$1,200.00')
    expect(numberFieldShown('1200', true, money)).toBe('1200')
    expect(numberFieldShown('12e', false, money)).toBe('12e')
  })

  test('settles a number into range and leaves text that is no number', () => {
    expect(numberFieldSettle('150', field({ max: 100 }))).toBe('100')
    expect(numberFieldSettle('2.7e', field())).toBe('2.7e')
    expect(numberFieldSettle('', field({ min: 1 }))).toBe('')
  })

  test('says where it stands at its ends', () => {
    expect(numberFieldEnds('5', field({ max: 5, min: 0 }))).toEqual({ atMax: true, atMin: false })
    expect(numberFieldEnds('', field({ max: 5, min: 0 }))).toEqual({ atMax: false, atMin: false })
  })

  test('speaks a template or the format, and nothing for a plain number', () => {
    expect(numberFieldSpoken('3', field(), '{value} kilograms')).toBe('3 kilograms')
    expect(numberFieldSpoken('0.25', field({ format: { style: 'percent' } }), '')).toBe('25%')
    expect(numberFieldSpoken('3', field(), '')).toBe('')
  })
})

describe('the keypad a phone offers', () => {
  test('is the full keyboard on an iPhone where the number can be negative', () => {
    expect(numberFieldKeypad('iphone', field())).toBe('text')
    expect(numberFieldKeypad('iphone', field({ min: 0, step: 1 }))).toBe('numeric')
    expect(numberFieldKeypad('iphone', field({ min: 0 }))).toBe('decimal')
    expect(numberFieldKeypad('android', field())).toBe('numeric')
  })
})

describe('what is wrong with the text', () => {
  test('follows the platform order', () => {
    expect(numberFieldFlaw('', field({ min: 1 }))).toBeUndefined()
    expect(numberFieldFlaw('abc', field())).toEqual({ flag: 'badInput' })
    expect(numberFieldFlaw('0', field({ min: 1 }))).toEqual({ flag: 'rangeUnderflow', min: 1 })
    expect(numberFieldFlaw('9', field({ max: 5 }))).toEqual({ flag: 'rangeOverflow', max: 5 })
    expect(numberFieldFlaw('3', field({ step: 2 }))).toEqual({
      above: 4,
      below: 2,
      flag: 'stepMismatch',
    })
  })
})
