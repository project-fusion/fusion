import { afterEach, describe, expect, test } from 'bun:test'
import { numberConverter, timeConverter } from './number-converter.js'

/* Lit's `Number` converter read `page-size="1O"` as `NaN` and `delay="300ms"`
   as `NaN`, and the elements went on with it. A native element reads an
   attribute it cannot parse as absent. */

const number = (value: string | null): unknown =>
  numberConverter('page-size', 10).fromAttribute?.(value, Number)

const time = (value: string | null): unknown =>
  timeConverter('delay', 400).fromAttribute?.(value, Number)

const warn = console.warn
afterEach(() => {
  console.warn = warn
})

/** What the console was told while `during` ran. */
const warned = (during: () => void): string[] => {
  const warnings: string[] = []
  console.warn = (message: string) => warnings.push(message)
  during()
  console.warn = warn
  return warnings
}

describe('a numeric attribute', () => {
  test('takes a finite number as it is written', () => {
    expect([number('25'), number('0'), number('-12.5'), number(' 8 '), number('1e3')]).toEqual([
      25, 0, -12.5, 8, 1000,
    ])
  })

  test('keeps the default for anything that is not one', () => {
    const warnings = warned(() => {
      expect([number('1O'), number('8px'), number(''), number('Infinity')]).toEqual([
        10, 10, 10, 10,
      ])
    })
    expect(warnings).toHaveLength(4)
  })

  test('returns to the default when the attribute is removed', () => {
    expect(number(null)).toBe(10)
    expect(numberConverter('max', undefined).fromAttribute?.(null, Number)).toBeUndefined()
  })

  test('says what it takes, with the unit where there is one', () => {
    const warnings = warned(() => {
      number('2O')
      numberConverter('offset', 8, 'pixels').fromAttribute?.('8px', Number)
      numberConverter('max', undefined).fromAttribute?.('many', Number)
    })
    expect(warnings).toEqual([
      'page-size="2O" is not a number, so `page-size` keeps its default of 10. Write `page-size` as a number.',
      'offset="8px" is not a number, so `offset` keeps its default of 8. Write `offset` as a number of pixels, with no unit after it.',
      'max="many" is not a number, so `max` stays unset. Write `max` as a number.',
    ])
  })

  test('reports one value once, however many elements carry it', () => {
    const warnings = warned(() => {
      number('3O')
      number('3O')
      number('4O')
    })
    expect(warnings).toHaveLength(2)
  })
})

describe('an attribute in milliseconds', () => {
  test('takes a bare number as milliseconds, and a CSS time in seconds or milliseconds', () => {
    expect([time('3s'), time('0.5s'), time('300ms'), time('300'), time('1.1s')]).toEqual([
      3000, 500, 300, 300, 1100,
    ])
  })

  test('reads the units in either case, and whitespace around the value', () => {
    expect([time('2S'), time('250MS'), time(' 0.25s ')]).toEqual([2000, 250, 250])
  })

  test('keeps the default for a space before the unit, a negative time, or no time at all', () => {
    const warnings = warned(() => {
      expect([time('3 s'), time('-1s'), time('-1'), time('abc'), time(''), time('3m')]).toEqual([
        400, 400, 400, 400, 400, 400,
      ])
    })
    expect(warnings).toHaveLength(6)
  })

  test('takes zero', () => {
    expect([time('0'), time('0s'), time('0ms')]).toEqual([0, 0, 0])
  })

  test('says the forms it takes', () => {
    const warnings = warned(() => {
      time('soon')
      timeConverter('duration', undefined).fromAttribute?.('-2s', Number)
    })
    expect(warnings).toEqual([
      'delay="soon" is not a time of zero or more, so `delay` keeps its default of 400. Write `delay` in milliseconds, such as 300, or as a CSS time, such as 300ms or 0.3s.',
      'duration="-2s" is not a time of zero or more, so `duration` stays unset. Write `duration` in milliseconds, such as 300, or as a CSS time, such as 300ms or 0.3s.',
    ])
  })
})
