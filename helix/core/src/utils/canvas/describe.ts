/*
 * What a card or a connection is described with, as one list. Pure and beside
 * the family's `index.ts`, because the list is a fact about a few strings and
 * a locale, and a spec can hold it without a board.
 */

/** The list formatters built so far, by locale. */
const formatters = new Map<string, Intl.ListFormat>()

/**
 * The words that describe a card or a connection, such as whether it is
 * selected, what its tone means and where its connections go, as one list in
 * the way `locale` writes one: "selected, Blocked" in English, "selected und
 * Blocked" in German. An empty word is left out, and nothing at all is empty.
 *
 * **A narrow conjunction**, which English writes with commas alone, so the
 * English reads as it did when the words were joined with a comma.
 */
export const descriptionOf = (locale: string, words: readonly (string | undefined)[]): string => {
  let found = formatters.get(locale)
  if (!found) {
    found = new Intl.ListFormat(locale || undefined, { style: 'narrow', type: 'conjunction' })
    formatters.set(locale, found)
  }
  return found.format(words.filter((one): one is string => Boolean(one)))
}
