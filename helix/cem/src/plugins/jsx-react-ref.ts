import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from '../types.js'

/** What the generator emits, framework-agnostically. */
const GENERATED_REF = /^(\s*)ref\?: T \| \(\(e: T\) => void\);$/m

/** The first prop of `BaseProps`, which is where React's own are inserted. */
const BASE_PROPS_HEAD =
  /^(\s*)\/\*\* Content added between the opening and closing tags of the element \*\/$/m

export interface JsxReactRefOptions {
  /** File the JSX generator wrote, relative to the package root. */
  fileName?: string
}

/**
 * Rewrites the generated `ref` type to React's, and adds the React props the
 * generator has no way to know about.
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
 * `suppressHydrationWarning` is the other one, and it is not a nicety. A custom
 * element writes its own state attributes the moment it upgrades: a listbox
 * marks its current option with `data-active`, and registration can beat React
 * to the subtree, so hydration finds an attribute in the DOM that its own
 * render never produced and logs a mismatch it cannot patch up. React's answer
 * is this prop, and without it in `BaseProps` the only ways to reach it are a
 * cast or a spread, on an element the library itself ships.
 *
 * `allowUnknownProps` on the generator would also silence it, and would silence
 * every typo alongside it. These types exist so `appearance="wrong"` fails, so
 * the missing props are named one at a time instead.
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

    let next = source.replace(
      GENERATED_REF,
      "$1/** Use the ref attribute with a variable to assign a DOM element to the variable once the element is rendered. */\n$1ref?: import('react').Ref<T>;",
    )

    if (!next.includes('suppressHydrationWarning')) {
      next = next.replace(
        BASE_PROPS_HEAD,
        '$1/** Skips the hydration check for an element whose DOM is written by something other than React, which a custom element writing its own state attributes is. */\n$1suppressHydrationWarning?: boolean;\n$1/** Content added between the opening and closing tags of the element */',
      )
    }

    writeFileSync(path, next)
  },
})
