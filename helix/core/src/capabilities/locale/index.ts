/**
 * The locale capability: the implementation a host calls, and its setter.
 *
 * **The server's until a platform sets its own.** The server's returns `en-US`
 * for a request that states no locale, so the slot is safe to call anywhere,
 * and no platform's code reaches a bundle that does not set it: the web's and
 * the native adapter's implementations are imported only where they are set.
 */
import type { Locale } from './contract.generated.js'
import { serverLocale } from './server.js'

let current: Locale = serverLocale

/** The implementation in use. */
export const locale = (): Locale => current

/** Replaces the implementation in use, as an adapter does once at its start and an app does to take over. */
export const setLocale = (next: Locale): void => {
  current = next
}

export type { Locale } from './contract.generated.js'
