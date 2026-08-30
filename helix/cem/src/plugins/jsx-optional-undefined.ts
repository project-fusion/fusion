import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from '../types.js'

/**
 * Where a property's type starts: an indented name, quoted or bare, then `?:`.
 *
 * Quoted because the generator emits `"prop:label"` and `"onhelix-open"`
 * alongside the bare spellings, and those are the majority of the file.
 */
const OPTIONAL = /^([ \t]*)(?:"[^"]*"|[A-Za-z_$][\w$]*)\?: /gm

/** Brackets that can hold a `;` that is not the end of the property. */
const OPENS: Record<string, string> = { '(': ')', '[': ']', '{': '}' }

export interface JsxOptionalUndefinedOptions {
  /** Files the generators wrote, relative to the package root. */
  fileNames?: string[]
}

/**
 * Widens every optional prop from `?: T` to `?: (T) | undefined`.
 *
 * **Under `exactOptionalPropertyTypes` those are two different types**, and the
 * generator emits the one a consumer cannot use. `?: T` means the key may be
 * absent and may not be present holding `undefined`, so a component that takes
 * an optional prop and forwards it cannot forward the case where it did not
 * receive one: `align={column.align}` is an error whenever `align` is itself
 * optional, and the way out is either a cast or a helper that strips undefined
 * keys before spreading. React's own types are written `className?: string |
 * undefined` for exactly this reason, so the props this library adds behave
 * differently from the props beside them on the same element.
 *
 * The generator has no option for it, and `allowUnknownProps` would widen every
 * typo alongside it, which is the thing these types exist to catch. So this
 * rewrites what it wrote, the same way `jsxReactRef` rewrites the `ref` type
 * that rejects `useRef`.
 *
 * **Parenthesized rather than appended**, because `| undefined` binds looser
 * than a function type: `onClick?: (e: Event) => void | undefined` is a handler
 * returning `void | undefined`, which is not the change intended and is not an
 * error anywhere, so it would have silently done nothing for the 137 handler
 * props in the file. `(T) | undefined` is right for every shape.
 *
 * Runs after the generators, so list it after `jsxTypesPlugin` and
 * `vuejsTypesPlugin`. `svelte.d.ts` is not in the list: it declares no optional
 * props of its own, its attributes being the JSX ones it reuses.
 */
export const jsxOptionalUndefined = ({
  fileNames = ['jsx.d.ts', 'vue.d.ts'],
}: JsxOptionalUndefinedOptions = {}): Plugin => ({
  name: 'helix-jsx-optional-undefined',
  packageLinkPhase() {
    for (const fileName of fileNames) {
      const path = join(process.cwd(), fileName)
      let source: string
      try {
        source = readFileSync(path, 'utf8')
      } catch {
        // No types for this package, which is the normal case for one that
        // ships no elements.
        continue
      }
      const next = widen(source)
      if (next !== source) {
        writeFileSync(path, next)
      }
    }
  },
})

/**
 * Rewrites every optional property in a declaration file.
 *
 * Built forwards into a list of pieces rather than by replacing in place, so
 * every index is read from the original string and none of them move.
 */
const widen = (source: string): string => {
  const pieces: string[] = []
  let taken = 0
  OPTIONAL.lastIndex = 0
  let match = OPTIONAL.exec(source)
  while (match !== null) {
    const from = match.index + match[0].length
    const to = endOfType(source, from)
    if (to !== -1) {
      const type = source.slice(from, to).trim()
      if (!optional_(type)) {
        pieces.push(source.slice(taken, from), `(${type}) | undefined`)
        taken = to
      }
      // Past this property either way, so a `;` inside it is never read as the
      // start of the next one.
      OPTIONAL.lastIndex = to
    }
    match = OPTIONAL.exec(source)
  }
  pieces.push(source.slice(taken))
  return pieces.join('')
}

/**
 * The index of the `;` that ends a property's type.
 *
 * Depth is counted on `()`, `[]` and `{}` and never on `<>`, which is not a
 * bracket a scanner can pair: `=>` would close every generic it walked past, and
 * a `;` cannot appear inside a type argument list anyway. An object type can
 * hold one, and its braces are counted.
 */
const endOfType = (source: string, from: number): number => {
  const stack: string[] = []
  let quote = ''
  for (let at = from; at < source.length; at += 1) {
    const char = source[at] ?? ''
    if (quote !== '') {
      if (char === '\\') {
        at += 1
      } else if (char === quote) {
        quote = ''
      }
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
    } else if (OPENS[char]) {
      stack.push(OPENS[char] ?? '')
    } else if (char === stack[stack.length - 1]) {
      stack.pop()
    } else if (char === ';' && stack.length === 0) {
      return at
    }
  }
  return -1
}

/** Whether a type already admits `undefined`, so widening it would only add noise. */
const optional_ = (type: string): boolean =>
  type === 'any' || type === 'unknown' || /(?:^|\|)\s*undefined\s*$/.test(type)
