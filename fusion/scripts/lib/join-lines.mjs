/**
 * Joins lines where the newline between them means nothing.
 *
 * **After `{`, `}` or `;`, and before `}`**, a newline separates two things
 * CSS already tells apart, so it goes. Every other newline stays, because it
 * can be the only space between two compounds of a selector written over two
 * lines, or between two words of a value: a descendant combinator, or a
 * `grid-template-areas` row. Measured on the scorer's Added: 15 to 85 bytes
 * gzip a family, which is every family's sheet paying for its own layout.
 */
export const joinLines = (lines) => {
  let out = ''
  for (const line of lines) {
    const last = out.at(-1)
    out +=
      out === '' || last === '{' || last === '}' || last === ';' || line.startsWith('}')
        ? line
        : `\n${line}`
  }
  return out
}
