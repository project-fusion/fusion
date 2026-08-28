#!/usr/bin/env node
/**
 * Checks every example against the manifest it documents.
 *
 * Examples are HTML, so nothing typechecks them. An attribute renamed on a
 * component leaves its examples rendering an element that silently ignores
 * them, and the sandbox shows a component that does not do what it says.
 *
 * **It held a rule about declared state until 26 Aug 2026, and that rule is
 * gone with the model it enforced.** It read `@controlled` out of the manifest
 * and failed an example that declared a controlled attribute without a listener
 * for the event that settled it, because `value="Ada"` was a claim of ownership
 * and a calendar written that way had arrows that did nothing. A declared
 * property is a seed now, so an example may write one and the control still
 * works when a reader copies it. Removed rather than left inert: the tag is
 * gone from the manifest, so the rule would have read an empty set, passed
 * everything, and gone on looking thorough. See 294.
 *
 * Run with `bun run check:prose:examples` (also part of `bun run verify`).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

/* The frame's layout modes, from `preview-frame.css`. Named here because an
   example may ask for one by name and a name that matches no rule is silent. */
const LAYOUTS = ['centered', 'fullscreen', 'hug', 'padded']

/* Both tiers, because an example may show either.
 *
 * The examples live beside the styled components and most of them use styled
 * tags, so this read the styled manifest alone and would have reported
 * `<helix-headless-checkbox>` as an element that does not exist. It does exist: it
 * is registered by `helix/headless`, which is the tier the headless examples are
 * there to show is real and consumable. Reading one manifest meant a base
 * example could not be validated at all, so a typo in one would have rendered
 * an inert unknown element and passed. */
const MANIFESTS = ['helix/styled/custom-elements.json', 'helix/headless/custom-elements.json']
const ROOT = 'helix/styled/src'

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
for (const module of MANIFESTS.flatMap(
  (path) => JSON.parse(readFileSync(path, 'utf8')).modules ?? [],
)) {
  for (const declaration of module.declarations ?? []) {
    if (!declaration.tagName) {
      continue
    }
    const attributes = new Set((declaration.attributes ?? []).map((a) => a.name))
    tags.set(declaration.tagName, {
      attributes,
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

  /* And the two have to agree about each other. The markup declares its
     stylesheet the way a consumer would, `<link rel="stylesheet">` in HTML and
     an `import` in the TSX the sandbox converts it to, because an example whose
     CSS arrives invisibly is an example that does not work when it is copied.

     Both directions, because both are silent. A stylesheet with no link is
     applied in the preview and missing from the file a reader takes away; a
     link with no stylesheet is a promise to a file that is not there. */
  for (const file of files) {
    const markup = readFileSync(join(dir, file), 'utf8')
    /* Every example describes itself in one line.
     *
     * `helix-examples` reads `@summary` into the manifest and the reference
     * page prints it in the Examples table, so an example without one is a row
     * with a slug and a blank. **279 of 344 were blank**, which is four fifths
     * of the library documented by a plugin that was built, documented, and
     * used by sixty-five files. Nothing said so, because a missing description
     * renders as an empty cell and an empty cell looks like a layout. */
    if (!/<!--\s*@summary\s+\S/.test(markup)) {
      problems.push(
        `${family}/${file}: has no \`<!-- @summary … -->\`. The Examples table will print its ` +
          'slug against a blank.',
      )
    }
    /* `@layout`, where an example asks for one.
     *
     * The value reaches the frame through the manifest and is applied as an
     * attribute, so a typo does not throw: it sets `data-layout="centred"`, no  (dialect:quoted)
     * rule matches, the example renders unstyled by any mode and looks merely
     * wrong. Three modes exist and they are named here so the misspelling fails
     * at the check rather than in a picture somebody has to notice.
     *
     * Only the shape is checked, not whether the annotation is present: absent
     * is the ordinary case and means the default. */
    const layout = /<!--\s*@layout\s+([^\s>-]+)\s*-->/.exec(markup)
    if (layout && !LAYOUTS.includes(layout[1])) {
      problems.push(
        `${family}/${file}: \`@layout ${layout[1]}\` is not a frame layout. ` +
          `Use one of ${LAYOUTS.join(', ')}.`,
      )
    }
    const link = /<link\b[^>]*\brel=(["'])stylesheet\1[^>]*>/is.exec(markup)
    const sheet = entries.includes(file.replace(/\.html$/, '.css'))
    if (sheet && !link) {
      problems.push(
        `${family}/${file}: ships ${file.replace(/\.html$/, '.css')} without linking it`,
      )
    }
    if (link && !sheet) {
      problems.push(`${family}/${file}: links a stylesheet that is not beside it`)
    }
    /* And it links `styles.css`, whatever the file beside it is called.
       The pair on disk is keyed by slug, `nested.html` and `nested.css`, and the
       sandbox shows them as `index.html` and `styles.css`. Twenty three examples
       linked the slug and seven linked `styles.css`, so the link a reader could
       see named a file they could not: it looked like the stylesheet in the tab
       beside it was not the one being applied. The name a reader is shown is the
       name the markup should say. */
    const href = link ? /\bhref=(["'])([^"']+)\1/i.exec(link[0])?.[2] : undefined
    if (href && href !== 'styles.css') {
      problems.push(
        `${family}/${file}: links \`${href}\`, which is not the \`styles.css\` a reader sees`,
      )
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

/* The documentation's HTML samples, held to the same rule.
 *
 * A reader copies what is in front of them, and a `style` attribute in a code
 * fence teaches the habit exactly as well as one in an example does. This check
 * walked `.examples` only, so the prose was the one place a `style` could
 * survive the sweep, and one did: the composition page's own argument is that
 * width belongs to the layout, illustrated with an inline style.
 *
 * Fenced HTML only. Prose may name the attribute, and a CSS fence may set
 * properties without any of this applying to it. */
const DOCS = ['helix/docs/content', 'cortex/docs/content']

for (const dir of DOCS) {
  if (!existsSync(dir)) {
    continue
  }
  for (const file of readdirSync(dir).filter((entry) => entry.endsWith('.mdx'))) {
    const text = readFileSync(join(dir, file), 'utf8')
    for (const [, fence] of text.matchAll(/```html\n([\s\S]*?)```/g)) {
      for (const [, tag] of fence.matchAll(/<([a-z][a-z0-9-]*)[^>]*\sstyle=/g)) {
        problems.push(`${dir}/${file}: <${tag}> carries a style attribute in an HTML sample`)
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
