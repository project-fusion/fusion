import { shouldPolyfill as needsDisplayNames } from '@formatjs/intl-displaynames/should-polyfill.js'
import { shouldPolyfill as needsCanonical } from '@formatjs/intl-getcanonicallocales/should-polyfill.js'
import { shouldPolyfill as needsList } from '@formatjs/intl-listformat/should-polyfill.js'
import { shouldPolyfill as needsLocale } from '@formatjs/intl-locale/should-polyfill.js'
import { shouldPolyfill as needsPlurals } from '@formatjs/intl-pluralrules/should-polyfill.js'
import { shouldPolyfill as needsRelative } from '@formatjs/intl-relativetimeformat/should-polyfill.js'
import { installNumberFormat } from './number-format'

/**
 * Installs the pieces of `Intl` the engine lacks, from FormatJS: Hermes has
 * `Collator`, `NumberFormat`, and `DateTimeFormat`, and the words registry
 * and the formatters also read `Locale`, `PluralRules`,
 * `RelativeTimeFormat`, `ListFormat`, and `DisplayNames`. The native locale capability's install calls it.
 *
 * **Only what is missing runs**, in the order each piece needs the one
 * before: canonical tags, then `Locale`, then `PluralRules`, which
 * `RelativeTimeFormat` chooses its words by, and `ListFormat` and
 * `DisplayNames`, which need `Locale`. Last, `NumberFormat` for the units,
 * the notations, and the signs the engine writes wrongly, which needs
 * `PluralRules`, as `installNumberFormat` says.
 *
 * **`DateTimeFormat` is not filled.** Its polyfill carries time-zone data
 * and is large, so the options Hermes writes are measured on devices first,
 * as `dateTimeSupport` reports them. An engine with its own keeps its
 * own. Metro bundles each `require` all the same, so the polyfills add to
 * the download on every engine.
 *
 * **English data comes with them.** An app with words in another locale
 * loads that locale's data once the polyfills are in, as
 * `@formatjs/intl-pluralrules/locale-data/fr` and
 * `@formatjs/intl-relativetimeformat/locale-data/fr` load French, and a
 * locale with no data is formatted by English rules. `Locale` carries the
 * likely subtags it fills a tag out with.
 */
export const installIntl = (): void => {
  if (needsCanonical()) {
    require('@formatjs/intl-getcanonicallocales/polyfill.js')
  }
  if (needsLocale()) {
    require('@formatjs/intl-locale/polyfill.js')
  }
  if (needsPlurals('en') !== undefined) {
    require('@formatjs/intl-pluralrules/polyfill.js')
    require('@formatjs/intl-pluralrules/locale-data/en.js')
  }
  if (needsRelative('en') !== undefined) {
    require('@formatjs/intl-relativetimeformat/polyfill.js')
    require('@formatjs/intl-relativetimeformat/locale-data/en.js')
  }
  if (needsList('en') !== undefined) {
    require('@formatjs/intl-listformat/polyfill.js')
    require('@formatjs/intl-listformat/locale-data/en.js')
  }
  if (needsDisplayNames('en') !== undefined) {
    require('@formatjs/intl-displaynames/polyfill.js')
    require('@formatjs/intl-displaynames/locale-data/en.js')
  }
  installNumberFormat()
}

/** Whether `Intl.DateTimeFormat` writes each option a date family needs, by the option. */
export interface DateTimeSupport {
  readonly calendar: boolean
  readonly dayPeriod: boolean
  readonly formatToParts: boolean
  readonly timeZoneName: boolean
}

/**
 * Whether the engine's `Intl.DateTimeFormat` writes the options Format Date,
 * Timeline and the date families need: `formatToParts`, another calendar,
 * a time zone's name, and a day period. Each is asked of a fixed moment, so
 * the answer is the same on every run, and the gallery's `dates` check shows
 * it on a device.
 */
export const dateTimeSupport = (): DateTimeSupport => {
  const moment = new Date(Date.UTC(2026, 9, 21, 15, 30))
  const writes = (options: Intl.DateTimeFormatOptions, test: (text: string) => boolean) => {
    try {
      return test(new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', ...options }).format(moment))
    } catch {
      return false
    }
  }
  let parts = false
  try {
    parts = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC' })
      .formatToParts(moment)
      .some((part) => part.type === 'year' && part.value === '2026')
  } catch {
    parts = false
  }
  return {
    calendar: writes({ calendar: 'japanese', era: 'short', year: 'numeric' }, (text) =>
      /Reiwa|R\s?8/.test(text),
    ),
    dayPeriod: writes({ dayPeriod: 'long', hour: 'numeric' }, (text) => /afternoon/.test(text)),
    formatToParts: parts,
    timeZoneName: writes({ hour: 'numeric', timeZoneName: 'short' }, (text) => /UTC/.test(text)),
  }
}
