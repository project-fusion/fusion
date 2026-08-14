#!/usr/bin/env node
/**
 * Compiles component `.css` files into sibling `.css.ts` modules.
 *
 * Component styles are authored as real CSS so they get CSS tooling: syntax
 * highlighting, the formatter, the token linter, and diffs that read as CSS
 * rather than as a string inside a template literal.
 *
 * Getting that CSS into a Lit component without a bundler is the problem this
 * solves. `import './x.css'` is not a thing tsc understands, `?inline` is a
 * bundler convention that would force every consumer onto the same bundler, and
 * import attributes (`with { type: 'css' }`) are not portable enough yet. A
 * generated `.css.ts` needs none of that: it is ordinary TypeScript, tsc emits
 * it, and it works in any consumer regardless of tooling.
 *
 * Output is gitignored and regenerated. Never edit a `.css.ts` by hand.
 *
 * Run with `bun run styles` (part of `build`).
 */
import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

const IGNORED = new Set(['.git', '.local', '.next', '.turbo', 'dist', 'node_modules', 'target'])

/** The styles package ships raw CSS to consumers; it has no components. */
const SKIP = /helix[/\\]styles[/\\]/

const walk = function* (dir, suffix) {
  for (const entry of readdirSync(dir)) {
    if (IGNORED.has(entry)) {
      continue
    }
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      yield* walk(full, suffix)
    } else if (entry.endsWith(suffix)) {
      yield full
    }
  }
}

/**
 * Escapes CSS for a template literal.
 *
 * Backticks and `${` would otherwise terminate the literal or start an
 * interpolation, turning a stylesheet into a syntax error or, worse, into an
 * expression that happens to parse.
 */
const escapeForTemplate = (css) =>
  css.replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$\{/g, '\\${')

const root = process.argv[2] ?? process.cwd()
let written = 0

for (const file of walk(root, '.css')) {
  const rel = relative(root, file)
  if (SKIP.test(rel)) {
    continue
  }

  const css = readFileSync(file, 'utf8')
  const out = `${file}.ts`
  const source = `// Generated from ${rel} by \`bun run styles\`. Do not edit.
import { createSheet } from '@helix-io/core'

export const styles = createSheet(\`${escapeForTemplate(css)}\`)
`

  // Only write on change, so an unchanged run does not invalidate the cache.
  let existing = ''
  try {
    existing = readFileSync(out, 'utf8')
  } catch {
    existing = ''
  }
  if (existing !== source) {
    writeFileSync(out, source)
    written += 1
  }
}

/**
 * Deletes generated modules whose stylesheet is gone.
 *
 * Output is a declared Turborepo output, so it is restored from cache on every
 * run. Deleting the `.css` alone therefore leaves the `.css.ts` behind and the
 * cache puts it back, which is how a component that no longer exists kept a
 * directory and a stylesheet in the tree.
 */
let pruned = 0
for (const file of walk(root, '.css.ts')) {
  if (SKIP.test(relative(root, file))) {
    continue
  }
  try {
    statSync(file.slice(0, -3))
  } catch {
    rmSync(file)
    pruned += 1
  }
}

const compiled =
  written === 0 ? 'styles: already current' : `styles: compiled ${written} stylesheet(s)`
console.log(pruned === 0 ? compiled : `${compiled}, pruned ${pruned} orphan(s)`)
