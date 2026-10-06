/** The runtime's own locale, read once. */
let runtime: Intl.Locale | undefined

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
const usable = (lang: string): string => {
  try {
    const asked = new Intl.Locale(lang)
    runtime ??= new Intl.Locale(new Intl.DateTimeFormat().resolvedOptions().locale)
    return asked.region === undefined && asked.language === runtime.language ? '' : asked.toString()
  } catch {
    return ''
  }
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
 * speaks (see `usable`). Read when asked rather than watched, so a page that
 * changes its `lang` is answered in the new one on the element's next render.
 * A server shim with no `closest` answers `own`, or empty.
 */
export const localeOf = (element: Element, own = ''): string => {
  if (own) {
    return own
  }
  let from: Element | null = element
  while (from && typeof from.closest === 'function') {
    const found = from.closest('[lang]')
    if (found) {
      return usable(found.getAttribute('lang') ?? '')
    }
    const root = from.getRootNode?.() as (Node & { host?: Element }) | undefined
    from = root?.host ?? null
  }
  return ''
}
