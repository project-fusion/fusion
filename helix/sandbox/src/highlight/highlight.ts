import { cssLanguage } from '@codemirror/lang-css'
import { htmlLanguage } from '@codemirror/lang-html'
import { javascriptLanguage, tsxLanguage, typescriptLanguage } from '@codemirror/lang-javascript'
import { classHighlighter, highlightCode } from '@lezer/highlight'

/**
 * The languages a snippet can be written in.
 *
 * **`ts` and `tsx` are here because the documentation is mostly written in
 * them**, and the base JavaScript grammar reads both wrongly rather than
 * partially. Measured on a `tsx` fence highlighted as `js`: `<helix-input` came
 * out as the variable `helix`, the operator `-` and the variable `input`, which
 * is the parser doing arithmetic on a tag name and colouring the result
 * confidently. A grammar that does not know the dialect does not degrade, it
 * lies.
 *
 * `tsx` covers JSX as well, since the dialect is a superset: there is no `jsx`
 * member because a JSX file that is not TypeScript still parses under it, and
 * a fourth entry would be a distinction with no consequence.
 */
export type HighlightLanguage = 'css' | 'html' | 'js' | 'ts' | 'tsx'

const PARSERS = {
  css: cssLanguage,
  html: htmlLanguage,
  js: javascriptLanguage,
  ts: typescriptLanguage,
  tsx: tsxLanguage,
} as const

const escapeHtml = (text: string): string =>
  text.replace(
    /[&<>"']/g,
    (char) =>
      ({ "'": '&#39;', '"': '&quot;', '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char] ?? char,
  )

/**
 * Highlights a snippet, returning HTML with one span per token.
 *
 * **A parser, not an editor.** CodeMirror's grammars are Lezer parsers and
 * parsing is a pure function of the text: `highlightCode` walks a tree and
 * hands back tokens. Nothing is mounted, no document is created, and this runs
 * on a server with no DOM at all, which is what lets a static page ship
 * highlighted code with no client JavaScript spent on it.
 *
 * **Here rather than in `helix/web`, and that is the whole point.** A code block
 * is a component and must not carry a parser: CodeMirror is about 4 MB
 * installed, and a `dependencies` entry is paid by every consumer whether or
 * not they import it. This package already carries those grammars for the
 * editor, so highlighting costs nothing new. `CodeBlock` renders a `<slot>`,
 * so the output of this drops straight into one and the component stays
 * dependency-free while its content is highlighted by the same grammars the
 * editor uses. A snippet on a reference page and the same snippet open in the
 * sandbox are then coloured by one source rather than two that agree by
 * coincidence.
 *
 * `classHighlighter` emits Lezer's own `tok-` class names. Mapping those to
 * colours is the consumer's, because the classes are stable and the palette is
 * not: the site paints them from `--helix-color-syntax-*`.
 */
export const highlight = (code: string, language: HighlightLanguage): string => {
  const tree = PARSERS[language].parser.parse(code)
  let out = ''
  highlightCode(
    code,
    tree,
    classHighlighter,
    (text, classes) => {
      out += classes ? `<span class="${classes}">${escapeHtml(text)}</span>` : escapeHtml(text)
    },
    () => {
      out += '\n'
    },
  )
  return out
}
