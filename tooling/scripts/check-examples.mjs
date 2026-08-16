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

/**
 * Attributes any element may carry, so no component declares them.
 *
 * `style` stays here so the attribute check passes over it quietly and the
 * dedicated rule below is the one that speaks. Reported from here it would read
 * "has no attribute style", which is both wrong and unhelpful: every element
 * has one, and the objection is not that it does not exist.
 */
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
  const entries = readdirSync(dir)
  const files = entries.filter((f) => f.endsWith('.html'))
  if (files.length === 0) {
    problems.push(`${family}: .examples holds no example`)
  }

  /* An example is `<slug>.html` and, where it needs one, `<slug>.css` beside
     it. The markup is what makes it an example, so a stylesheet without one is
     a file nothing will ever load: the catalog reads it only when asked for the
     example of that name, and there is no example of that name. */
  for (const sheet of entries.filter((f) => f.endsWith('.css'))) {
    if (!files.includes(sheet.replace(/\.css$/, '.html'))) {
      problems.push(`${family}/${sheet}: no ${sheet.replace(/\.css$/, '.html')} to style`)
    }
  }

  for (const file of files) {
    const html = readFileSync(join(dir, file), 'utf8')
    const where = `${family}/${file}`

    /* Every element, not only the Helix ones: a `style` on the `<div>` wrapping
       them teaches the same habit as one on a component. The stylesheet beside
       the example is where this goes, which the sandbox already shows as
       `styles.css` next to `index.html`.

       An inline style cannot express a hover, a media query, a pseudo-element
       or a custom property block, and it outranks every rule a reader then
       writes against it, so the first thing they learn from copying one is that
       their own stylesheet does not work. */
    for (const [, tag] of html.matchAll(/<([a-z][a-z0-9-]*)[^>]*\sstyle=/g)) {
      problems.push(
        `${where}: <${tag}> carries a style attribute. Use ${file.replace(/\.html$/, '.css')}`,
      )
    }

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
