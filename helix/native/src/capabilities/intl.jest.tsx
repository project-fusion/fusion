import { afterEach, describe, expect, jest, test } from '@jest/globals'

/** The pieces of `Intl` the polyfills fill, as Hermes lacks them. */
const LACKED = [
  'Locale',
  'PluralRules',
  'RelativeTimeFormat',
  'ListFormat',
  'DisplayNames',
] as const

/** What the engine running the specs has of each, to put back after. */
const own = new Map(LACKED.map((name) => [name, Object.getOwnPropertyDescriptor(Intl, name)]))

/** `Intl` as a record, so a spec can take a piece away as Hermes lacks it. */
const intl = Intl as unknown as Record<string, unknown>

/** Installs the polyfills from a fresh module registry, so each spec loads them anew. */
const install = () => {
  jest.isolateModules(() => {
    ;(require('./intl') as typeof import('./intl')).installIntl()
  })
}

afterEach(() => {
  for (const [name, descriptor] of own) {
    if (descriptor !== undefined) {
      Object.defineProperty(Intl, name, descriptor)
    }
  }
})

describe('installIntl', () => {
  test('keeps the pieces an engine has of its own', () => {
    const before = LACKED.map((name) => intl[name])
    install()
    expect(LACKED.map((name) => intl[name])).toEqual(before)
  })

  test('fills the pieces Hermes lacks, with English data', () => {
    for (const name of LACKED) {
      delete intl[name]
    }
    install()
    expect(new Intl.PluralRules('en').select(1)).toBe('one')
    expect(new Intl.ListFormat('en').format(['tea', 'milk', 'sugar'])).toBe('tea, milk, and sugar')
    expect(new Intl.DisplayNames('en', { type: 'region' }).of('DE')).toBe('Germany')
    expect(new Intl.PluralRules('en', { type: 'ordinal' }).select(2)).toBe('two')
    expect(new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-1, 'day')).toBe(
      'yesterday',
    )
    expect(new Intl.Locale('zh-HK').maximize().script).toBe('Hant')
    expect(LACKED.map((name) => intl[name] === own.get(name)?.value)).toEqual([
      false,
      false,
      false,
      false,
      false,
    ])
  })
})

/**
 * **Core's formatters run on the pieces the polyfills fill**, as they do on
 * Hermes: numbers through the engine's own `Intl.NumberFormat`, and plural
 * words through FormatJS's `PluralRules` with the data an app loads.
 */
describe('formatNumber and formatMessage, with the pieces Hermes lacks filled', () => {
  type Formatters = typeof import('@fusion.dev/helix-core/numbers') &
    typeof import('@fusion.dev/helix-core/words')

  /**
   * Core's formatters, from the entries a native component imports, in a
   * registry where the polyfills are the engine's own.
   */
  const formatters = (): Formatters => {
    for (const name of LACKED) {
      delete intl[name]
    }
    let core: Formatters | undefined
    jest.isolateModules(() => {
      ;(require('./intl') as typeof import('./intl')).installIntl()
      core = {
        ...(require('@fusion.dev/helix-core/numbers') as typeof import('@fusion.dev/helix-core/numbers')),
        ...(require('@fusion.dev/helix-core/words') as typeof import('@fusion.dev/helix-core/words')),
      }
    })
    return core as Formatters
  }

  const COUNT = '{count, plural, =0 {No results} one {# result} other {# results}}'

  test('picks an English plural form and writes the count in the locale', () => {
    const { formatMessage } = formatters()
    expect(formatMessage(COUNT, { count: 0 }, 'en')).toBe('No results')
    expect(formatMessage(COUNT, { count: 1 }, 'en')).toBe('1 result')
    expect(formatMessage(COUNT, { count: 1200 }, 'en-US')).toBe('1,200 results')
  })

  test('picks another locale’s forms once the app loads its data', () => {
    const { formatMessage } = formatters()
    require('@formatjs/intl-pluralrules/locale-data/pl.js')
    const polish = '{count, plural, one {# wynik} few {# wyniki} many {# wyników} other {# wyniku}}'
    expect([1, 3, 5].map((count) => formatMessage(polish, { count }, 'pl'))).toEqual([
      '1 wynik',
      '3 wyniki',
      '5 wyników',
    ])
  })

  test('writes numbers with the options a component takes', () => {
    const { formatNumber, formatPercent } = formatters()
    expect(formatNumber(1234.5, 'de-DE')).toBe('1.234,5')
    expect(formatNumber(1500, 'en', { notation: 'compact' })).toBe('1.5K')
    expect(formatNumber(-3, 'en', { signDisplay: 'exceptZero' })).toBe('-3')
    expect(formatPercent(0.4, 'en')).toBe('40%')
  })
})

describe('dateTimeSupport', () => {
  test('says an engine with full ICU writes every option the date families need', () => {
    expect((require('./intl') as typeof import('./intl')).dateTimeSupport()).toEqual({
      calendar: true,
      dayPeriod: true,
      formatToParts: true,
      timeZoneName: true,
    })
  })
})
