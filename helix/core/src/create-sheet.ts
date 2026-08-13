import { type CSSResult, unsafeCSS } from 'lit'

/**
 * Builds a stylesheet from CSS authored in a `.css` file.
 *
 * Component styles live in real `.css` files rather than `css` tagged
 * templates, so they get CSS tooling: syntax highlighting, formatters, the
 * token linter, and a diff that reads as CSS. `bun run styles` compiles each
 * one into a sibling `.css.ts` that calls this.
 *
 * The `unsafe` in `unsafeCSS` warns about interpolating untrusted input into a
 * stylesheet. That is not what happens here: the argument is a build-time
 * constant read from a file in this repo, never a runtime value. Wrapping it
 * keeps the warning where it belongs, on `unsafeCSS` itself, and gives one seam
 * to change if constructable stylesheets become the better primitive.
 */
export const createSheet = (cssText: string): CSSResult => unsafeCSS(cssText)
