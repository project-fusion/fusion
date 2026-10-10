import { type CSSResult, unsafeCSS } from 'lit'
import { highlight } from '../highlight/highlight.js'
import { languageOf } from '../highlight/language.js'
import { syntaxHighlighter, syntaxRules } from '../highlight/syntax.js'

/**
 * Highlights a block's code by its `language`, in any case and by any name
 * `languageOf` reads, such as `ts`, `TypeScript` or `bash`, or returns
 * `undefined` for a language no grammar here reads, which the block then
 * draws plain.
 *
 * **In the editor's own style**, so a snippet in a block and the same snippet
 * open in the sandbox are colored by one source: the classes are the ones
 * `syntaxHighlighter` gives each token, and `codeBlockSheet` holds the rules
 * for them, in the `--helix-color-syntax-*` tokens.
 */
export const codeBlockHighlighter = (code: string, language: string): string | undefined => {
  const grammar = languageOf(language)
  return grammar ? highlight(code, grammar, syntaxHighlighter) : undefined
}

/** The rules that color `codeBlockHighlighter`'s classes, for a block to adopt. */
export const codeBlockSheet: CSSResult = unsafeCSS(syntaxRules)
