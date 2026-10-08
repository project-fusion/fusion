/*
 * Color for every Code Block: `@fusion.dev/helix-sandbox/code-block`.
 *
 * Code Block ships no grammar, so a page that shows plain code carries none.
 * Importing this gives every block of both tiers that sets no `highlight` of
 * its own the sandbox's Lezer grammars, read by its `language`, colored as the
 * sandbox's editor colors them, from the `--helix-color-syntax-*` tokens:
 *
 *   import '@fusion.dev/helix/code-block'
 *   import '@fusion.dev/helix-sandbox/code-block'
 *
 * A block in a language the grammars do not read is drawn plain.
 */
import { registerHighlighter } from '@fusion.dev/helix-headless/code-block'
import { codeBlockHighlighter, codeBlockSheet } from './code-block-highlight.js'

registerHighlighter(codeBlockHighlighter, codeBlockSheet)

export { codeBlockHighlighter, codeBlockSheet } from './code-block-highlight.js'
