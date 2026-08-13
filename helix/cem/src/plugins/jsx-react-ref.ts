import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from '../types.js'

/** What the generator emits, framework-agnostically. */
const GENERATED_REF = /^(\s*)ref\?: T \| \(\(e: T\) => void\);$/m

export interface JsxReactRefOptions {
  /** File the JSX generator wrote, relative to the package root. */
  fileName?: string
}

/**
 * Rewrites the generated `ref` type to React's.
 *
 * `@wc-toolkit/jsx-types` supports several frameworks, so it emits
 * `ref?: T | ((e: T) => void)`, which is a fair generic shape and is not
 * React's. React's `ref` is `Ref<T>`, and the usual way to get one is
 * `useRef<T>(null)`, whose type is `RefObject<T | null>`. That is not
 * assignable to either half of the generated union, so **the single most
 * common way to hold a ref is a type error**, and the only workarounds are a
 * cast or a callback ref.
 *
 * Since these types exist for consumers writing JSX in React, they should
 * describe React. Written as an inline `import('react')` so the declaration
 * stays self-contained and needs no import line of its own.
 *
 * Runs after the generator, so list it after `jsxTypesPlugin`.
 */
export const jsxReactRef = ({ fileName = 'jsx.d.ts' }: JsxReactRefOptions = {}): Plugin => ({
  name: 'helix-jsx-react-ref',
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

    if (!GENERATED_REF.test(source)) {
      return
    }

    writeFileSync(
      path,
      source.replace(
        GENERATED_REF,
        "$1/** Use the ref attribute with a variable to assign a DOM element to the variable once the element is rendered. */\n$1ref?: import('react').Ref<T>;",
      ),
    )
  },
})
