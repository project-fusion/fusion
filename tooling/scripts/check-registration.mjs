#!/usr/bin/env node
/**
 * Holds element registration to the two places that defer it past hydration.
 *
 * **The site is a React tree and a custom element registers by being imported**,
 * which is a race rather than a preference. A definition that lands during the
 * client bundle's evaluation upgrades its elements before React hydrates, they
 * write their own bookkeeping onto themselves, and React then walks a DOM that
 * has gained attributes since the server wrote it. It reports a mismatch naming
 * an attribute no author typed, which is why nobody goes looking: the page
 * renders, the feature works, and the only sign is a console line.
 *
 * `helix-elements.tsx` and `use-sandbox-editor.ts` both ask with a dynamic
 * `import()` inside an effect, so the definitions arrive after the commit.
 * Neither needs an exception here: a dynamic import is not a static one, and
 * this only reads static specifiers.
 *
 * **The fault lives in a shape**, "any file importing a registering module at
 * module scope", and a shape is what a check enumerates and a hand-kept list
 * forgets. See (250).
 *
 * **What registers is read from the packages rather than listed here**, so a new
 * family or a new subpath is covered on the day it lands. A subpath registers
 * when its directory under `helix/<package>/src` contains a `@customElement`;
 * a bare barrel registers when the package has one anywhere, which is true of
 * the two tiers and false of `@fusion.dev/helix-sandbox`, whose index forwards the JSX
 * helpers alone.
 *
 * Run with `bun run check:api:registration` (also part of `bun run verify`).
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ROOT = join(import.meta.dirname, '../..')
const PACKAGES = {
  '@fusion.dev/helix': 'styled',
  '@fusion.dev/helix-core': 'core',
  '@fusion.dev/helix-headless': 'headless',
  '@fusion.dev/helix-sandbox': 'sandbox',
}

/* The frame is its own document, served at `/sandbox/frame.html`, with no React
   in it and nothing to hydrate. Registering at module scope is what its entry
   point is *for*, and the race this check exists to prevent cannot happen
   there. */
const EXEMPT = ['fusion/site/preview/']

const walk = (dir) => {
  const found = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.next')) {
      continue
    }
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) {
      found.push(...walk(path))
    } else if (/\.tsx?$/.test(entry) && !entry.endsWith('.d.ts')) {
      found.push(path)
    }
  }
  return found
}

/** Whether anything under this directory defines a custom element. */
const defines = (dir) => {
  if (!existsSync(dir)) {
    return false
  }
  return walk(dir).some((file) => readFileSync(file, 'utf8').includes('@customElement'))
}

/** Whether a specifier's module graph reaches a definition. */
const registers = (specifier) => {
  const [scope, name, ...rest] = specifier.split('/')
  const pkg = PACKAGES[`${scope}/${name}`]
  if (!pkg) {
    return false
  }
  const src = join(ROOT, 'helix', pkg, 'src')
  if (rest.length === 0) {
    /* The barrel. `core` defines the decorator itself and forwards no element,
       so a package having one file with the word in it is not the test: the
       test is whether the barrel's own directory tree carries elements, which
       for the two tiers is every family and for `core` is one utility. */
    return pkg === 'headless' || pkg === 'styled'
  }
  /* A subpath resolves to `dist/<name>/index.js`, so `src/<name>` is its
     source. Anything that is not a directory there is an asset or a type
     declaration: `elements.css`, `custom-elements.json`, `jsx`. */
  return defines(join(src, rest[0]))
}

const STATIC_IMPORT = /^import\s+(?!type\b)(?:[^'"]*?\sfrom\s+)?['"]([^'"]+)['"]/gm

const problems = []
let read = 0

for (const file of walk(join(ROOT, 'fusion/site'))) {
  const rel = relative(ROOT, file)
  if (EXEMPT.some((prefix) => rel.startsWith(prefix))) {
    continue
  }
  read += 1
  const source = readFileSync(file, 'utf8')
  for (const [, specifier] of source.matchAll(STATIC_IMPORT)) {
    if (!registers(specifier)) {
      continue
    }
    problems.push(
      `${rel}: imports \`${specifier}\` at module scope, which registers its elements during the ` +
        "client bundle's evaluation rather than after hydration. They upgrade before React commits, " +
        'write their own attributes onto themselves, and React reports a mismatch naming one nobody ' +
        'typed. Ask for it with a dynamic `import()` inside an effect, the way `HelixElements` and ' +
        '`useSandboxEditor` do, or take the type alone with `import type`.',
    )
  }
}

if (problems.length > 0) {
  console.error(
    `Elements registered before hydration (${problems.length}):\n\n  ${problems.join('\n\n  ')}\n`,
  )
  process.exit(1)
}

console.log(`registration: ${read} files, every registering import deferred past hydration`)
