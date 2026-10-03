import { highlight } from '@fusion.dev/helix-sandbox/highlight'
import styles from './snippet.module.css'

/** A line of highlighted markup that opens and closes its own spans, which a line can be set apart from its neighbors. */
const whole = (line: string): boolean =>
  (line.match(/<span/g)?.length ?? 0) === (line.match(/<\/span>/g)?.length ?? 0)

/**
 * Highlighted markup set to wrap as code is read.
 *
 * - **Each word is kept whole**, so a line does not break at a hyphen, and a
 *   path's words are joined by a break after each slash, which is where a long
 *   URL wraps. A tag's own `</` and `/>` are left whole.
 * - **Each line hangs from its indent**, so a wrapped line continues two
 *   characters in from the line it belongs to.
 *
 * Only elements are added, and the text is unchanged, so the copy button
 * copies the code as written. Markup whose spans run across lines is returned
 * as it came, to scroll as the block otherwise does.
 */
const wrapped = (html: string): string => {
  const lines = html.split('\n')
  if (!lines.every(whole)) {
    return html
  }
  const words = (text: string): string =>
    text.replace(/[^\s]+/g, (word) =>
      word
        .split(/(?<=(?<!&lt;)\/(?!\/|&gt;))/)
        .map((part) => `<span class="${styles.snippetWord}">${part}</span>`)
        .join('<wbr>'),
    )
  return lines
    .map((line, index) => {
      const indent = /^ */.exec(line)?.[0].length ?? 0
      const set = line.replace(
        /(^|>)([^<]*)/g,
        (_, open: string, text: string) => open + words(text),
      )
      const end = index < lines.length - 1 ? '\n' : ''
      return `<span class="${styles.snippetLine}" style="--indent: ${indent + 2}">${set}${end}</span>`
    })
    .join('')
}

/**
 * A snippet as the reference pages show one, highlighted by this build from
 * its own source. `wrap` wraps its long lines, where a line that scrolled
 * would hide the end of a URL or a call.
 */
export function Snippet({
  code,
  label,
  language,
  wrap = false,
}: {
  code: string
  label: string
  language: 'html' | 'js' | 'sh'
  wrap?: boolean
}) {
  const html = highlight(code, language)
  return (
    <helix-code-block class={wrap ? styles.snippetWrapped : undefined} label={label}>
      <span
        // biome-ignore lint/security/noDangerouslySetInnerHtml: markup this build produced from its own source
        dangerouslySetInnerHTML={{ __html: wrap ? wrapped(html) : html }}
      />
    </helix-code-block>
  )
}
