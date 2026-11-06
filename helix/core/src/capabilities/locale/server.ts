import type { Locale } from './contract.generated.js'

/** The locale of a request that states none. */
export const UNSTATED_LOCALE = 'en-US'

/**
 * The locale of one request: the language tag it states, such as the first
 * one in its `Accept-Language` header, or `en-US` where it states none.
 *
 * A request does not change while it renders, so `observe` calls nothing.
 */
export const serverLocaleFrom = (stated?: string): Locale => {
  const tag = stated || UNSTATED_LOCALE
  return {
    observe: () => () => undefined,
    read: () => tag,
  }
}

/** The locale of a request that states none: `en-US`. */
export const serverLocale: Locale = serverLocaleFrom()
