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
 * Run with `turbo run styles` (part of `build`).
 */
import { readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { template } from '@fusion.dev/scripts/literal'

/* `.examples` holds the sandbox's own files, `<slug>.html` and `<slug>.css`.
   They are a consumer's stylesheet rather than a component's, read at runtime by
   the catalog and shown in the editor, so compiling one into a `.css.ts` would
   put a generated module beside an example nobody imports. */
const IGNORED = new Set([
  '.examples',
  '.git',
  '.local',
  '.next',
  '.turbo',
  'dist',
  'node_modules',
  'target',
])

/** The styles package ships raw CSS to consumers; it has no components. */
const SKIP = /helix[/\\]styles[/\\]/

const walk = (dir, suffix) =>
  readdirSync(dir, { recursive: true })
    .filter(
      (entry) =>
        entry.endsWith(suffix) && !entry.split(sep).some((segment) => IGNORED.has(segment)),
    )
    .map((entry) => join(dir, entry))

/**
 * Removes comments and indentation from the CSS that ships. Nothing else.
 *
 * **The stylesheet is inside a template literal, which a JS minifier cannot
 * reach into.** `minify: true` in the bundler minifies the module around the
 * string and leaves the string itself byte for byte, so without this every
 * prose comment in every component stylesheet is served to every visitor.
 * Measured across the tier: 68 percent of the shipped CSS was commentary,
 * 206,486 brotli bytes of it, and a page with seven components carried 23,660
 * where 3,923 was the whole of the actual CSS.
 *
 * **Comments only.** A real minifier also rewrites values and selectors, and
 * bun's lowers `light-dark()` into malformed output on the 90 files here that
 * use it. Comments are 68 of the 72 strippable points, so the transformation
 * that cannot change a rule gets 98.8 percent of the saving.
 *
 * **The source keeps every word.** Only the generated `.css.ts` is stripped,
 * and that file is gitignored and regenerated, so the prose stays where it is
 * read and stops being shipped to people who cannot read it.
 */
const stripComments = (css) => {
  let out = ''
  let i = 0
  while (i < css.length) {
    const c = css[i]
    /* A string may contain anything, `/*` included, so it is copied verbatim. */
    if (c === '"' || c === "'") {
      const quote = c
      out += c
      i += 1
      while (i < css.length) {
        if (css[i] === '\\') {
          out += css.slice(i, i + 2)
          i += 2
          continue
        }
        out += css[i]
        i += 1
        if (css[i - 1] === quote) {
          break
        }
      }
      continue
    }
    if (c === '/' && css[i + 1] === '*') {
      /* `/*!` is the convention for a comment that survives minification. */
      const keep = css[i + 2] === '!'
      const end = css.indexOf('*/', i + 2)
      const stop = end === -1 ? css.length : end + 2
      if (keep) {
        out += css.slice(i, stop)
      }
      i = stop
      continue
    }
    out += c
    i += 1
  }
  /* Indentation and blank runs only. Whitespace inside a line is left alone,
     because that is where the descendant combinator lives. */
  return out
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line, n, all) => line.trim() !== '' || (n > 0 && all[n - 1].trim() !== ''))
    .map((line) => line.replace(/^\s+/, ''))
    .join('\n')
    .trim()
}

const root = process.argv[2] ?? process.cwd()
let written = 0

for (const file of walk(root, '.css')) {
  const rel = relative(root, file)
  if (SKIP.test(rel)) {
    continue
  }

  const css = readFileSync(file, 'utf8')
  const out = `${file}.ts`
  const source = `// Generated from ${rel} by \`turbo run styles\`. Do not edit.
import { createSheet } from '@fusion.dev/helix-core'

export const styles = createSheet(\`${template(stripComments(css))}\`)
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
