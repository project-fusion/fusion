import { usableLocale } from '../../utils/locale-of/locale-of.js'
import type { Locale } from './contract.generated.js'

/** The document's `lang` where it names a locale, and otherwise the browser's language. */
const read = (): string => {
  const lang = document.documentElement.lang
  return (lang && usableLocale(lang)) || navigator.language
}

/**
 * Reads the document's `lang`, then `navigator.language`.
 *
 * **The `lang` is read as every element reads it, through `usableLocale`.**
 * A tag `Intl` refuses is skipped. A language with no region that the
 * browser already speaks is the browser's own locale, so `lang="en"` in a
 * browser set to British English reads `en-GB`, and dates come day first.
 *
 * `observe` listens to the document element's `lang` and to the window's
 * `languagechange`, and calls `changed` only where the locale has moved.
 */
export const webLocale: Locale = {
  observe: (changed) => {
    let last = read()
    const check = (): void => {
      const now = read()
      if (now !== last) {
        last = now
        changed(now)
      }
    }
    const lang = new MutationObserver(check)
    lang.observe(document.documentElement, { attributeFilter: ['lang'], attributes: true })
    window.addEventListener('languagechange', check)
    return () => {
      lang.disconnect()
      window.removeEventListener('languagechange', check)
    }
  },
  read,
}
