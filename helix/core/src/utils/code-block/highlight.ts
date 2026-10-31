/**
 * The highlighted lines out of what a highlighter returned, without the
 * `<pre>` and `<code>` around them that some highlighters write.
 *
 * Shiki's `codeToHtml` returns a whole block, `<pre class="shiki" tabindex="0"
 * style="…"><code>…</code></pre>`. Drawn as given inside the block's own
 * `<pre>`, that second `<pre>` sat 13px below the gutter's first number, and
 * its `tabindex` was a second tab stop inside the block's scroller. Prism's
 * `highlight` and highlight.js return the lines alone, which pass through
 * unchanged.
 *
 * Only a wrapper around the whole markup is taken off, and only one. The block draws its own
 * box and colors, so the wrapper's `style` and `class` go with it.
 */
export const highlightedLines = (markup: string): string => {
  const lines = /^\s*<pre\b[^>]*>\s*<code\b[^>]*>([\s\S]*)<\/code>\s*<\/pre>\s*$/i.exec(markup)?.[1]
  /* Two blocks side by side also start and end like one. */
  return lines === undefined || /<\/?pre\b/i.test(lines) ? markup : lines
}

const VOID_TAGS = new Set(['br', 'img', 'wbr'])

/**
 * Highlighted markup cut into one string per line, each closing what is open
 * at its end and opening it again on the next, so a token that runs over a
 * line break, such as a block comment, is drawn whole on both lines.
 *
 * What lets a block that grows redraw only the lines that changed: a line is
 * replaced when its own markup differs, and every other line keeps its nodes.
 */
export const highlightedLineList = (markup: string): string[] => {
  const lines: string[] = []
  const open: Array<{ name: string; tag: string }> = []
  let line = ''
  for (const [, tag, text] of markup.matchAll(/(<[^>]*>)|([^<]+)/g)) {
    if (tag !== undefined) {
      line += tag
      const name = /^<\/?([A-Za-z][\w-]*)/.exec(tag)?.[1]?.toLowerCase()
      if (name === undefined || VOID_TAGS.has(name) || tag.endsWith('/>')) {
        continue
      }
      if (tag.startsWith('</')) {
        const at = open.map((one) => one.name).lastIndexOf(name)
        if (at >= 0) {
          open.splice(at)
        }
      } else {
        open.push({ name, tag })
      }
      continue
    }
    const pieces = (text ?? '').split('\n')
    pieces.forEach((piece, index) => {
      if (index > 0) {
        lines.push(
          line +
            open
              .map((one) => `</${one.name}>`)
              .reverse()
              .join(''),
        )
        line = open.map((one) => one.tag).join('')
      }
      line += piece
    })
  }
  lines.push(line)
  return lines
}
