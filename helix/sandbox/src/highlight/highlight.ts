import { parser as cssParser } from '@lezer/css'
import { classHighlighter, type Highlighter, highlightCode } from '@lezer/highlight'
import { configureNesting, parser as htmlParser } from '@lezer/html'
import { parser as jsParser } from '@lezer/javascript'
import type { HighlightLanguage } from './language.js'
import { shellMode, shellTokens } from './shell.js'
import { highlightStream } from './stream.js'

/** The event attributes whose values are read as JavaScript, as CodeMirror's HTML reads them. */
const EVENT_ATTRIBUTES = [
  'beforeunload',
  'blur',
  'change',
  'click',
  'copy',
  'cut',
  'drag',
  'dragend',
  'dragenter',
  'dragleave',
  'dragover',
  'dragstart',
  'focus',
  'keydown',
  'keyup',
  'load',
  'mousedown',
  'mouseenter',
  'mouseleave',
  'mouseup',
  'paste',
  'resize',
  'scroll',
  'unload',
].map((name) => `on${name}`)

const typescript = jsParser.configure({ dialect: 'ts' })
const tsx = jsParser.configure({ dialect: 'jsx ts' })

/**
 * The Lezer parsers, configured as `@codemirror/lang-*` configures them.
 *
 * **The parsers themselves, and none of the `@codemirror/lang-*` packages.**
 * Each of those imports `@codemirror/view` for the editor's sake, and the view
 * reads the DOM as it loads: under Lit's global DOM shim a server failed at
 * import, and a page with one Code Block downloaded the editor. The tags a
 * token is colored by are the Lezer packages' own, so what this draws is what
 * the editor draws.
 *
 * HTML reads `<script>`, `<style>`, `style` and the event attributes in the
 * grammars CodeMirror's HTML language reads them in.
 */
const PARSERS = {
  css: cssParser,
  html: htmlParser.configure({
    wrap: configureNesting(
      [
        {
          attrs: (attrs) => attrs.type === 'text/typescript' || attrs.lang === 'ts',
          parser: typescript,
          tag: 'script',
        },
        {
          attrs: (attrs) => attrs.type === 'text/babel' || attrs.type === 'text/jsx',
          parser: jsParser.configure({ dialect: 'jsx' }),
          tag: 'script',
        },
        {
          attrs: (attrs) => attrs.type === 'text/typescript-jsx',
          parser: tsx,
          tag: 'script',
        },
        {
          attrs: (attrs) =>
            /^(importmap|speculationrules|application\/(.+\+)?json)$/i.test(attrs.type ?? ''),
          parser: jsParser.configure({ top: 'SingleExpression' }),
          tag: 'script',
        },
        {
          attrs: (attrs) =>
            !attrs.type ||
            /^(?:text|application)\/(?:x-)?(?:java|ecma)script$|^module$|^$/i.test(attrs.type),
          parser: jsParser,
          tag: 'script',
        },
        {
          attrs: (attrs) =>
            (!attrs.lang || attrs.lang === 'css') &&
            (!attrs.type || /^(text\/)?(x-)?(stylesheet|css)$/i.test(attrs.type)),
          parser: cssParser,
          tag: 'style',
        },
      ],
      [
        { name: 'style', parser: cssParser.configure({ top: 'Styles' }) },
        ...EVENT_ATTRIBUTES.map((name) => ({ name, parser: jsParser })),
      ],
    ),
  }),
  js: jsParser,
  ts: typescript,
  tsx,
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
 * **A parser, and no editor.** Lezer's grammars are parsers, and parsing is a
 * pure function of the text: `highlightCode` walks a tree and hands back
 * tokens. Nothing is mounted, no document is created, and this runs on a server
 * with no DOM at all, which is what lets a static page ship highlighted code
 * with no client JavaScript spent on it.
 *
 * **`CodeBlock` holds no parser.** A `dependencies` entry is paid by every
 * consumer whether or not they import it, so the grammars are in this package,
 * beside the editor that reads them too. `CodeBlock` renders a `<slot>`, so the
 * output of this drops straight into one. A snippet on a reference page and the
 * same snippet open in the sandbox are then colored by one source.
 *
 * `classHighlighter` emits Lezer's own `tok-` class names. Mapping those to
 * colors is yours, because the classes are stable and a palette is not: the
 * Fusion site paints them from `--helix-color-syntax-*`. Pass another
 * `highlighter` for other classes, such as `syntaxHighlighter`, the editor's
 * own, whose rules are `syntaxRules`.
 */
export const highlight = (
  code: string,
  language: HighlightLanguage,
  highlighter: Highlighter = classHighlighter,
): string => {
  let out = ''
  const put = (text: string, classes: string): void => {
    out += classes ? `<span class="${classes}">${escapeHtml(text)}</span>` : escapeHtml(text)
  }
  const putBreak = (): void => {
    out += '\n'
  }
  if (language === 'sh') {
    highlightStream(code, shellMode, shellTokens, highlighter, put, putBreak)
  } else {
    highlightCode(code, PARSERS[language].parse(code), highlighter, put, putBreak)
  }
  return out
}
