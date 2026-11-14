import { afterEach, beforeEach, describe, expect, jest, test } from '@jest/globals'

/* `Intl.NumberFormat` as Hermes on iOS writes it, in front of the engine's
   own: it drops `notation` and `signDisplay`, and writes a time in seconds,
   as an iOS 27 simulator wrote "2,520 sec" for 42 minutes. */

const real = Intl.NumberFormat
const descriptor = Object.getOwnPropertyDescriptor(Intl, 'NumberFormat')

/** Seconds in each unit Hermes on iOS writes as seconds. */
const SECONDS: Readonly<Record<string, number>> = { day: 86_400, hour: 3_600, minute: 60 }

/** A formatter that writes as Hermes on iOS does. */
const hermes = function NumberFormat(
  locales?: string | string[],
  options: Intl.NumberFormatOptions = {},
) {
  const { notation: _notation, signDisplay: _signDisplay, ...kept } = options
  const unit = kept.style === 'unit' ? kept.unit : undefined
  const seconds = unit === undefined ? undefined : SECONDS[unit]
  if (seconds === undefined) {
    return new real(locales, kept)
  }
  const inSeconds = new real(locales, { ...kept, unit: 'second', unitDisplay: 'short' })
  return { format: (value: number) => inSeconds.format(value * seconds) }
} as unknown as typeof Intl.NumberFormat
Object.defineProperties(hermes, {
  prototype: { value: real.prototype },
  supportedLocalesOf: { value: real.supportedLocalesOf.bind(real) },
})

beforeEach(() => {
  Object.defineProperty(Intl, 'NumberFormat', { configurable: true, value: hermes, writable: true })
})

afterEach(() => {
  if (descriptor !== undefined) {
    Object.defineProperty(Intl, 'NumberFormat', descriptor)
  }
})

type Core = typeof import('@fusion.dev/helix-core/numbers')

/** Core's formatters, in a registry where the polyfills are installed over the stand-in. */
const installed = (): Core => {
  let core: Core | undefined
  jest.isolateModules(() => {
    ;(require('./intl') as typeof import('./intl')).installIntl()
    core = require('@fusion.dev/helix-core/numbers') as Core
  })
  return core as Core
}

describe('numberSupport', () => {
  test('says which options the engine writes wrongly', () => {
    const { numberSupport } = require('./number-format') as typeof import('./number-format')
    expect(numberSupport()).toEqual({ notation: false, signDisplay: false, units: false })
    Object.defineProperty(Intl, 'NumberFormat', descriptor as PropertyDescriptor)
    expect(numberSupport()).toEqual({ notation: true, signDisplay: true, units: true })
  })
})

describe('installNumberFormat', () => {
  test('writes the units, the compact notation, and the sign in English, as the web does', () => {
    const { formatNumber } = installed()
    /* Format Date's elapsed time, as core's `elapsedTime` asks for it. */
    const narrow = (unit: string, value: number) =>
      new Intl.NumberFormat('en-US', { style: 'unit', unit, unitDisplay: 'narrow' }).format(value)
    expect([narrow('minute', 42), narrow('hour', 5), narrow('day', 3)]).toEqual(['42m', '5h', '3d'])
    expect(formatNumber(1_500_000, 'en-US', { notation: 'compact' })).toBe('1.5M')
    expect(formatNumber(3, 'en', { signDisplay: 'always' })).toBe('+3')
  })

  test('leaves every other number, and a locale with no data, to the engine', () => {
    const { formatNumber } = installed()
    expect(formatNumber(1234.5, 'de-DE')).toBe('1.234,5')
    expect(formatNumber(1_500_000, 'de', { notation: 'compact' })).toBe('1.500.000')
    expect(new Intl.NumberFormat('en').format(1234.5)).toBe('1,234.5')
    expect(new Intl.NumberFormat('en') instanceof Intl.NumberFormat).toBe(true)
  })

  test('writes another locale once the app loads its data', () => {
    const { formatNumber } = installed()
    require('@formatjs/intl-pluralrules/locale-data/de.js')
    require('@formatjs/intl-numberformat/locale-data/de.js')
    expect(formatNumber(1_500_000, 'de', { notation: 'compact' })).toMatch(/^1,5\sMio\.$/)
    expect(
      formatNumber(0.084, 'de', {
        maximumFractionDigits: 1,
        signDisplay: 'always',
        style: 'percent',
      }),
    ).toMatch(/^\+8,4\s%$/)
  })

  test('installs nothing where the engine writes every option', () => {
    Object.defineProperty(Intl, 'NumberFormat', descriptor as PropertyDescriptor)
    installed()
    expect(Intl.NumberFormat).toBe(real)
  })
})
