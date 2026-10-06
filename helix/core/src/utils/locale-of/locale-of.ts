/**
 * The locale an element speaks: `own`, the element's own `locale` property,
 * where one is set, and otherwise the `lang` of the nearest element with one,
 * read out through any shadow root the element is drawn in.
 *
 * **The page's language is the default a reader expects.** A date picker on a
 * page written `lang="de"` that names its months in English and starts its
 * weeks on Sunday is a widget that ignored the one place the page said what
 * language it is in, and React Aria reads the same attribute. `lang=""` is
 * the page saying it does not know, and answers empty.
 *
 * Empty where nothing says, which every `Intl` call here takes as the
 * runtime's own locale. Read when asked rather than watched, so a page that
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
      return found.getAttribute('lang') ?? ''
    }
    const root = from.getRootNode?.() as (Node & { host?: Element }) | undefined
    from = root?.host ?? null
  }
  return ''
}
