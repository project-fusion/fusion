import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from '../types.js'

/** The generator's `popovertarget`, typed as a placement. */
const POPOVER_TARGET = /^(\s*)popovertarget\?: "top" \| "bottom" \| "left" \| "right" \| "auto";$/m

/** A handler for `keypressed`, which is no event, and the comment above it. */
const KEY_PRESSED =
  /^[ \t]*\/\*\* Fired when a key is pressed down\. \*\/\n[ \t]*onKeyPressed\?:[^\n]*\n/m

/** The generator's inline style, which accepts any key. */
const STYLE = /^(\s*)style\?: Record<string, string \| number>;$/m

/** The default the generator prints for a custom property that has none recorded. */
const NO_DEFAULT = / \(default: `undefined`\)/g

export interface JsxBasePropsOptions {
  /** File the JSX generator wrote, relative to the package root. */
  fileName?: string
}

/**
 * Corrects what the generator writes on every tag.
 *
 * `@wc-toolkit/jsx-types` emits one `BaseProps` and one `BaseEvents` for every
 * element, and four of its lines are wrong for every one of them:
 *
 * - `popovertarget` is typed as the placements, so the id it takes fails to
 *   compile. It takes a string.
 * - `onKeyPressed` names no event. `keypress` is deprecated and was never
 *   spelled that way.
 * - `style` accepts any key, so `style={{ colr: 'red' }}` compiled, and the
 *   `CustomCssProperties` this file adds to React's `CSSProperties` never
 *   reached a Helix tag. It is React's type, written as an inline
 *   `import('react')` for the reason `jsxReactRef` gives.
 * - A custom property with no default recorded printed "(default:
 *   `undefined`)" in every hover. Each one falls back to a token in the CSS,
 *   and the hover now says nothing it cannot.
 *
 * Runs after the generator and before `jsxNativeEvents`, which rewrites the
 * handler lines this reads.
 */
export const jsxBaseProps = ({ fileName = 'jsx.d.ts' }: JsxBasePropsOptions = {}): Plugin => ({
  name: 'helix-jsx-base-props',
  packageLinkPhase() {
    const path = join(process.cwd(), fileName)

    let source: string
    try {
      source = readFileSync(path, 'utf8')
    } catch {
      // No JSX types for this package, which is the normal case for one that
      // ships no elements.
      return
    }

    const next = source
      .replace(POPOVER_TARGET, '$1popovertarget?: string;')
      .replace(KEY_PRESSED, '')
      .replace(STYLE, "$1style?: import('react').CSSProperties;")
      .replace(NO_DEFAULT, '')

    if (next !== source) {
      writeFileSync(path, next)
    }
  },
})
