import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Plugin } from '../types.js'

/** Type names the generator emits: `HelixOpenChangeEvent`, and friends. */
const HELIX_TYPE = /\bHelix[A-Za-z0-9]*\b/g

/** Comments, which name types in prose and import nothing. */
const COMMENTS = /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g

/** Every identifier written outside a comment. */
const IDENTIFIER = /\b[A-Za-z_$][\w$]*\b/g

export interface JsxImportsOptions {
  /** File the JSX generator wrote, relative to the package root. */
  fileName?: string
  /** Package every Helix type is exported from. */
  packageName: string
}

/**
 * Adds imports the JSX types generator references but does not emit.
 *
 * `@wc-toolkit/jsx-types` imports the component classes, because it is told
 * where they live, but an event's type comes from `@event {HelixOpenChangeEvent}`
 * in the manifest and the generator has no idea what package that name is from.
 * It emits the reference anyway.
 *
 * The result type-checks for consumers regardless, because `skipLibCheck` is on
 * in almost every app, and an unresolved name degrades to `any`. So the event is
 * typed in the declaration and unchecked in practice: `event.detail.expanded`
 * passes against a detail that has no such field. A type that silently promises
 * more than it delivers is worse than no type.
 *
 * Runs after the generator, so list it after `jsxTypesPlugin`.
 */
export const jsxImports = ({ fileName = 'jsx.d.ts', packageName }: JsxImportsOptions): Plugin => ({
  name: 'helix-jsx-imports',
  packageLinkPhase() {
    const path = join(process.cwd(), fileName)

    let source: string
    try {
      source = readFileSync(path, 'utf8')
    } catch {
      // No JSX types for this package, which is the normal case for a package
      // that ships no elements.
      return
    }

    // Quote style is the generator's choice, so match either.
    const importMatch = /^import type \{([^}]*)\} from ['"][^'"]*['"]/m.exec(source)
    if (!importMatch?.[1]) {
      return
    }

    const imported = new Set(
      importMatch[1]
        .split(',')
        .map((name) => name.trim())
        .filter(Boolean),
    )

    // Names the file declares itself are not imports.
    const declared = new Set(
      [...source.matchAll(/^(?:export )?type (\w+)/gm)].map((match) => match[1] as string),
    )

    /* **Read with the comments taken out, and the import itself.** A
       description saying "other Helix components" imported `Helix`, and a
       method signature quoted in one imported `HelixHeadlessSplitter`, neither
       of which the package exports: 159 errors for a consumer without
       `skipLibCheck`. The generator also imports every export of a module the
       file names, `FAILED_LABEL` and `pointsOf` among them, whether the file
       uses it or not, so an import is kept only where the body uses it. */
    const body = source.replace(importMatch[0], '').replace(COMMENTS, '')
    const used = new Set(body.match(IDENTIFIER) ?? [])

    const missing = [...new Set(body.match(HELIX_TYPE) ?? [])]
      .filter((name) => !imported.has(name) && !declared.has(name))
      .sort()
    const kept = [...imported].filter((name) => used.has(name))

    if (missing.length === 0 && kept.length === imported.size) {
      return
    }

    const merged = [...kept, ...missing].sort()
    const names = merged.length === 0 ? '' : `\n  ${merged.join(',\n  ')},\n`
    writeFileSync(
      path,
      source.replace(importMatch[0], `import type {${names}} from '${packageName}'`),
    )
  },
})
