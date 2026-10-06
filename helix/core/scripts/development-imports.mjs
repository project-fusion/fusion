/*
 * Points the compiled development-only imports at this package's own exports.
 *
 * Core reaches each development-only audit through a subpath of its own
 * `package.json` `imports`, `#audit-name` and the others, which resolves to the
 * audit under the `development` export condition and to a module that does
 * nothing otherwise. Those targets are the source files, which this
 * repository's specs, typecheck and source bundles read and the tarball does
 * not carry.
 *
 * **The published files import each audit by the package's own name.** A Vite
 * dev server bundles a dependency with esbuild before it serves it, and
 * resolves the dependency's bare imports itself, with its conditions, but
 * leaves a `#` import to esbuild, which resolves it with esbuild's own
 * conditions and no `development`. Measured on Vite 7.3.7: a package's `#x`
 * resolved to its `default` branch under `vite` dev, and the same condition
 * reached through a bare import of the package's own subpath resolved to
 * `development`. So every audit printed nothing on a Vite dev server, which is
 * where a page is written.
 *
 * So once `tsc` has written `dist`, each `#` specifier in a compiled module or
 * declaration becomes the subpath `exports` publishes for the same files:
 * `#audit-name` is `@fusion.dev/helix-core/audits/name`. A bundler resolves
 * that like any other import of the package, under its own conditions, and
 * TypeScript reads the declarations it names.
 *
 * Usage: `bun scripts/development-imports.mjs [dist directory]`.
 */
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const here = new URL('..', import.meta.url).pathname
const manifest = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8'))
const dist = process.argv[2] ?? join(here, 'dist')

/** Where `tsc` writes a source file. */
const compiled = (source) => source.replace(/^\.\/src\//, './dist/').replace(/\.ts$/, '.js')

/* Each `imports` key, paired with the `exports` subpath that publishes the same
   files under the same conditions. A key with none stops the build, since its
   import would otherwise ship pointing at source the tarball does not carry. */
const specifiers = new Map()
for (const [key, target] of Object.entries(manifest.imports ?? {})) {
  const subpath = Object.entries(manifest.exports).find(
    ([, exported]) =>
      typeof exported === 'object' &&
      Object.entries(target).every(
        ([condition, source]) => exported[condition] === compiled(source),
      ),
  )?.[0]
  if (subpath === undefined) {
    throw new Error(`${key} has no subpath in exports that publishes the same files`)
  }
  specifiers.set(key, `${manifest.name}${subpath.slice(1)}`)
}

const modules = (directory) =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name)
    if (statSync(path).isDirectory()) {
      return modules(path)
    }
    return path.endsWith('.js') || path.endsWith('.d.ts') ? [path] : []
  })

let changed = 0
for (const path of modules(dist)) {
  const code = readFileSync(path, 'utf8')
  const next = code.replace(/(["'])(#[\w-]+)\1/g, (whole, quote, key) =>
    specifiers.has(key) ? `${quote}${specifiers.get(key)}${quote}` : whole,
  )
  if (next !== code) {
    writeFileSync(path, next)
    changed += 1
  }
}
console.log(`development-imports: ${changed} files import ${[...specifiers.values()].join(', ')}`)
