import { localeOf, runtimeLocale } from '../utils/locale-of/locale-of.js'
import { defaultWordsLocale } from './registry.js'

/** Tags already checked, with what each one is as a locale. */
const checked = new Map<string, string>()

/** A tag as `Intl` writes it, or empty where `Intl` refuses it. */
const tagOf = (written: string): string => {
  let found = checked.get(written)
  if (found === undefined) {
    try {
      found = Intl.getCanonicalLocales(written)[0] ?? ''
    } catch {
      found = ''
    }
    checked.set(written, found)
  }
  return found
}

/**
 * The locale an element speaks: the one its words, its plural forms, and the
 * numbers in its sentences are in.
 *
 * 1. The element's `locale` property, where it has one and it is set.
 * 2. On a server, and in the first render while the element hydrates, its own
 *    `lang` attribute, then the locale set with `setDefaultWordsLocale`, which
 *    is `en` until you set it. A server knows the element's attributes and
 *    nothing around it, so a hydrating render reads the same inputs and draws
 *    what the server drew.
 * 3. Otherwise, the nearest `lang`, read out through shadow roots, then the
 *    runtime's own locale.
 *
 * **One rule for every family**, so one sentence never mixes the words of one
 * language with the plural rules or digits of another. A `lang` that names a
 * bare language the runtime already speaks, such as `en` in a British
 * browser, is the runtime's locale, as `localeOf` reads it for dates.
 *
 * Always a tag `Intl` takes.
 */
export const wordsLocale = (element: Element & { locale?: string | undefined }): string => {
  const own = typeof element.locale === 'string' ? tagOf(element.locale) : ''
  if (own) {
    return own
  }
  /* A server's element shim has no `closest`, which is how a server is told
     apart here: Lit's `isServer` is true in any test runner that resolves its
     `node` build. */
  if (typeof element.closest !== 'function' || (element as { hydrating?: boolean }).hydrating) {
    return tagOf(element.getAttribute?.('lang') ?? '') || defaultWordsLocale()
  }
  return localeOf(element) || runtimeLocale()
}

/**
 * The locale an element hands a child that reads only its own `lang` or
 * `locale`, such as the list inside a combobox: the element's `locale`, or
 * the nearest `lang` where it names a locale the runtime does not already
 * speak. Empty where nothing says, so the child keeps the runtime's locale and
 * gains no attribute, and empty while the element hydrates, as a server could
 * not have known it.
 */
export const handedLocale = (element: Element & { locale?: string | undefined }): string => {
  const own = typeof element.locale === 'string' ? element.locale : ''
  return (element as { hydrating?: boolean }).hydrating ? own : localeOf(element, own)
}
