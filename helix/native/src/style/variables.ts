/** The `var()` references inside a hook's words, read as the web reads them. */

/** A `var()` whose fallback, where it has one, holds no parentheses. */
const INNERMOST = /var\(\s*--([\w-]+)\s*(?:,([^()]*))?\)/

/**
 * `written` with each `var()` in it replaced by what `read` gives for its
 * name, without the two dashes, or by its fallback, innermost first, so a
 * hook set to `var(--helix-space-md) calc(var(--gap) + 1rem)` reads as the
 * lengths it names. A list is its words joined by spaces.
 *
 * **A reference with no value and no fallback leaves the words as they
 * are**, which no property reads, as the web's declaration is invalid at
 * computed-value time then.
 */
export const withVariables = (written: string, read: (name: string) => unknown): string => {
  let current = written
  /* A bound, as a property that names itself would never end. */
  for (let step = 0; step < 64; step += 1) {
    const found = INNERMOST.exec(current)
    if (found === null) {
      return current
    }
    const [whole, name = '', fallback] = found
    const set = read(name)
    const value =
      typeof set === 'string' || typeof set === 'number'
        ? String(set)
        : Array.isArray(set)
          ? set.join(' ')
          : fallback?.trim()
    if (value === undefined) {
      return written
    }
    current = current.slice(0, found.index) + value + current.slice(found.index + whole.length)
  }
  return written
}
