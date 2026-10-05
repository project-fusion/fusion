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
