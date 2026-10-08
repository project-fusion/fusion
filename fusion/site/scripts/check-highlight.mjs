#!/usr/bin/env bun
/**
 * Fails the site build when code samples would render with no colors.
 *
 * Lezer matches a style to a token by the identity of the `Tag` object. With
 * two copies of `@lezer/highlight` installed, the parsers tag tokens with one
 * copy while `classHighlighter` and the sandbox editor's style read the other,
 * so no rule matches and nothing throws. Every code block then renders as plain
 * text. Production shipped that on October 6, 2026, and again on October 8 with
 * a correct lockfile, because the deploy restored a `node_modules` that still
 * held the old nested copies.
 *
 * Two checks, both read from the installed tree that `next build` bundles:
 *
 * - every `node_modules` under the root and the workspace packages holds one
 *   `@lezer/highlight` in total
 * - `highlight` from `@fusion.dev/helix-sandbox/highlight` emits `tok-` spans
 *   in each language it accepts
 *
 * `build` runs this after `next build`, so the build fails and Vercel deploys
 * nothing. It writes nothing, and `fusion x workspace`'s `prerequisites` rule
 * reads every step ahead of the compiler as something `typecheck` has to
 * build too.
 */
import { existsSync, lstatSync, readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { highlight } from '@fusion.dev/helix-sandbox/highlight'

const ROOT = join(import.meta.dirname, '..', '..', '..')

/** One snippet per language `highlight` accepts, each with a token it classifies. */
const SAMPLES = {
  css: 'a { color: red; }',
  html: '<p class="lede">Hi</p>',
  js: 'const greeting = "hi"',
  sh: 'bun add "@fusion.dev/helix"',
  ts: 'const greeting: string = "hi"',
  tsx: 'const view = <helix-button variant="primary">Save</helix-button>',
}

/** The folder of every installed `@lezer/highlight` below `dir`. */
const installed = (dir) => {
  const modules = join(dir, 'node_modules')
  if (!existsSync(modules)) {
    return []
  }
  const found = []
  for (const entry of readdirSync(modules)) {
    const names = entry.startsWith('@')
      ? readdirSync(join(modules, entry)).map((name) => `${entry}/${name}`)
      : [entry]
    for (const name of names) {
      const path = join(modules, name)
      /* A workspace package is linked into `node_modules`. It is walked from
         its own folder below, and following the link would walk it twice. */
      if (lstatSync(path).isSymbolicLink()) {
        continue
      }
      if (name === '@lezer/highlight') {
        found.push(path)
      }
      found.push(...installed(path))
    }
  }
  return found
}

const { workspaces } = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'))
const packages = workspaces.flatMap((pattern) =>
  [...new Bun.Glob(`${pattern}/package.json`).scanSync({ cwd: ROOT })].map((file) =>
    join(ROOT, file, '..'),
  ),
)
const copies = [ROOT, ...packages].flatMap(installed).map((path) => relative(ROOT, path))

const uncolored = Object.entries(SAMPLES)
  .filter(([language, code]) => !highlight(code, language).includes('class="tok-'))
  .map(([language]) => language)

const failures = []
if (copies.length !== 1) {
  failures.push(
    `check-highlight: ${copies.length} copies of @lezer/highlight are installed, and code samples need exactly 1:\n${copies.map((path) => `  ${path}`).join('\n')}`,
  )
}
if (uncolored.length > 0) {
  failures.push(`check-highlight: highlight emitted no tok- spans for ${uncolored.join(', ')}.`)
}
if (failures.length > 0) {
  console.error(failures.join('\n'))
  console.error(
    'check-highlight: remove every node_modules folder and run bun install. On Vercel, fusion/site/scripts/vercel-install.sh does that before it installs.',
  )
  process.exit(1)
}

console.log(
  `check-highlight: 1 copy of @lezer/highlight, and ${Object.keys(SAMPLES).length} languages emit tok- spans`,
)
