import { type CSSResult, unsafeCSS } from 'lit'
import { highlightStyle } from '../editor/root/highlight.js'
import { type HighlightLanguage, highlight } from '../highlight/highlight.js'

/**
 * The grammar each `language` a block may name is read with: the names
 * `highlight` takes, and the ones a page writes for them.
 *
 * `jsx` is read as `tsx`, the dialect being a superset, as `highlight` says.
 */
const GRAMMARS: Record<string, HighlightLanguage> = {
  bash: 'sh',
  cjs: 'js',
  css: 'css',
  cts: 'ts',
  htm: 'html',
  html: 'html',
  javascript: 'js',
  js: 'js',
  jsx: 'tsx',
  mjs: 'js',
  mts: 'ts',
  sh: 'sh',
  shell: 'sh',
  ts: 'ts',
  tsx: 'tsx',
  typescript: 'ts',
  zsh: 'sh',
}

/**
 * Highlights a block's code by its `language`, in any case, or returns
 * `undefined` for a language no grammar here reads, which the block then
 * draws plain.
 *
 * **In the editor's own style**, so a snippet in a block and the same snippet
 * open in the sandbox are colored by one source: the classes are the ones the
 * editor's `HighlightStyle` gives each token, and `codeBlockSheet` holds the
 * rules it writes for them, in the `--helix-color-syntax-*` tokens.
 */
export const codeBlockHighlighter = (code: string, language: string): string | undefined => {
  const grammar = GRAMMARS[language.trim().toLowerCase()]
  return grammar ? highlight(code, grammar, highlightStyle) : undefined
}

/** The rules the editor's style writes for its classes, for a block to adopt. */
export const codeBlockSheet: CSSResult = unsafeCSS(highlightStyle.module?.getRules() ?? '')
