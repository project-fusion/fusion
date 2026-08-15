#!/usr/bin/env node
/**
 * Checks every example against the manifest it documents.
 *
 * Examples are HTML, so nothing typechecks them. An attribute renamed on a
 * component leaves its examples rendering an element that silently ignores
 * them, and the sandbox shows a component that does not do what it says.
 *
 * Run with `bun run check:examples` (also part of `bun run verify`).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const MANIFEST = 'helix/web/custom-elements.json'
const ROOT = 'helix/web/src'

/** Attributes any element may carry, so no component declares them. */
const GLOBAL = new Set([
  'class',
  'dir',
  'exportparts',
  'hidden',
  'id',
  'lang',
  'part',
  'role',
  'slot',
  'style',
  'tabindex',
  'title',
])

const tags = new Map()
for (const module of JSON.parse(readFileSync(MANIFEST, 'utf8')).modules ?? []) {
  for (const declaration of module.declarations ?? []) {
    if (!declaration.tagName) {
      continue
    }
    tags.set(declaration.tagName, {
      attributes: new Set((declaration.attributes ?? []).map((a) => a.name)),
      slots: new Set((declaration.slots ?? []).map((s) => s.name).filter(Boolean)),
    })
  }
}

const problems = []
/* Family directories. `src` also holds `index.ts`, which is not one, and
   directories that are not families either.

   A family is a directory with an `index.ts`, because that is what the barrel
   exports and what a consumer imports as a subpath. `field/` holds the shared
   stylesheets the field controls compose and exports nothing, so it is not a
   family, has no element and no example to show. Naming it here instead would
   be a list to keep; asking for the file that makes a directory a family is
   the same question the package's `exports` map asks. */
const all = readdirSync(ROOT).filter(
  (entry) => statSync(join(ROOT, entry)).isDirectory() && existsSync(join(ROOT, entry, 'index.ts')),
)
const families = all.filter((family) => existsSync(join(ROOT, family, '.examples')))

for (const family of all) {
  if (!existsSync(join(ROOT, family, '.examples'))) {
    problems.push(`${family}: no .examples directory`)
  }
}

for (const family of families) {
  const dir = join(ROOT, family, '.examples')
  const files = readdirSync(dir).filter((f) => f.endsWith('.html'))
  if (files.length === 0) {
    problems.push(`${family}: .examples holds no example`)
  }

  for (const file of files) {
    const html = readFileSync(join(dir, file), 'utf8')
    const where = `${family}/${file}`

    for (const [, tag, rest] of html.matchAll(/<(helix-[a-z0-9-]+)([^>]*)>/g)) {
      const known = tags.get(tag)
      if (!known) {
        problems.push(`${where}: <${tag}> is not a registered element`)
        continue
      }
      // Values are stripped first: a word inside one is not an attribute.
      const bare = rest.replace(/=\s*"[^"]*"/g, '=').replace(/=\s*'[^']*'/g, '=')
      for (const [, name] of bare.matchAll(/(?:^|\s)([a-z][a-z0-9-]*)/g)) {
        if (GLOBAL.has(name) || name.startsWith('aria-') || name.startsWith('data-')) {
          continue
        }
        if (!known.attributes.has(name)) {
          problems.push(`${where}: <${tag}> has no attribute "${name}"`)
        }
      }
    }

    for (const [, name] of html.matchAll(/slot="([a-z-]+)"/g)) {
      const declared = [...html.matchAll(/<(helix-[a-z0-9-]+)/g)].some(([, tag]) =>
        tags.get(tag)?.slots.has(name),
      )
      if (!declared) {
        problems.push(`${where}: no element here declares a "${name}" slot`)
      }
    }
  }
}

if (problems.length > 0) {
  console.error(`Example violations (${problems.length}):\n`)
  for (const problem of problems) {
    console.error(`  ${problem}`)
  }
  process.exit(1)
}
console.log(`examples: ${families.length} families, all valid`)
