import { type Locale, locale } from '@fusion.dev/helix-core/capabilities/locale'
import { useSyncExternalStore } from 'react'
import { AppState } from 'react-native'

/** The locale `Intl` formats in by default, which Hermes takes from the system. */
const read = (): string => new Intl.DateTimeFormat().resolvedOptions().locale

/**
 * Reads the locale from `Intl.DateTimeFormat().resolvedOptions()`.
 *
 * **`observe` reads again only when the app comes back to the front**, since
 * the system locale can change only while the app is away, in the system's
 * settings. It calls `changed` only where the locale has moved.
 *
 * The pieces of `Intl` Hermes lacks are installed beside it, by
 * `installIntl`, which the capabilities' install calls before setting it.
 */
export const nativeLocale: Locale = {
  observe: (changed) => {
    let last = read()
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        return
      }
      const now = read()
      if (now !== last) {
        last = now
        changed(now)
      }
    })
    return () => {
      subscription.remove()
    }
  },
  read,
}

/** Hears each change of locale the capability in use reports. */
const subscribe = (changed: () => void): (() => void) => locale().observe(() => changed())

/** The locale the capability in use reads. */
const current = (): string => locale().read()

/**
 * The locale a component writes its numbers and words in: `own`, a
 * component's `locale` prop, where it names one, and the reader's otherwise,
 * as the locale capability reads it. A component that uses it draws again
 * when the reader's locale changes.
 *
 * **Number formatting and plural words are core's.** `formatNumber` and
 * `formatMessage` from `@fusion.dev/helix-core` take the locale this gives.
 */
export const useLocale = (own?: string): string => {
  const reader = useSyncExternalStore(subscribe, current)
  return own === undefined || own === '' ? reader : own
}
