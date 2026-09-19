/**
 * One CSS value list split into its values, never inside a function or a
 * bracket.
 *
 * The separator is the one the property uses: a comma for a list of colors, a
 * space for a list of grid tracks. Whichever it is, the trap is the same one
 * from opposite sides. `split(',')` turns
 * `#ef4444, rgb(249 115 22), rgba(34,197,94,.5)` into six fragments, four of
 * them not colors, and a row of swatches quietly draws three instead of four.
 * `split(/\s+/)` turns `minmax(0, 1fr)` into two tracks, and a grid given a
 * track it cannot read draws one column. Both spellings look like they work,
 * because the modern space-separated color forms and the single-keyword tracks
 * survive them.
 *
 * Depth rather than a regular expression, because what matters is whether the
 * separator is inside a call and that is exactly what a counter answers.
 * Brackets count with parentheses, since a grid's line names are written in
 * them. Nesting is counted rather than assumed away: `minmax(0, calc(1px + 1%))`
 * is one value.
 *
 * Empty values are dropped, so a leading, doubled or trailing separator leaves
 * nothing behind to be parsed as a value nobody wrote.
 */
export const splitValues = (text: string, separator: ',' | ' '): string[] => {
  const values: string[] = []
  let depth = 0
  let current = ''
  for (const character of text.trim()) {
    if (character === '(' || character === '[') {
      depth += 1
    } else if (character === ')' || character === ']') {
      depth = Math.max(0, depth - 1)
    }
    const separates = separator === ' ' ? /\s/.test(character) : character === separator
    if (depth === 0 && separates) {
      values.push(current.trim())
      current = ''
    } else {
      current += character
    }
  }
  values.push(current.trim())
  return values.filter((one) => one !== '')
}
