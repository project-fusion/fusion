/**
 * Whether a press types a character, which is what typeahead reads.
 *
 * One character with no Control, Command or Alt held, so a shortcut such as
 * Control+A is never taken for the letter A. Shift is allowed, because a
 * capital is still a letter.
 *
 * **One character is one UTF-16 unit here.** The typeahead machine leaves
 * what counts as one character to each platform. An emoji outside the Basic
 * Multilingual Plane, such as U+1F600, is two units, so the web leaves it to
 * the page. React Native counts code points in `helix/native`'s typeahead
 * host, and types that emoji as one character.
 */
export const typesCharacter = (event: KeyboardEvent): boolean =>
  event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey

/**
 * Finds an item by the letters a reader types at a set, the way a native
 * `<select>` does.
 *
 * Letters typed less than `timeout` milliseconds apart build one search, so
 * typing "ca" moves to "Canada" past "Cambodia". The same letter typed again
 * moves to the next item that starts with it, so pressing "c" three times visits
 * the first three. A pause of `timeout` milliseconds or more starts a new
 * search.
 *
 * Matching ignores case and leading spaces, and searches from the reader's
 * position, wrapping at the end. A search that matches nothing moves nothing.
 *
 * Holds only the letters, so one instance serves any set: the caller passes the
 * words of the items and where the reader is on every key.
 */
export class Typeahead {
  private letters = ''

  private last = 0

  private readonly timeout: number

  constructor({ timeout = 500 }: { timeout?: number } = {}) {
    this.timeout = timeout
  }

  /**
   * Whether a search is under way.
   *
   * A set that chooses on Space asks this first, because a Space typed in the
   * middle of a search is part of the words, as in "New York".
   *
   * **A letter exactly `timeout` after the last starts a new search.** The
   * typeahead machine ends the search at that moment, and
   * `typeahead-presses.pure.spec.ts` holds this to it at 499, 500, and 501
   * milliseconds.
   */
  typing(now = Date.now()): boolean {
    return this.letters !== '' && now - this.last < this.timeout
  }

  /**
   * Adds a character to the search, and returns the index of the item it
   * matches, or `-1` where none does.
   *
   * `texts` are the words of the items a reader can reach, in order, and
   * `from` is the index of the item the reader is on, or `-1`.
   */
  match(key: string, texts: readonly string[], from: number, now = Date.now()): number {
    if (!this.typing(now)) {
      this.letters = ''
    }
    this.last = now
    this.letters += key.toLowerCase()
    const words = texts.map((text) => text.trim().toLowerCase())
    /* One letter, or the same letter repeated, cycles through the items that
       start with it. Anything longer is a word, and the item the reader is on
       may already be the answer, so the search includes it. */
    const repeated = [...this.letters].every((letter) => letter === this.letters[0])
    const needle = repeated ? (this.letters[0] ?? '') : this.letters
    const start = repeated ? from + 1 : Math.max(from, 0)
    for (let step = 0; step < words.length; step += 1) {
      const at = (start + step) % words.length
      if (words[at]?.startsWith(needle)) {
        return at
      }
    }
    return -1
  }

  /** Ends the search, so the next letter starts a new one. */
  reset(): void {
    this.letters = ''
  }
}

/**
 * A typeahead over a set's items: how to read an item's words, and the search
 * that remembers the letters typed so far.
 *
 * What `KeyboardNavigationController` takes as its `typeahead` option. A set
 * builds one with `typeaheadBy`, so the search's code ships only with the sets
 * that type ahead, and Rating or Radio, which never do, carry none of it.
 */
export interface TypeaheadBy<Item> {
  /** The letters typed so far, matched against the words. */
  readonly search: Typeahead
  /** The words of an item, which a reader types the start of. */
  readonly words: (item: Item) => string
}

/**
 * Turns on typeahead for a set whose items have these words. See
 * `TypeaheadBy`.
 */
export const typeaheadBy = <Item>(words: (item: Item) => string): TypeaheadBy<Item> => ({
  search: new Typeahead(),
  words,
})

/**
 * Turns on typeahead for a set whose items carry their own `words`, as List's
 * rows, Tag Group's tags and Drilldown's items do. An item with none is
 * passed over.
 */
export const typeaheadByWords = (): TypeaheadBy<{ readonly words?: string }> =>
  typeaheadBy((item) => item.words ?? '')
