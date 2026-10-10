/** The runtime's own locale, read once. */
let runtime: Intl.Locale | undefined

/** The language of the runtime's own locale, read once. */
let language: string | undefined

/** Each `lang` already read, with the locale it is. */
const usable = new Map<string, string>()

/**
 * The runtime's own locale: in a browser, the language its interface is set
 * to, which is what every `Intl` call given no locale uses.
 *
 * **Read only where an element needs the whole locale**, because the first
 * `DateTimeFormat` a page makes costs 7.1 ms in Chromium (October 10, 2026).
 * A `lang` compared with the runtime reads `runtimeLanguage`, and an element
 * that only watches for a change of locale reads `nearestLang`.
 */
export const runtimeLocale = (): string => {
  runtime ??= new Intl.Locale(new Intl.DateTimeFormat().resolvedOptions().locale)
  return runtime.toString()
}

/**
 * The language of the runtime's own locale, which is all a `lang` is compared
 * with.
 *
 * **From `PluralRules`, whose first instance costs 0.2 ms where
 * `DateTimeFormat`'s costs 7.1** (Chromium, October 10, 2026). Every `Intl`
 * constructor given no locale resolves the runtime's default. `PluralRules`
 * leaves out a Unicode extension the default may carry, such as a calendar
 * or an hour cycle, which `DateTimeFormat` keeps, so the two locales can
 * differ there, and their languages cannot. Read in Chromium across 29
 * locales and in Node across 10: the languages matched in every one.
 */
export const runtimeLanguage = (): string => {
  language ??=
    runtime?.language ?? new Intl.Locale(new Intl.PluralRules().resolvedOptions().locale).language
  return language
}

/**
 * A `lang` as a locale to format in: empty where the runtime's own locale
 * already speaks it, or where it is no tag `Intl` takes.
 *
 * **A language with no region defers to the reader's own.** `lang="en"` says
 * the page is in English, and a reader whose browser is set to British English
 * reads English: their own dates, day first, say it better than the United
 * States ones `en` stands for. So a bare language the runtime shares is read
 * as the runtime's locale, and a page that names a region, `lang="en-US"`,
 * gets that region. **And a tag `Intl` refuses is no locale**, since every
 * formatter given one throws.
 */
export const usableLocale = (lang: string): string => {
  let found = usable.get(lang)
  if (found === undefined) {
    try {
      const asked = new Intl.Locale(lang)
      found =
        asked.region === undefined && asked.language === runtimeLanguage() ? '' : asked.toString()
    } catch {
      found = ''
    }
    usable.set(lang, found)
  }
  return found
}

/**
 * The `lang` of the nearest element with one, read out through any shadow
 * root the element is drawn in, or `undefined` where none has one. A server
 * shim with no `closest` has none.
 */
export const nearestLang = (element: Element): string | undefined => {
  let from: Element | null = element
  while (from && typeof from.closest === 'function') {
    const found = from.closest('[lang]')
    if (found) {
      return found.getAttribute('lang') ?? ''
    }
    const root = from.getRootNode?.() as (Node & { host?: Element }) | undefined
    from = root?.host ?? null
  }
  return undefined
}

/**
 * The locale an element speaks: `own`, the element's own `locale` property,
 * where one is set, and otherwise the `lang` of the nearest element with one,
 * read out through any shadow root the element is drawn in.
 *
 * **The page's language is the default a reader expects.** A date picker on a
 * page written `lang="de"` that names its months in English and starts its
 * weeks on Sunday is a widget that ignored the one place the page said what
 * language it is in; Shoelace and Web Awesome read the same attribute.
 * `lang=""` is the page saying it does not know, and answers empty.
 *
 * Empty where nothing says, which every `Intl` call here takes as the
 * runtime's own locale, and empty for a bare language the runtime already
 * speaks (see `usableLocale`). Read when asked rather than watched, so a page
 * that changes its `lang` is answered in the new one on the element's next
 * render.
 * A server shim with no `closest` answers `own`, or empty.
 */
export const localeOf = (element: Element, own = ''): string => {
  if (own) {
    return own
  }
  const lang = nearestLang(element)
  return lang === undefined ? '' : usableLocale(lang)
}
