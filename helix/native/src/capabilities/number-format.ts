/**
 * `Intl.NumberFormat` where the engine's own writes some options wrongly, as
 * Hermes on iOS does: it writes 42 minutes as "2,520 sec" and a narrow day as
 * "42 day", and drops `notation` and `signDisplay`, so "1.5M" reads
 * "1,500,000" and "+3" reads "3". Android's Hermes writes all of them.
 *
 * **Only a number the engine gets wrong is written by FormatJS.** Each of
 * the three is asked of the engine in English, and where one is wrong,
 * `Intl.NumberFormat` becomes a constructor that hands a number with that
 * option to FormatJS's `NumberFormat`, in a locale FormatJS has data for, and
 * every other number to the engine's own. So a German reader's plain numbers
 * keep the engine's German digits, where FormatJS without German data would
 * write English ones.
 *
 * **English data comes with it.** An app with readers in another locale
 * loads that locale's data, as `@formatjs/intl-numberformat/locale-data/de`
 * loads German, with the plural data the same locale needs.
 */

import type { NumberFormat as Filled } from '@formatjs/intl-numberformat'

/** Whether the engine's `Intl.NumberFormat` writes each option a number family needs, by the option. */
export interface NumberSupport {
  /** `notation: 'compact'`, as Trend and Stat write "1.5M". */
  readonly notation: boolean
  /** `signDisplay`, as Trend writes "+3". */
  readonly signDisplay: boolean
  /** `style: 'unit'` in minutes, hours, and days, as Format Date's elapsed time writes "42m". */
  readonly units: boolean
}

/**
 * Whether the engine's `Intl.NumberFormat` writes the options Format Date,
 * Trend, Stat, and Meter need, each asked of a fixed number in English, so
 * the answer is the same on every run. Asked once `HelixRoot` has drawn, it
 * answers for what is installed over the engine, which the gallery's
 * `numbers` check shows on a device.
 */
export const numberSupport = (): NumberSupport => {
  const writes = (options: Intl.NumberFormatOptions, value: number, expected: string) => {
    try {
      return new Intl.NumberFormat('en-US', options).format(value) === expected
    } catch {
      return false
    }
  }
  const unit = (name: string, expected: string) =>
    writes({ style: 'unit', unit: name, unitDisplay: 'narrow' }, 42, expected)
  return {
    notation: writes({ notation: 'compact' }, 1_500_000, '1.5M'),
    signDisplay: writes({ signDisplay: 'always' }, 3, '+3'),
    units: unit('minute', '42m') && unit('hour', '42h') && unit('day', '42d'),
  }
}

/** Whether the engine writes `options` wrongly, by what `support` found. */
const wrongly = (support: NumberSupport, options: Intl.NumberFormatOptions | undefined) =>
  (!support.units && options?.style === 'unit') ||
  (!support.notation && options?.notation !== undefined && options.notation !== 'standard') ||
  (!support.signDisplay && options?.signDisplay !== undefined && options.signDisplay !== 'auto')

/**
 * Installs FormatJS's `NumberFormat` under the engine's, for the options the
 * engine writes wrongly, with English data. Does nothing where the engine
 * writes every one.
 */
export const installNumberFormat = (): void => {
  const support = numberSupport()
  if (support.notation && support.signDisplay && support.units) {
    return
  }
  const own = Intl.NumberFormat
  const formatjs = (require('@formatjs/intl-numberformat') as { NumberFormat: typeof Filled })
    .NumberFormat
  const NumberFormat = function NumberFormat(
    locales?: string | readonly string[],
    options?: Intl.NumberFormatOptions,
  ) {
    if (wrongly(support, options)) {
      /* The reader's locale, as the engine resolves it, where none is given. */
      const asked = locales ?? new own().resolvedOptions().locale
      const list = typeof asked === 'string' ? [asked] : [...asked]
      if (formatjs.supportedLocalesOf(list).length > 0) {
        return new formatjs(list, options as ConstructorParameters<typeof formatjs>[1])
      }
    }
    return new own(locales as string | string[] | undefined, options)
  }
  Object.defineProperties(NumberFormat, {
    __addLocaleData: { value: formatjs.__addLocaleData.bind(formatjs) },
    prototype: { value: own.prototype },
    supportedLocalesOf: { value: own.supportedLocalesOf.bind(own) },
    [Symbol.hasInstance]: {
      value: (value: unknown) => value instanceof own || value instanceof formatjs,
    },
  })
  Object.defineProperty(Intl, 'NumberFormat', {
    configurable: true,
    value: NumberFormat,
    writable: true,
  })
  require('@formatjs/intl-numberformat/locale-data/en.js')
}
